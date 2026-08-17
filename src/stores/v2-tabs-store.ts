import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { notifySyncError } from '@/lib/notify'
import { fetchUserSettings } from '@/services/user-settings-service'
import { persistSettings, registerSettingsSlice } from './user-settings-sync'
import { useAuthStore } from './auth-store'

// v2 bottom-nav configuration. Written by Settings › Customization › Tab bar,
// read by Pv2BottomNav. Persisted in the shared user_settings row alongside the
// v2 background photo and scrim opacity — see user-settings-sync.ts for how two
// stores own different columns of one row without importing each other.

export type NavKey = 'month' | 'week' | 'draft' | 'notes' | 'setting'

export interface V2Tab {
  key: NavKey
  /** Serif letter used for the settings disc and the nav glyph */
  glyph: string
  /** Nav label, lowercase — the CSS uppercases it */
  label: string
  /** Settings-row title, e.g. 'Notebook' — deliberately separate from the nav label */
  title: string
  description: string
  to: string
}

// Canonical order: the HIDDEN list follows it, and the minimum top-up draws from
// it. This is NOT the default shown order — see DEFAULT_SHOWN_KEYS.
//
// key 'draft' → /v2/day and key 'notes' → /v2/notebook are historical mismatches
// documented in routes.ts. Do not rename them in passing.
export const V2_TAB_CATALOGUE: readonly V2Tab[] = [
  {
    key: 'month',
    glyph: 'm',
    label: 'month',
    title: 'Month',
    description: '整月一覽，事件貼在日期格上',
    to: '/v2/month'
  },
  {
    key: 'week',
    glyph: 'w',
    label: 'week',
    title: 'Week',
    description: '七天並排，看得到每天的時段',
    to: '/v2/week'
  },
  {
    key: 'draft',
    glyph: 'd',
    label: 'day',
    title: 'Day',
    description: '時間軸，拖曳筆記排進時段',
    to: '/v2/day'
  },
  {
    key: 'notes',
    glyph: 'n',
    label: 'notes',
    title: 'Notebook',
    description: '還沒排時間的想法都在這',
    to: '/v2/notebook'
  },
  {
    key: 'setting',
    glyph: 's',
    label: 'setting',
    title: 'Setting',
    description: '帳號、外觀與通知',
    to: '/v2/settings'
  }
]

export const MAX_SHOWN_TABS = 4
/** Effectively "Setting plus at least one other" — a one-cell nav navigates nothing */
export const MIN_SHOWN_TABS = 2
export const MANDATORY_TAB_KEY: NavKey = 'setting'
export const DEFAULT_SHOWN_KEYS: readonly NavKey[] = ['month', 'draft', 'notes', 'setting']

// Takes a plain string so it doubles as the narrowing step for untrusted input:
// a hit proves the key is a NavKey, a miss is how unknown keys get dropped.
const findTab = (key: string): V2Tab | undefined => V2_TAB_CATALOGUE.find((t) => t.key === key)

// Pure rules, written once: the settings pane applies them to its in-progress draft,
// the store applies them to committed state.
export function isFullList(keys: readonly NavKey[]): boolean {
  return keys.length >= MAX_SHOWN_TABS
}

export function canRemoveFrom(keys: readonly NavKey[], key: NavKey): boolean {
  if (key === MANDATORY_TAB_KEY) return false
  return keys.length > MIN_SHOWN_TABS
}

/**
 * Repair any input into a legal list. setShownKeys is the only write path, so an
 * illegal state this misses becomes a nav the UI cannot recover from on its own.
 *
 * Step order matters: the minimum top-up must precede the truncate, or the two
 * steps fight each other.
 */
export function sanitizeShownKeys(next: readonly string[]): NavKey[] {
  // Takes `string[]`, not `NavKey[]`: the persisted column is a bare text[] with
  // no CHECK constraint, so what comes back from the database is untrusted. Typing
  // the parameter as NavKey[] would force every caller to assert away exactly the
  // uncertainty this function exists to resolve. Step 1 is what narrows it.
  //
  // 1. drop keys absent from the catalogue; 2. de-duplicate, first occurrence wins
  const seen = new Set<NavKey>()
  const cleaned: NavKey[] = []
  for (const key of next) {
    const tab = findTab(key)
    if (!tab || seen.has(tab.key)) continue
    seen.add(tab.key)
    cleaned.push(tab.key)
  }

  // 3. put the mandatory tab back if it is missing
  if (!seen.has(MANDATORY_TAB_KEY)) {
    cleaned.push(MANDATORY_TAB_KEY)
    seen.add(MANDATORY_TAB_KEY)
  }

  // 4. top up to the minimum, drawing unused tabs in catalogue order
  for (const tab of V2_TAB_CATALOGUE) {
    if (cleaned.length >= MIN_SHOWN_TABS) break
    if (seen.has(tab.key)) continue
    seen.add(tab.key)
    cleaned.push(tab.key)
  }

  // 5. truncate to the cap from the non-mandatory tail, so Setting survives the cut
  //    even when it sits last in the input
  while (cleaned.length > MAX_SHOWN_TABS) {
    const victim = [...cleaned].reverse().find((k) => k !== MANDATORY_TAB_KEY)
    if (victim === undefined) break
    cleaned.splice(cleaned.lastIndexOf(victim), 1)
  }

  return cleaned
}

export const useV2TabsStore = defineStore('v2-tabs', () => {
  // Writable source of truth, deliberately not returned
  const shownKeysRef = ref<NavKey[]>([...DEFAULT_SHOWN_KEYS])

  // Expose a read-only view only. A ref returned straight out of a Pinia setup store
  // is writable by callers, so without this a single store.shownKeys.splice(...)
  // would bypass the sanitiser above with no warning at all.
  const shownKeys = computed<readonly NavKey[]>(() => shownKeysRef.value)

  const shownTabs = computed<V2Tab[]>(() =>
    shownKeysRef.value
      .map(findTab)
      .filter((t): t is V2Tab => t !== undefined)
  )

  const hiddenTabs = computed<V2Tab[]>(() =>
    V2_TAB_CATALOGUE.filter((t) => !shownKeysRef.value.includes(t.key))
  )

  const isFull = computed(() => isFullList(shownKeysRef.value))
  const shownCount = computed(() => shownKeysRef.value.length)

  // Bumped on load and reset, mirroring the appearance store: a write still in
  // flight at sign-out must not roll back into the next session's nav.
  let generation = 0

  // This store owns one of the three columns in the shared user_settings row.
  registerSettingsSlice('v2-tabs', () => ({ shownTabKeys: [...shownKeysRef.value] }))

  /**
   * Loads the saved tab order. Never rejects: it is awaited inside a Promise.all
   * that the boot file invokes with `void`.
   *
   * A failure is silent — falling back to the default nav is cosmetic, and every
   * tab remains reachable through Settings regardless.
   */
  async function loadFromRemote(): Promise<void> {
    const ownerId = useAuthStore().user?.id
    if (!ownerId) return

    generation += 1
    const version = generation

    try {
      const remote = await fetchUserSettings(ownerId)
      if (version !== generation) return
      // null row or null column both mean "no preference": keep the defaults
      // rather than sanitising null into an arbitrary list.
      if (!remote?.shownTabKeys) return

      // Always through the sanitiser, and with no cast: it takes string[] because
      // the column is a bare text[] with no CHECK constraint, and a row written by
      // an older client may not satisfy today's rules. The read path has to repair
      // exactly like the write path does.
      shownKeysRef.value = sanitizeShownKeys(remote.shownTabKeys)
    } catch {
      // Keep the defaults; see the doc comment.
    }
  }

  function resetLocal(): void {
    generation += 1
    shownKeysRef.value = [...DEFAULT_SHOWN_KEYS]
  }

  /**
   * The only write path.
   *
   * Deliberately undebounced, unlike the appearance store's opacity slider: the
   * Tab bar pane edits a local draft and commits once, when the user taps the
   * check button, so there is no burst to collapse.
   */
  function setShownKeys(next: readonly NavKey[]): void {
    const previous = shownKeysRef.value
    shownKeysRef.value = sanitizeShownKeys(next)
    void persist(previous)
  }

  async function persist(rollbackTo: readonly NavKey[]): Promise<void> {
    const ownerId = useAuthStore().user?.id
    if (!ownerId) return

    const version = generation
    // The selection being saved, captured before the rollback. persistSettings()
    // assembles the row from current store state, so the retry has to restore the
    // user's intent first — otherwise it would re-save the rolled-back list and
    // silently discard the selection it was offered to recover.
    const intended = [...shownKeysRef.value]

    try {
      await persistSettings(ownerId)
    } catch {
      if (version !== generation) return
      shownKeysRef.value = [...rollbackTo]
      notifySyncError('Could not save the tab bar.', () => {
        shownKeysRef.value = intended
        void persist(rollbackTo)
      })
    }
  }

  function resetToDefault(): void {
    setShownKeys([...DEFAULT_SHOWN_KEYS])
  }

  return {
    shownKeys,
    shownTabs,
    hiddenTabs,
    isFull,
    shownCount,
    setShownKeys,
    resetToDefault,
    loadFromRemote,
    resetLocal
  }
})
