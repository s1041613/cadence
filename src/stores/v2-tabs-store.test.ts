import { describe, it, expect, beforeEach, vi } from 'vitest'
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
import * as service from '@/services/user-settings-service'
import { notifySyncError } from '@/lib/notify'

vi.mock('@/services/user-settings-service', () => ({
  fetchUserSettings: vi.fn(),
  saveUserSettings: vi.fn(),
  uploadBackground: vi.fn(),
  deleteBackground: vi.fn(),
  publicBackgroundUrl: (path: string) => `https://cdn.test/${path}`
}))
vi.mock('@/lib/notify', () => ({
  notifySyncError: vi.fn()
}))

let currentUserId: string | undefined = 'user-1'
vi.mock('./auth-store', () => ({
  useAuthStore: () => ({ user: currentUserId ? { id: currentUserId } : null })
}))

const fetchMock = vi.mocked(service.fetchUserSettings)
const saveMock = vi.mocked(service.saveUserSettings)
const notifyMock = vi.mocked(notifySyncError)

/** Flushes the microtask queue so fire-and-forget writes settle. */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

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
    vi.clearAllMocks()
    currentUserId = 'user-1'
    saveMock.mockResolvedValue(undefined)
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

describe('sanitizeShownKeys accepts untrusted input', () => {
  it('takes arbitrary strings without a cast at the call site', () => {
    // shown_tab_keys is a bare text[] with no CHECK constraint, so what comes back
    // is string[], not NavKey[]. Typing the parameter as NavKey[] would force every
    // caller to assert away the very uncertainty this function exists to resolve.
    // This call must compile with no `as`; the assertion below is secondary.
    const fromDatabase: string[] = ['month', 'bogus', 'setting']

    const cleaned = sanitizeShownKeys(fromDatabase)

    expect(cleaned).not.toContain('bogus')
    expect(cleaned).toContain('setting')
  })
})

describe('v2-tabs-store persistence', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    currentUserId = 'user-1'
    saveMock.mockResolvedValue(undefined)

    // Mirror of the appearance suite: persistSettings refuses a partial row, and
    // this suite instantiates only the tabs store. In the app both register at boot.
    const { clearSettingsSlices, registerSettingsSlice } = await import('./user-settings-sync')
    clearSettingsSlices()
    registerSettingsSlice('v2-appearance', () => ({ backgroundPath: null, scrimOpacity: 0.8 }))
  })

  it('does not call the service when nobody is signed in', async () => {
    currentUserId = undefined
    const store = useV2TabsStore()

    await store.loadFromRemote()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps the defaults when the user has no row yet', async () => {
    fetchMock.mockResolvedValue(null)
    const store = useV2TabsStore()

    await store.loadFromRemote()

    expect(store.shownKeys).toEqual([...DEFAULT_SHOWN_KEYS])
  })

  it('keeps the defaults when the row has no tab preference', async () => {
    // A user who set a wallpaper but never touched the tab bar has a row whose
    // shown_tab_keys is null — that is "no preference", not "no tabs".
    fetchMock.mockResolvedValue({ backgroundPath: null, scrimOpacity: 0.8, shownTabKeys: null })
    const store = useV2TabsStore()

    await store.loadFromRemote()

    expect(store.shownKeys).toEqual([...DEFAULT_SHOWN_KEYS])
  })

  it('applies a stored order', async () => {
    fetchMock.mockResolvedValue({
      backgroundPath: null,
      scrimOpacity: 0.8,
      shownTabKeys: ['week', 'month', 'setting']
    })
    const store = useV2TabsStore()

    await store.loadFromRemote()

    expect(store.shownKeys).toEqual(['week', 'month', 'setting'])
  })

  it('repairs stored data that breaks the nav rules', async () => {
    // The DB stores a bare text[] with no CHECK constraint, on purpose: the
    // client sanitiser is the single source of these rules and has to repair
    // rows written by older clients anyway. This proves the read path uses it.
    fetchMock.mockResolvedValue({
      backgroundPath: null,
      scrimOpacity: 0.8,
      // duplicate, unknown key, over the cap, and missing the mandatory tab
      shownTabKeys: ['month', 'month', 'bogus', 'week', 'draft', 'notes']
    })
    const store = useV2TabsStore()

    await store.loadFromRemote()

    const keys = store.shownKeys
    expect(keys).toContain(MANDATORY_TAB_KEY)
    expect(keys.length).toBeLessThanOrEqual(MAX_SHOWN_TABS)
    expect(keys.length).toBeGreaterThanOrEqual(MIN_SHOWN_TABS)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).not.toContain('bogus')
  })

  it('repairs an empty stored array rather than rendering an empty nav', async () => {
    fetchMock.mockResolvedValue({ backgroundPath: null, scrimOpacity: 0.8, shownTabKeys: [] })
    const store = useV2TabsStore()

    await store.loadFromRemote()

    expect(store.shownKeys.length).toBeGreaterThanOrEqual(MIN_SHOWN_TABS)
    expect(store.shownKeys).toContain(MANDATORY_TAB_KEY)
  })

  it('never rejects, and stays silent, when the load fails', async () => {
    // Awaited inside the boot file's `void`-invoked Promise.all, so a rejection
    // would take sibling stores down. Falling back to the default nav is cosmetic.
    fetchMock.mockRejectedValue(new Error('offline'))
    const store = useV2TabsStore()

    await expect(store.loadFromRemote()).resolves.toBeUndefined()
    expect(store.shownKeys).toEqual([...DEFAULT_SHOWN_KEYS])
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('persists the sanitised list when the user saves', async () => {
    fetchMock.mockResolvedValue(null)
    const store = useV2TabsStore()
    await store.loadFromRemote()

    store.setShownKeys(['week', 'setting'])
    await flush()

    expect(saveMock).toHaveBeenCalledTimes(1)
    expect(saveMock.mock.calls[0]?.[0]).toMatchObject({ shownTabKeys: ['week', 'setting'] })
  })

  it('rolls back and warns when the save fails', async () => {
    fetchMock.mockResolvedValue(null)
    const store = useV2TabsStore()
    await store.loadFromRemote()
    saveMock.mockRejectedValueOnce(new Error('boom'))

    store.setShownKeys(['week', 'setting'])
    await flush()

    expect(store.shownKeys).toEqual([...DEFAULT_SHOWN_KEYS])
    expect(notifyMock).toHaveBeenCalled()
  })

  it('retries with the selection the user made, not the rolled-back one', async () => {
    // Same defect shape as the appearance store's slider retry: the row is
    // assembled from current store state, so a retry fired after the rollback
    // would persist the OLD tab list and discard what the user picked.
    fetchMock.mockResolvedValue(null)
    const store = useV2TabsStore()
    await store.loadFromRemote()
    saveMock.mockRejectedValueOnce(new Error('boom'))

    store.setShownKeys(['week', 'setting'])
    await flush()

    const retry = notifyMock.mock.calls[0]?.[1] as () => void
    saveMock.mockResolvedValueOnce(undefined)
    retry()
    await flush()

    expect(saveMock).toHaveBeenCalledTimes(2)
    expect(saveMock.mock.calls[1]?.[0]).toMatchObject({ shownTabKeys: ['week', 'setting'] })
    expect(store.shownKeys).toEqual(['week', 'setting'])
  })

  it('does not write into a fresh session when a save settles after sign-out', async () => {
    fetchMock.mockResolvedValue(null)
    const store = useV2TabsStore()
    await store.loadFromRemote()

    let failSave!: (e: unknown) => void
    saveMock.mockReturnValueOnce(
      new Promise<void>((_, reject) => {
        failSave = reject
      })
    )

    store.setShownKeys(['week', 'setting'])
    store.resetLocal()
    failSave(new Error('boom'))
    await flush()

    expect(store.shownKeys).toEqual([...DEFAULT_SHOWN_KEYS])
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('restores the defaults on resetLocal', async () => {
    fetchMock.mockResolvedValue({
      backgroundPath: null,
      scrimOpacity: 0.8,
      shownTabKeys: ['week', 'setting']
    })
    const store = useV2TabsStore()
    await store.loadFromRemote()

    store.resetLocal()

    expect(store.shownKeys).toEqual([...DEFAULT_SHOWN_KEYS])
  })
})
