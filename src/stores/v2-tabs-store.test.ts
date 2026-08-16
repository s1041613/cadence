import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  useV2TabsStore,
  canRemoveFrom,
  isFullList,
  sanitizeShownKeys,
  V2_TAB_CATALOGUE,
  MAX_SHOWN_TABS,
  MIN_SHOWN_TABS,
  MANDATORY_TAB_KEY,
  DEFAULT_SHOWN_KEYS,
  type NavKey
} from './v2-tabs-store'

// The sanitiser is the whole safety story here: setShownKeys is the only write path,
// so anything it fails to repair becomes an illegal nav the UI can't recover from.
// Those cases get the most coverage; the derived getters are checked for the one
// thing that's easy to write backwards (shown order wins over catalogue order).

describe('v2-tabs-store · pure rules', () => {
  describe('isFullList', () => {
    it('is true at the cap and false below it', () => {
      expect(isFullList(['month', 'draft', 'notes', 'setting'])).toBe(true)
      expect(isFullList(['month', 'draft', 'setting'])).toBe(false)
    })
  })

  describe('canRemoveFrom', () => {
    it('never allows removing the mandatory tab, at any list length', () => {
      expect(canRemoveFrom(['month', 'draft', 'notes', 'setting'], MANDATORY_TAB_KEY)).toBe(false)
      expect(canRemoveFrom(['month', 'setting'], MANDATORY_TAB_KEY)).toBe(false)
    })

    it('allows removing a normal tab above the floor, but not at it', () => {
      expect(canRemoveFrom(['month', 'draft', 'notes', 'setting'], 'month')).toBe(true)
      expect(canRemoveFrom(['month', 'setting'], 'month')).toBe(false)
    })
  })

  describe('sanitizeShownKeys', () => {
    it('drops keys that are not in the catalogue', () => {
      const result = sanitizeShownKeys(['month', 'bogus' as NavKey, 'setting'])
      expect(result).not.toContain('bogus')
      expect(result).toContain('month')
    })

    it('de-duplicates, keeping the first occurrence', () => {
      expect(sanitizeShownKeys(['month', 'month', 'draft', 'setting'])).toEqual([
        'month',
        'draft',
        'setting'
      ])
    })

    it('appends the mandatory tab when it is missing', () => {
      expect(sanitizeShownKeys(['month', 'draft'])).toContain(MANDATORY_TAB_KEY)
    })

    it('tops up to the minimum when given only the mandatory tab', () => {
      const result = sanitizeShownKeys(['setting'])
      expect(result.length).toBeGreaterThanOrEqual(MIN_SHOWN_TABS)
      expect(result).toContain(MANDATORY_TAB_KEY)
    })

    it('repairs an all-invalid input into a legal minimum set', () => {
      const result = sanitizeShownKeys(['bogus' as NavKey])
      expect(result.length).toBeGreaterThanOrEqual(MIN_SHOWN_TABS)
      expect(result).toContain(MANDATORY_TAB_KEY)
    })

    it('truncates above the cap while keeping the mandatory tab', () => {
      // Every catalogue key at once: 5 in, 4 out, and setting must survive the cut
      // even though it is last in the input.
      const all = V2_TAB_CATALOGUE.map((t) => t.key)
      const result = sanitizeShownKeys(all)
      expect(result).toHaveLength(MAX_SHOWN_TABS)
      expect(result).toContain(MANDATORY_TAB_KEY)
    })

    it('keeps the mandatory tab even when the overflow input ends with it', () => {
      const result = sanitizeShownKeys(['month', 'week', 'draft', 'notes', 'setting'])
      expect(result).toContain(MANDATORY_TAB_KEY)
      expect(result).toHaveLength(MAX_SHOWN_TABS)
    })

    it('preserves the caller order for the keys it keeps', () => {
      expect(sanitizeShownKeys(['setting', 'notes', 'draft'])).toEqual([
        'setting',
        'notes',
        'draft'
      ])
    })
  })
})

describe('v2-tabs-store · store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('defaults to month / day / notebook / setting with week hidden', () => {
    const store = useV2TabsStore()
    expect(store.shownKeys).toEqual([...DEFAULT_SHOWN_KEYS])
    expect(store.hiddenTabs.map((t) => t.key)).toEqual(['week'])
  })

  it('derives shownTabs in shownKeys order, not catalogue order', () => {
    const store = useV2TabsStore()
    store.setShownKeys(['setting', 'month', 'draft'])
    expect(store.shownTabs.map((t) => t.key)).toEqual(['setting', 'month', 'draft'])
  })

  it('derives hiddenTabs in catalogue order regardless of removal sequence', () => {
    const store = useV2TabsStore()
    // Remove notes first, then month — catalogue order must still win in the output.
    store.setShownKeys(['month', 'draft', 'setting'])
    store.setShownKeys(['draft', 'setting'])
    expect(store.hiddenTabs.map((t) => t.key)).toEqual(['month', 'week', 'notes'])
  })

  it('reports isFull and shownCount from the committed list', () => {
    const store = useV2TabsStore()
    expect(store.isFull).toBe(true)
    expect(store.shownCount).toBe(4)

    store.setShownKeys(['month', 'draft', 'setting'])
    expect(store.isFull).toBe(false)
    expect(store.shownCount).toBe(3)
  })

  it('sanitises through setShownKeys so callers cannot commit an illegal list', () => {
    const store = useV2TabsStore()
    store.setShownKeys(['setting'])
    expect(store.shownKeys.length).toBeGreaterThanOrEqual(MIN_SHOWN_TABS)
    expect(store.shownKeys).toContain(MANDATORY_TAB_KEY)
  })

  it('repairs an all-invalid list through setShownKeys, not just the bare sanitiser', () => {
    // setShownKeys is the public write path, so the repair has to hold there —
    // testing sanitizeShownKeys alone would leave the store path unproven.
    const store = useV2TabsStore()
    store.setShownKeys(['bogus' as NavKey])
    expect(store.shownKeys.length).toBeGreaterThanOrEqual(MIN_SHOWN_TABS)
    expect(store.shownKeys).toContain(MANDATORY_TAB_KEY)
    expect(store.shownKeys).not.toContain('bogus')
  })

  it('caps at MAX_SHOWN_TABS through setShownKeys when handed every catalogue key', () => {
    const store = useV2TabsStore()
    store.setShownKeys(V2_TAB_CATALOGUE.map((t) => t.key))
    expect(store.shownKeys).toHaveLength(MAX_SHOWN_TABS)
    expect(store.shownKeys).toContain(MANDATORY_TAB_KEY)
  })

  it('never yields a tab that is in both shown and hidden', () => {
    const store = useV2TabsStore()
    store.setShownKeys(['week', 'setting'])
    const shown = store.shownTabs.map((t) => t.key)
    const hidden = store.hiddenTabs.map((t) => t.key)
    expect(shown.filter((k) => hidden.includes(k))).toEqual([])
    expect(shown.length + hidden.length).toBe(V2_TAB_CATALOGUE.length)
  })

  it('restores the default list via resetToDefault', () => {
    const store = useV2TabsStore()
    store.setShownKeys(['week', 'setting'])
    store.resetToDefault()
    expect(store.shownKeys).toEqual([...DEFAULT_SHOWN_KEYS])
  })

  it('exposes every catalogue tab with a route target', () => {
    // The nav pushes tab.to directly; a blank target would be a dead cell.
    for (const tab of V2_TAB_CATALOGUE) {
      expect(tab.to).toMatch(/^\/v2\//)
    }
  })
})
