import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  registerSettingsSlice,
  clearSettingsSlices,
  currentSettings,
  persistSettings
} from './user-settings-sync'
import * as service from '@/services/user-settings-service'

vi.mock('@/services/user-settings-service', () => ({
  saveUserSettings: vi.fn()
}))

const saveMock = vi.mocked(service.saveUserSettings)

beforeEach(() => {
  clearSettingsSlices()
  vi.clearAllMocks()
  saveMock.mockResolvedValue(undefined)
})

/** Registers both real contributors, as the boot file does. */
function registerBothStores(): void {
  registerSettingsSlice('v2-appearance', () => ({
    backgroundPath: 'u/1.jpg',
    scrimOpacity: 0.5
  }))
  registerSettingsSlice('v2-tabs', () => ({ shownTabKeys: ['month', 'setting'] }))
}

describe('currentSettings', () => {
  it('merges every registered slice into one row', () => {
    registerSettingsSlice('a', () => ({ backgroundPath: 'u/1.jpg', scrimOpacity: 0.3 }))
    registerSettingsSlice('b', () => ({ shownTabKeys: ['month', 'setting'] }))

    expect(currentSettings()).toEqual({
      backgroundPath: 'u/1.jpg',
      scrimOpacity: 0.3,
      shownTabKeys: ['month', 'setting']
    })
  })

  it('re-reads its contributors on every call rather than caching', () => {
    let opacity = 0.1
    registerSettingsSlice('a', () => ({ scrimOpacity: opacity }))

    expect(currentSettings().scrimOpacity).toBe(0.1)
    opacity = 0.9
    expect(currentSettings().scrimOpacity).toBe(0.9)
  })

  it('replaces a slice registered twice under the same key', () => {
    // Pinia stores are re-created per test and per app instance; a stale getter
    // left behind would read a dead store's state.
    registerSettingsSlice('a', () => ({ scrimOpacity: 0.1 }))
    registerSettingsSlice('a', () => ({ scrimOpacity: 0.7 }))

    expect(currentSettings().scrimOpacity).toBe(0.7)
  })

  it('does not invent values for a column no store has registered', () => {
    // The write path sends all three columns, so a fabricated default here would
    // be written over whatever the remote row holds. A column nobody owns must be
    // reported as absent, not as a guess.
    registerSettingsSlice('a', () => ({ scrimOpacity: 0.3 }))

    const settings = currentSettings()

    expect(settings.shownTabKeys).toBeUndefined()
    expect(settings.backgroundPath).toBeUndefined()
  })
})

describe('persistSettings', () => {
  it('writes all three columns when both stores have registered', async () => {
    registerBothStores()

    await persistSettings('user-1')

    expect(saveMock).toHaveBeenCalledWith(
      { backgroundPath: 'u/1.jpg', scrimOpacity: 0.5, shownTabKeys: ['month', 'setting'] },
      'user-1'
    )
  })

  it('refuses to write when a store has not registered its column', async () => {
    // The service writes every column, so a partial row would blank whatever the
    // absent store owns. Failing loudly beats silently clearing the user's tabs.
    registerSettingsSlice('v2-appearance', () => ({
      backgroundPath: 'u/1.jpg',
      scrimOpacity: 0.5
    }))

    await expect(persistSettings('user-1')).rejects.toThrow(/shownTabKeys/)
    expect(saveMock).not.toHaveBeenCalled()
  })

  it('writes an explicit null without mistaking it for an absent column', async () => {
    // null is a real value here — "reset back to the bundled default" — and must
    // not trip the missing-column guard.
    registerSettingsSlice('v2-appearance', () => ({
      backgroundPath: null,
      scrimOpacity: 0.8
    }))
    registerSettingsSlice('v2-tabs', () => ({ shownTabKeys: null }))

    await persistSettings('user-1')

    expect(saveMock).toHaveBeenCalledWith(
      { backgroundPath: null, scrimOpacity: 0.8, shownTabKeys: null },
      'user-1'
    )
  })
})
