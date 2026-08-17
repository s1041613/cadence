import { saveUserSettings, type UserSettings } from '@/services/user-settings-service'

// Shared write path for the single `user_settings` row.
//
// Two stores own different columns of the same row: v2-appearance-store owns
// background_path and scrim_opacity, v2-tabs-store owns shown_tab_keys. The
// service deliberately writes all three columns on every save (a partial upsert
// would let one store clobber the other's column with a stale value), which
// means whoever saves must know the current value of columns it does not own.
//
// Having each store import the other to ask would make them mutually dependent
// and would instantiate one from inside the other's action. Instead each store
// registers a getter for the slice it owns, and this module assembles the full
// row at write time. Neither store knows the other exists.

type Slice = Partial<UserSettings>

const contributors = new Map<string, () => Slice>()

/**
 * Registers a store's contribution to the shared row. Called once per store at
 * setup time; re-registering under the same key replaces the previous getter,
 * which keeps this idempotent across Pinia instances in tests.
 */
export function registerSettingsSlice(key: string, getSlice: () => Slice): void {
  contributors.set(key, getSlice)
}

/** Test seam: drops all registrations so one suite cannot leak into the next. */
export function clearSettingsSlices(): void {
  contributors.clear()
}

/**
 * Assembles the current row from every registered contributor.
 *
 * Deliberately seeded empty rather than with defaults. The write path sends every
 * column, so a fabricated default for a column no store has registered would be
 * written straight over whatever the remote row holds — turning "this store has
 * not loaded yet" into "the user cleared this setting". An absent key is the
 * honest answer, and `persistSettings` is what decides it is not writable yet.
 */
export function currentSettings(): Slice {
  const assembled: Slice = {}
  for (const getSlice of contributors.values()) {
    Object.assign(assembled, getSlice())
  }
  return assembled
}

const OWNED_COLUMNS = ['backgroundPath', 'scrimOpacity', 'shownTabKeys'] as const

/**
 * Writes the assembled row. Throws on failure; callers own rollback.
 *
 * Refuses to write a partial row. Both stores register at boot, so in the running
 * app this never triggers — but the guard is what makes that a structural
 * guarantee rather than a timing coincidence, and a partial write here would
 * silently blank a column the user never touched.
 */
export async function persistSettings(ownerId: string): Promise<void> {
  const settings = currentSettings()
  const missing = OWNED_COLUMNS.filter((column) => !(column in settings))
  if (missing.length > 0) {
    throw new Error(`Refusing to write user_settings without ${missing.join(', ')}`)
  }

  await saveUserSettings(settings as UserSettings, ownerId)
}
