import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotificationPrefsStore } from './notification-prefs-store'
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

// The interesting behaviour here is all in the write path: the switch applies
// immediately, so a failed save has to put it back or the UI claims a preference
// the server never stored. The read path only has to avoid making things worse
// than the default.

describe('notification-prefs-store', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    currentUserId = 'user-1'
    saveMock.mockResolvedValue(undefined)

    // Same shape as the tabs and appearance suites: persistSettings refuses a
    // partial row, and this suite instantiates only this store. In the app they
    // all register at boot.
    const { clearSettingsSlices, registerSettingsSlice } = await import('./user-settings-sync')
    clearSettingsSlices()
    registerSettingsSlice('v2-appearance', () => ({ backgroundPath: null, scrimOpacity: 0.8 }))
    registerSettingsSlice('v2-tabs', () => ({ shownTabKeys: null }))
  })

  describe('loadFromRemote', () => {
    it('applies the stored preference', async () => {
      fetchMock.mockResolvedValue({
        backgroundPath: null,
        scrimOpacity: 0.8,
        shownTabKeys: null,
        notifyOnMemberEvents: false
      })
      const store = useNotificationPrefsStore()

      await store.loadFromRemote()

      expect(store.notifyOnMemberEvents).toBe(false)
    })

    it('keeps the default when the user has no settings row yet', async () => {
      // Never opened Settings. Defaulting to ON is the safe direction: a silent
      // OFF reads as the feature being broken.
      fetchMock.mockResolvedValue(null)
      const store = useNotificationPrefsStore()

      await store.loadFromRemote()

      expect(store.notifyOnMemberEvents).toBe(true)
    })

    it('does not reject when the fetch fails', async () => {
      // It is awaited inside a Promise.all the boot file invokes with `void`, so a
      // rejection here would abandon every sibling load.
      fetchMock.mockRejectedValue(new Error('offline'))
      const store = useNotificationPrefsStore()

      await expect(store.loadFromRemote()).resolves.toBeUndefined()
      expect(store.notifyOnMemberEvents).toBe(true)
    })

    it('does not call the service when nobody is signed in', async () => {
      currentUserId = undefined
      const store = useNotificationPrefsStore()

      await store.loadFromRemote()

      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('setNotifyOnMemberEvents', () => {
    it('applies immediately and writes the whole row', async () => {
      const store = useNotificationPrefsStore()

      store.setNotifyOnMemberEvents(false)

      expect(store.notifyOnMemberEvents).toBe(false)
      await flush()
      expect(saveMock).toHaveBeenCalledTimes(1)
      expect(saveMock.mock.calls[0]?.[0]).toMatchObject({ notifyOnMemberEvents: false })
    })

    it('ignores a toggle to the value already held', async () => {
      const store = useNotificationPrefsStore()

      store.setNotifyOnMemberEvents(true)

      await flush()
      expect(saveMock).not.toHaveBeenCalled()
    })

    it('rolls the switch back and offers a retry when the write fails', async () => {
      saveMock.mockRejectedValueOnce(new Error('boom'))
      const store = useNotificationPrefsStore()

      store.setNotifyOnMemberEvents(false)
      await flush()

      expect(store.notifyOnMemberEvents).toBe(true)
      expect(notifyMock).toHaveBeenCalledTimes(1)
    })

    it('retries with the value the user chose, not the rolled-back one', async () => {
      // persistSettings assembles the row from current store state, so the retry
      // has to restore the user's intent before saving again — otherwise it would
      // re-save the rollback and silently discard the change it offered to recover.
      saveMock.mockRejectedValueOnce(new Error('boom'))
      const store = useNotificationPrefsStore()

      store.setNotifyOnMemberEvents(false)
      await flush()

      const retry = notifyMock.mock.calls[0]?.[1]
      retry?.()
      await flush()

      expect(saveMock).toHaveBeenCalledTimes(2)
      expect(saveMock.mock.calls[1]?.[0]).toMatchObject({ notifyOnMemberEvents: false })
      expect(store.notifyOnMemberEvents).toBe(false)
    })

    it('does not write into a fresh session when a save settles after sign-out', async () => {
      // generation is bumped by resetLocal, so the in-flight rollback belongs to a
      // session that no longer exists and must not touch the next user's switch.
      let failSave: (reason: unknown) => void = () => {}
      saveMock.mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          failSave = reject
        })
      )
      const store = useNotificationPrefsStore()

      store.setNotifyOnMemberEvents(false)
      store.resetLocal()
      failSave(new Error('boom'))
      await flush()

      expect(store.notifyOnMemberEvents).toBe(true)
      expect(notifyMock).not.toHaveBeenCalled()
    })

    it('does not call the service when nobody is signed in', async () => {
      currentUserId = undefined
      const store = useNotificationPrefsStore()

      store.setNotifyOnMemberEvents(false)
      await flush()

      expect(saveMock).not.toHaveBeenCalled()
    })
  })

  describe('resetLocal', () => {
    it('returns to the default so the next session does not inherit it', async () => {
      fetchMock.mockResolvedValue({
        backgroundPath: null,
        scrimOpacity: 0.8,
        shownTabKeys: null,
        notifyOnMemberEvents: false
      })
      const store = useNotificationPrefsStore()
      await store.loadFromRemote()

      store.resetLocal()

      expect(store.notifyOnMemberEvents).toBe(true)
    })
  })

  describe('settings slice', () => {
    it('contributes its column to the assembled row', async () => {
      const { currentSettings } = await import('./user-settings-sync')
      const store = useNotificationPrefsStore()

      store.setNotifyOnMemberEvents(false)

      expect(currentSettings()).toMatchObject({ notifyOnMemberEvents: false })
    })
  })
})
