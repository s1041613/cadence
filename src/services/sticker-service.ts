import type { StickerAsset, DaySticker, MonthSticker } from '@/types/sticker'
import { requireSupabase } from '@/lib/supabase'

// Pure I/O layer, matching subtasks-service and user-settings-service: no store
// access, no concurrency control, no optimistic update or rollback — those live
// in the store. Three tables, three groups of functions: the library
// (sticker_assets) and the two placement surfaces (day_stickers,
// month_stickers). Placements are intentionally not parameterized into one
// generic "context" function — date and month are different types with
// different resolution rules (a specific day vs. a recurring 1-12 month), and
// collapsing them would trade two small, obvious functions for one that takes
// a discriminant nobody can misuse by accident today.

const REQUEST_TIMEOUT_MS = 10_000

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS)
}

/** Public bucket holding user-uploaded sticker art, keyed '<uid>/<uuid>.png'. */
export const STICKER_BUCKET = 'stickers'

// =====================================================================
// Library (sticker_assets)
// =====================================================================

export interface StickerAssetRow {
  id: string
  storage_path: string
  created_at: string
}

export function rowToStickerAsset(row: StickerAssetRow): StickerAsset {
  return {
    id: row.id,
    storagePath: row.storage_path,
    createdAt: row.created_at
  }
}

/** The signed-in user's sticker library, newest upload first. */
export async function fetchStickerAssets(ownerId: string): Promise<StickerAsset[]> {
  const { data, error } = await requireSupabase()
    .from('sticker_assets')
    .select('id, storage_path, created_at')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: false })
    .abortSignal(timeoutSignal())
  if (error) throw error

  return ((data ?? []) as StickerAssetRow[]).map(rowToStickerAsset)
}

/**
 * Uploads a sticker image and adds it to the library, returning the new asset.
 *
 * The row id is minted client-side and written with ignoreDuplicates, matching
 * notes-service's insertNote: a retry after a client-side timeout (the upload
 * itself succeeded, only the ack was lost) re-sends the same id and takes the
 * DO NOTHING path instead of minting a second row for one uploaded object.
 */
export async function uploadSticker(file: Blob, ownerId: string): Promise<StickerAsset> {
  const contentType = file.type || 'image/png'
  const storagePath = `${ownerId}/${crypto.randomUUID()}.${extensionFor(contentType)}`

  const { error: uploadError } = await requireSupabase()
    .storage.from(STICKER_BUCKET)
    .upload(storagePath, file, {
      contentType,
      // Fresh UUID name; a collision would mean something is badly wrong.
      upsert: false
    })
  if (uploadError) throw uploadError

  const asset: StickerAsset = {
    id: crypto.randomUUID(),
    storagePath,
    createdAt: new Date().toISOString()
  }

  const { error: insertError } = await requireSupabase()
    .from('sticker_assets')
    .upsert(
      { id: asset.id, user_id: ownerId, storage_path: asset.storagePath, created_at: asset.createdAt },
      { ignoreDuplicates: true }
    )
    .abortSignal(timeoutSignal())
  if (insertError) throw insertError

  return asset
}

/**
 * Removes a library sticker's row. Cascades in the database to every
 * day_stickers/month_stickers placement of it — there is no "placement with no
 * art" state to clean up separately.
 */
export async function deleteStickerAsset(id: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('sticker_assets')
    .delete()
    .eq('id', id)
    .abortSignal(timeoutSignal())
  if (error) throw error
}

/**
 * Best-effort cleanup of the storage object behind a deleted asset. Returns
 * whether it actually went away.
 *
 * Deliberately separate from deleteStickerAsset and its one exception to the
 * "throw on error" rule: this only ever runs after the row is already gone,
 * so a failure here leaves an orphaned object nobody can see, while throwing
 * would fail a deletion that genuinely succeeded. Mirrors deleteBackground.
 */
export async function deleteStickerObject(storagePath: string): Promise<boolean> {
  try {
    const { error } = await requireSupabase().storage.from(STICKER_BUCKET).remove([storagePath])
    return !error
  } catch {
    return false
  }
}

/** Pure derivation from a stored path to a loadable URL. No network. */
export function publicStickerUrl(storagePath: string): string {
  return requireSupabase().storage.from(STICKER_BUCKET).getPublicUrl(storagePath).data.publicUrl
}

/** Extension matching the bytes being stored. downscaleSticker always emits
 *  PNG, but falls back to the original file (any type) when the canvas path
 *  fails, so this still has to branch. Mirrors user-settings-service. */
function extensionFor(contentType: string): string {
  if (contentType === 'image/webp') return 'webp'
  if (contentType === 'image/jpeg') return 'jpg'
  return 'png'
}

// =====================================================================
// Day placements (day_stickers)
// =====================================================================

export interface DayStickerRow {
  id: string
  date: string
  sticker_id: string
  x: number
  y: number
  width: number
  rotation: number
  z_index: number
}

export function rowToDaySticker(row: DayStickerRow): DaySticker {
  return {
    id: row.id,
    date: row.date,
    stickerId: row.sticker_id,
    x: row.x,
    y: row.y,
    width: row.width,
    rotation: row.rotation,
    zIndex: row.z_index
  }
}

export function dayStickerToRow(sticker: DaySticker, ownerId: string) {
  return {
    id: sticker.id,
    user_id: ownerId,
    date: sticker.date,
    sticker_id: sticker.stickerId,
    x: sticker.x,
    y: sticker.y,
    width: sticker.width,
    rotation: sticker.rotation,
    z_index: sticker.zIndex
  }
}

/** Every sticker placed on one specific date. */
export async function fetchDayStickers(ownerId: string, date: string): Promise<DaySticker[]> {
  const { data, error } = await requireSupabase()
    .from('day_stickers')
    .select('id, date, sticker_id, x, y, width, rotation, z_index')
    .eq('user_id', ownerId)
    .eq('date', date)
    .abortSignal(timeoutSignal())
  if (error) throw error

  return ((data ?? []) as DayStickerRow[]).map(rowToDaySticker)
}

/** Inserts a new placement or saves an existing one's position/rotation/z_index. */
export async function upsertDaySticker(sticker: DaySticker, ownerId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('day_stickers')
    .upsert(dayStickerToRow(sticker, ownerId), { onConflict: 'id' })
    .abortSignal(timeoutSignal())
  if (error) throw error
}

export async function deleteDaySticker(id: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('day_stickers')
    .delete()
    .eq('id', id)
    .abortSignal(timeoutSignal())
  if (error) throw error
}

// =====================================================================
// Month placements (month_stickers)
// =====================================================================

export interface MonthStickerRow {
  id: string
  month: number
  sticker_id: string
  x: number
  y: number
  width: number
  rotation: number
  z_index: number
}

export function rowToMonthSticker(row: MonthStickerRow): MonthSticker {
  return {
    id: row.id,
    month: row.month,
    stickerId: row.sticker_id,
    x: row.x,
    y: row.y,
    width: row.width,
    rotation: row.rotation,
    zIndex: row.z_index
  }
}

export function monthStickerToRow(sticker: MonthSticker, ownerId: string) {
  return {
    id: sticker.id,
    user_id: ownerId,
    month: sticker.month,
    sticker_id: sticker.stickerId,
    x: sticker.x,
    y: sticker.y,
    width: sticker.width,
    rotation: sticker.rotation,
    z_index: sticker.zIndex
  }
}

/** Every sticker placed on one calendar month (1-12, recurring every year —
 *  see month_stickers' migration comment). */
export async function fetchMonthStickers(ownerId: string, month: number): Promise<MonthSticker[]> {
  const { data, error } = await requireSupabase()
    .from('month_stickers')
    .select('id, month, sticker_id, x, y, width, rotation, z_index')
    .eq('user_id', ownerId)
    .eq('month', month)
    .abortSignal(timeoutSignal())
  if (error) throw error

  return ((data ?? []) as MonthStickerRow[]).map(rowToMonthSticker)
}

export async function upsertMonthSticker(sticker: MonthSticker, ownerId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('month_stickers')
    .upsert(monthStickerToRow(sticker, ownerId), { onConflict: 'id' })
    .abortSignal(timeoutSignal())
  if (error) throw error
}

export async function deleteMonthSticker(id: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('month_stickers')
    .delete()
    .eq('id', id)
    .abortSignal(timeoutSignal())
  if (error) throw error
}
