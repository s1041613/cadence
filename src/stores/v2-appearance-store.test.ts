import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
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

vi.mock('@/utils/image-downscale', () => ({
  downscaleImage: vi.fn(async (f: File) => f)
}))

const fetchMock = vi.mocked(service.fetchUserSettings)
const saveMock = vi.mocked(service.saveUserSettings)
const uploadMock = vi.mocked(service.uploadBackground)
const deleteMock = vi.mocked(service.deleteBackground)
const notifyMock = vi.mocked(notifySyncError)

/** Flushes the microtask queue so promise chains settle. */
const flush = (): Promise<void> => Promise.resolve().then(() => {})

async function importStore() {
  return await import('./v2-appearance-store')
}

const photo = () => new File(['x'], 'p.jpg', { type: 'image/jpeg' })

beforeEach(async () => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  currentUserId = 'user-1'
  saveMock.mockResolvedValue(undefined)
  deleteMock.mockResolvedValue(true)

  // The shared row is assembled from every registered store, and persistSettings
  // refuses to write a partial row (blanking a column its owner never touched).
  // This suite instantiates only the appearance store, so stand in for the columns
  // the other stores own — in the app all of them register at boot.
  const { clearSettingsSlices, registerSettingsSlice } = await import('./user-settings-sync')
  clearSettingsSlices()
  registerSettingsSlice('v2-tabs', () => ({ shownTabKeys: null }))
  registerSettingsSlice('notification-prefs', () => ({ notifyOnMemberEvents: true }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('DEFAULT_BACKGROUND', () => {
  it('uses the configured public base for the default background image', async () => {
    vi.stubEnv('BASE_URL', '/cadence/')
    vi.resetModules()
    const { DEFAULT_BACKGROUND } = await import('./v2-appearance-store')
    expect(DEFAULT_BACKGROUND).toBe('/cadence/v2-backgrounds/default.jpg')
  })
})

describe('loadFromRemote', () => {
  it('does not call the service when nobody is signed in', async () => {
    currentUserId = undefined
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()

    await store.loadFromRemote()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps the bundled default when the user has no row yet', async () => {
    fetchMock.mockResolvedValue(null)
    const { useV2AppearanceStore, DEFAULT_BACKGROUND, DEFAULT_SCRIM_OPACITY } = await importStore()
    const store = useV2AppearanceStore()

    await store.loadFromRemote()

    expect(store.backgroundImage).toBe(DEFAULT_BACKGROUND)
    expect(store.scrimOpacity).toBe(DEFAULT_SCRIM_OPACITY)
  })

  it('derives a public URL from a stored path', async () => {
    fetchMock.mockResolvedValue({
      backgroundPath: 'user-1/abc.jpg',
      scrimOpacity: 0.4,
      shownTabKeys: null,
      notifyOnMemberEvents: true
    })
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()

    await store.loadFromRemote()

    expect(store.backgroundImage).toBe('https://cdn.test/user-1/abc.jpg')
    expect(store.scrimOpacity).toBe(0.4)
  })

  it('never rejects, and stays silent, when the load fails', async () => {
    // It is awaited inside a Promise.all that the boot file invokes with `void`,
    // so a rejection here takes sibling stores down with it. Falling back to the
    // bundled wallpaper is cosmetic, so it also must not raise a toast.
    fetchMock.mockRejectedValue(new Error('offline'))
    const { useV2AppearanceStore, DEFAULT_BACKGROUND } = await importStore()
    const store = useV2AppearanceStore()

    await expect(store.loadFromRemote()).resolves.toBeUndefined()
    expect(store.backgroundImage).toBe(DEFAULT_BACKGROUND)
    expect(notifyMock).not.toHaveBeenCalled()
  })
})

describe('setScrimOpacity', () => {
  it('updates the local value immediately but defers the write', async () => {
    vi.useFakeTimers()
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue(null)
    await store.loadFromRemote()

    store.setScrimOpacity(0.25)

    // The scrim must track the thumb with no lag; only the network call waits.
    expect(store.scrimOpacity).toBe(0.25)
    expect(saveMock).not.toHaveBeenCalled()
  })

  it('collapses a burst of drag events into exactly one write carrying the final value', async () => {
    vi.useFakeTimers()
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue(null)
    await store.loadFromRemote()

    store.setScrimOpacity(0.1)
    store.setScrimOpacity(0.2)
    store.setScrimOpacity(0.3)
    await vi.advanceTimersByTimeAsync(1000)

    expect(saveMock).toHaveBeenCalledTimes(1)
    expect(saveMock.mock.calls[0]?.[0]).toMatchObject({ scrimOpacity: 0.3 })
  })

  it('clamps out-of-range values before they reach the network', async () => {
    vi.useFakeTimers()
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue(null)
    await store.loadFromRemote()

    store.setScrimOpacity(5)
    await vi.advanceTimersByTimeAsync(1000)

    expect(store.scrimOpacity).toBe(1)
    expect(saveMock.mock.calls[0]?.[0]).toMatchObject({ scrimOpacity: 1 })
  })

  it('rolls the value back and offers a retry when the write fails', async () => {
    vi.useFakeTimers()
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue({
      backgroundPath: null,
      scrimOpacity: 0.8,
      shownTabKeys: null,
      notifyOnMemberEvents: true
    })
    await store.loadFromRemote()
    saveMock.mockRejectedValueOnce(new Error('boom'))

    store.setScrimOpacity(0.2)
    await vi.advanceTimersByTimeAsync(1000)

    expect(store.scrimOpacity).toBe(0.8)
    expect(notifyMock).toHaveBeenCalled()
  })

  it('retries with the value the user chose, not the rolled-back one', async () => {
    // The retry toast exists to recover a transient failure. Because the row is
    // assembled from current store state at write time, a retry fired after the
    // rollback would save the OLD opacity and silently discard the user's change.
    vi.useFakeTimers()
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue({
      backgroundPath: null,
      scrimOpacity: 0.8,
      shownTabKeys: null,
      notifyOnMemberEvents: true
    })
    await store.loadFromRemote()
    saveMock.mockRejectedValueOnce(new Error('boom'))

    store.setScrimOpacity(0.2)
    await vi.advanceTimersByTimeAsync(1000)

    // Fire the retry handed to the toast.
    const retry = notifyMock.mock.calls[0]?.[1] as () => void
    saveMock.mockResolvedValueOnce(undefined)
    retry()
    await vi.advanceTimersByTimeAsync(1000)

    expect(saveMock).toHaveBeenCalledTimes(2)
    expect(saveMock.mock.calls[1]?.[0]).toMatchObject({ scrimOpacity: 0.2 })
    expect(store.scrimOpacity).toBe(0.2)
  })
})

describe('flushScrimOpacity', () => {
  it('sends a pending write immediately', async () => {
    vi.useFakeTimers()
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue(null)
    await store.loadFromRemote()

    store.setScrimOpacity(0.42)
    store.flushScrimOpacity()
    await flush()

    expect(saveMock).toHaveBeenCalledTimes(1)
    expect(saveMock.mock.calls[0]?.[0]).toMatchObject({ scrimOpacity: 0.42 })
  })

  it('is a no-op when nothing is pending', async () => {
    vi.useFakeTimers()
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue(null)
    await store.loadFromRemote()

    store.flushScrimOpacity()
    await flush()

    expect(saveMock).not.toHaveBeenCalled()
  })
})

describe('resetLocal', () => {
  it('cancels a pending debounce so it cannot write into the next session', async () => {
    // Without this, a slider write armed just before sign-out fires 500ms later
    // and stamps the previous user's opacity onto whoever signs in next.
    vi.useFakeTimers()
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue(null)
    await store.loadFromRemote()

    store.setScrimOpacity(0.2)
    store.resetLocal()
    await vi.advanceTimersByTimeAsync(1000)

    expect(saveMock).not.toHaveBeenCalled()
  })

  it('restores the compiled-in defaults', async () => {
    const { useV2AppearanceStore, DEFAULT_BACKGROUND, DEFAULT_SCRIM_OPACITY } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue({
      backgroundPath: 'user-1/abc.jpg',
      scrimOpacity: 0.1,
      shownTabKeys: null,
      notifyOnMemberEvents: true
    })
    await store.loadFromRemote()

    store.resetLocal()

    expect(store.backgroundImage).toBe(DEFAULT_BACKGROUND)
    expect(store.scrimOpacity).toBe(DEFAULT_SCRIM_OPACITY)
  })
})

describe('uploadBackground', () => {
  it('shows the new photo and saves the whole preference set', async () => {
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue(null)
    await store.loadFromRemote()
    uploadMock.mockResolvedValue('user-1/new.jpg')

    await store.uploadBackground(photo())

    expect(store.backgroundImage).toBe('https://cdn.test/user-1/new.jpg')
    const saved = saveMock.mock.calls[0]?.[0]
    expect(saved).toHaveProperty('backgroundPath', 'user-1/new.jpg')
    expect(saved).toHaveProperty('scrimOpacity')
    expect(saved).toHaveProperty('shownTabKeys')
  })

  it('deletes the previous object, not the one just uploaded', async () => {
    // Order matters: delete last, and delete the OLD path. Reversing either
    // leaves the row pointing at a deleted object — a broken calendar.
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue({
      backgroundPath: 'user-1/old.jpg',
      scrimOpacity: 0.8,
      shownTabKeys: null,
      notifyOnMemberEvents: true
    })
    await store.loadFromRemote()
    uploadMock.mockResolvedValue('user-1/new.jpg')

    await store.uploadBackground(photo())

    expect(deleteMock).toHaveBeenCalledWith('user-1/old.jpg')
  })

  it('does not delete anything when there was no previous photo', async () => {
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue(null)
    await store.loadFromRemote()
    uploadMock.mockResolvedValue('user-1/new.jpg')

    await store.uploadBackground(photo())

    expect(deleteMock).not.toHaveBeenCalled()
  })

  it('rolls back and keeps the old photo when the upload fails', async () => {
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue({
      backgroundPath: 'user-1/old.jpg',
      scrimOpacity: 0.8,
      shownTabKeys: null,
      notifyOnMemberEvents: true
    })
    await store.loadFromRemote()
    uploadMock.mockRejectedValue(new Error('boom'))

    await store.uploadBackground(photo())

    expect(store.backgroundImage).toBe('https://cdn.test/user-1/old.jpg')
    expect(notifyMock).toHaveBeenCalled()
    // Critically: the still-current photo must survive a failed replacement.
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it('keeps the new photo when only the cleanup of the old one fails', async () => {
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue({
      backgroundPath: 'user-1/old.jpg',
      scrimOpacity: 0.8,
      shownTabKeys: null,
      notifyOnMemberEvents: true
    })
    await store.loadFromRemote()
    uploadMock.mockResolvedValue('user-1/new.jpg')
    deleteMock.mockRejectedValue(new Error('orphan'))

    await store.uploadBackground(photo())

    expect(store.backgroundImage).toBe('https://cdn.test/user-1/new.jpg')
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('does not write into a fresh session when the upload settles after sign-out', async () => {
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue({
      backgroundPath: 'user-1/old.jpg',
      scrimOpacity: 0.8,
      shownTabKeys: null,
      notifyOnMemberEvents: true
    })
    await store.loadFromRemote()

    let failUpload!: (e: unknown) => void
    const uploadPromise = new Promise<string>((_, reject) => {
      failUpload = reject
    })
    // The store may abandon this promise at its generation check, leaving the
    // rejection unobserved. Attaching a sink here keeps that from surfacing as an
    // unhandled rejection that vitest counts against the whole run.
    uploadPromise.catch(() => {})
    uploadMock.mockReturnValueOnce(uploadPromise)

    const pending = store.uploadBackground(photo())
    store.resetLocal()
    failUpload(new Error('boom'))
    await pending

    const { DEFAULT_BACKGROUND } = await importStore()
    expect(store.backgroundImage).toBe(DEFAULT_BACKGROUND)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('does not upload at all when the session ends during image compression', async () => {
    // Downscaling a phone photo takes real time on a phone. If the user signs out
    // in that window the upload must not proceed: it would write an object into
    // the previous account's folder for a session that no longer exists.
    const downscale = await import('@/utils/image-downscale')
    const downscaleMock = vi.mocked(downscale.downscaleImage)

    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue(null)
    await store.loadFromRemote()

    let finishDownscale!: (b: Blob) => void
    downscaleMock.mockReturnValueOnce(
      new Promise<Blob>((resolve) => {
        finishDownscale = resolve
      })
    )
    uploadMock.mockResolvedValue('user-1/new.jpg')

    const pending = store.uploadBackground(photo())
    store.resetLocal()
    finishDownscale(new Blob(['x']))
    await pending

    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('refuses and offers a retry when nobody is signed in', async () => {
    currentUserId = undefined
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()

    await store.uploadBackground(photo())

    expect(uploadMock).not.toHaveBeenCalled()
    expect(notifyMock).toHaveBeenCalled()
  })
})

describe('clearBackground', () => {
  it('returns to the bundled default and removes the stored object', async () => {
    const { useV2AppearanceStore, DEFAULT_BACKGROUND } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue({
      backgroundPath: 'user-1/old.jpg',
      scrimOpacity: 0.3,
      shownTabKeys: null,
      notifyOnMemberEvents: true
    })
    await store.loadFromRemote()

    await store.clearBackground()

    expect(store.backgroundImage).toBe(DEFAULT_BACKGROUND)
    expect(saveMock.mock.calls[0]?.[0]).toMatchObject({ backgroundPath: null })
    expect(deleteMock).toHaveBeenCalledWith('user-1/old.jpg')
  })

  it('leaves the scrim opacity untouched', async () => {
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue({
      backgroundPath: 'user-1/old.jpg',
      scrimOpacity: 0.3,
      shownTabKeys: null,
      notifyOnMemberEvents: true
    })
    await store.loadFromRemote()

    await store.clearBackground()

    expect(store.scrimOpacity).toBe(0.3)
  })

  it('restores the photo and warns when the save fails', async () => {
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue({
      backgroundPath: 'user-1/old.jpg',
      scrimOpacity: 0.3,
      shownTabKeys: null,
      notifyOnMemberEvents: true
    })
    await store.loadFromRemote()
    saveMock.mockRejectedValueOnce(new Error('boom'))

    await store.clearBackground()

    expect(store.backgroundImage).toBe('https://cdn.test/user-1/old.jpg')
    expect(notifyMock).toHaveBeenCalled()
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it('has a hasCustomBackground flag driving the button visibility', async () => {
    const { useV2AppearanceStore } = await importStore()
    const store = useV2AppearanceStore()
    fetchMock.mockResolvedValue({
      backgroundPath: 'user-1/old.jpg',
      scrimOpacity: 0.3,
      shownTabKeys: null,
      notifyOnMemberEvents: true
    })
    await store.loadFromRemote()
    expect(store.hasCustomBackground).toBe(true)

    await store.clearBackground()
    expect(store.hasCustomBackground).toBe(false)
  })
})
