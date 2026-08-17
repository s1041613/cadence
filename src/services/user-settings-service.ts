import { requireSupabase } from '@/lib/supabase'

// Pure I/O layer, matching notes-service and title-dismissals-service: no store
// access, callers pass the owner explicitly, and any optimistic update or
// rollback lives in the store.
//
// user_settings holds one row per user (user_id is the PK), so unlike the
// collection services here there is no id to mint and no ordering to preserve —
// every write is an upsert of the same row.

const REQUEST_TIMEOUT_MS = 10_000

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS)
}

/** Public bucket holding user-uploaded v2 backgrounds, keyed '<uid>/<uuid>.<ext>'. */
export const BACKGROUND_BUCKET = 'v2-backgrounds'

/** The row shape as written and read. */
interface UserSettingsRow {
  user_id: string
  background_path: string | null
  scrim_opacity: number
  shown_tab_keys: string[] | null
}

/** Client-side shape. `null` on a field means "no preference" and the caller
 *  falls back to its own default — see the migration for why that is kept
 *  distinct from the row being absent entirely. */
export interface UserSettings {
  backgroundPath: string | null
  scrimOpacity: number
  shownTabKeys: string[] | null
}

/**
 * Returns the user's settings, or null when they have no row yet — which is the
 * normal state for anyone who has never opened Customization, not an error.
 */
export async function fetchUserSettings(ownerId: string): Promise<UserSettings | null> {
  const { data, error } = await requireSupabase()
    .from('user_settings')
    .select('background_path, scrim_opacity, shown_tab_keys')
    .eq('user_id', ownerId)
    .abortSignal(timeoutSignal())
    // maybeSingle, not single: zero rows is the expected first-run state, and
    // single would turn it into an error.
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const row = data as Omit<UserSettingsRow, 'user_id'>
  return {
    backgroundPath: row.background_path,
    scrimOpacity: row.scrim_opacity,
    shownTabKeys: row.shown_tab_keys
  }
}

/**
 * Writes the whole preference set.
 *
 * Always all three columns, never a partial row. The slider's debounced write,
 * a photo upload and a tab-bar save all target this one row, so a partial
 * upsert would let whichever landed last clobber the others' columns with a
 * stale value. The store holds the current value of all three, so sending them
 * together is both correct and cheap.
 */
export async function saveUserSettings(settings: UserSettings, ownerId: string): Promise<void> {
  const row: UserSettingsRow = {
    user_id: ownerId,
    background_path: settings.backgroundPath,
    scrim_opacity: settings.scrimOpacity,
    shown_tab_keys: settings.shownTabKeys
  }

  // No ignoreDuplicates here, unlike notes-service: this table has a real UPDATE
  // policy precisely so the ON CONFLICT DO UPDATE path works, because every save
  // after the first is an update of the same row.
  const { error } = await requireSupabase()
    .from('user_settings')
    .upsert(row, { onConflict: 'user_id' })
    .abortSignal(timeoutSignal())
  if (error) throw error
}

/**
 * Extension matching the bytes being stored.
 *
 * Not cosmetic: downscaleImage falls back to the original file when the canvas
 * path fails, so a PNG or WebP can reach the upload unconverted. Hardcoding .jpg
 * would leave the key disagreeing with the object's own contentType.
 */
function extensionFor(contentType: string): string {
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/webp') return 'webp'
  return 'jpg'
}

/**
 * Uploads a background and returns its storage path.
 *
 * The path — not a URL — is what goes in the database: a URL embeds the project
 * ref, so it would have to be rewritten everywhere if the project ever moved.
 *
 * The '<uid>/' prefix is load-bearing: storage RLS authorizes on the first path
 * segment, so an object written anywhere else is rejected. The UUID filename
 * makes the key unguessable, which is what makes a public bucket acceptable
 * here (see the migration's bucket comment).
 *
 * Storage calls take no .abortSignal() — the storage client does not expose one,
 * so unlike the PostgREST calls above these have no client-side timeout.
 */
export async function uploadBackground(file: Blob, ownerId: string): Promise<string> {
  const contentType = file.type || 'image/jpeg'
  const path = `${ownerId}/${crypto.randomUUID()}.${extensionFor(contentType)}`

  const { error } = await requireSupabase()
    .storage.from(BACKGROUND_BUCKET)
    .upload(path, file, {
      contentType,
      // The name is a fresh UUID, so a collision would mean something is badly
      // wrong rather than being a legitimate overwrite.
      upsert: false
    })
  if (error) throw error

  return path
}

/**
 * Best-effort cleanup of a replaced or reset background. Returns whether the
 * object actually went away.
 *
 * The one intentional deviation from this layer's "throw on error" rule, and the
 * reason is the call site: cleanup only ever runs *after* the new state is
 * already saved, so a failure here leaves an orphaned object nobody can see,
 * while throwing would fail an operation that genuinely succeeded.
 *
 * It reports the outcome rather than returning void because Storage's remove()
 * resolves with `{ error }` instead of rejecting — a bare try/catch would not
 * even observe the common failure, let alone let a caller act on it.
 */
export async function deleteBackground(path: string): Promise<boolean> {
  try {
    const { error } = await requireSupabase().storage.from(BACKGROUND_BUCKET).remove([path])
    return !error
  } catch {
    // Client unavailable. Orphaned object; invisible to the user, not worth a toast.
    return false
  }
}

/** Pure derivation from a stored path to a loadable URL. No network. */
export function publicBackgroundUrl(path: string): string {
  return requireSupabase().storage.from(BACKGROUND_BUCKET).getPublicUrl(path).data.publicUrl
}
