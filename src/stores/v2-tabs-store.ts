import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// v2 bottom-nav configuration. Written by Settings › Customization › Tab bar,
// read by Pv2BottomNav. Like v2-appearance-store this deliberately has no
// persistence yet: a reload returns to the defaults. Persistence will hook into
// setShownKeys when it is designed alongside the background-photo feature.

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

const findTab = (key: NavKey): V2Tab | undefined => V2_TAB_CATALOGUE.find((t) => t.key === key)

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
export function sanitizeShownKeys(next: readonly NavKey[]): NavKey[] {
  // 1. drop keys absent from the catalogue; 2. de-duplicate, first occurrence wins
  const seen = new Set<NavKey>()
  const cleaned: NavKey[] = []
  for (const key of next) {
    if (!findTab(key) || seen.has(key)) continue
    seen.add(key)
    cleaned.push(key)
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

  /** The only write path */
  function setShownKeys(next: readonly NavKey[]): void {
    shownKeysRef.value = sanitizeShownKeys(next)
  }

  function resetToDefault(): void {
    shownKeysRef.value = [...DEFAULT_SHOWN_KEYS]
  }

  return { shownKeys, shownTabs, hiddenTabs, isFull, shownCount, setShownKeys, resetToDefault }
})
