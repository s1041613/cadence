import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createBackdropMode, useBackdropMode } from './use-backdrop-mode'
import { useV2AppearanceStore } from '@/stores/v2-appearance-store'
import * as service from '@/services/user-settings-service'

vi.mock('@/services/user-settings-service', () => ({
  fetchUserSettings: vi.fn(),
  saveUserSettings: vi.fn(),
  uploadBackground: vi.fn(),
  deleteBackground: vi.fn(),
  publicBackgroundUrl: (path: string) => `https://cdn.test/${path}`
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({ user: { id: 'user-1' } })
}))

const fetchMock = vi.mocked(service.fetchUserSettings)

// The suite runs without a DOM, so it exercises the mode object a page creates rather than
// mounting components. Provide/inject itself is Vue's; what matters here is the state rules.
async function setWallpaper(path: string | null): Promise<void> {
  fetchMock.mockResolvedValue({ backgroundPath: path, scrimOpacity: 0, shownTabKeys: null, notifyOnMemberEvents: true, notifyNightlyUnfinished: true })
  await useV2AppearanceStore().loadFromRemote()
}

describe('use-backdrop-mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('opens cute when the page has a wallpaper', async () => {
    const mode = createBackdropMode(true)
    await setWallpaper('u/1.jpg')
    expect(mode.available.value).toBe(true)
    expect(mode.cute.value).toBe(true)
  })

  it('the eye toggles between cute and clear', async () => {
    const mode = createBackdropMode(true)
    await setWallpaper('u/1.jpg')
    mode.toggle()
    expect(mode.clear.value).toBe(true)
    expect(mode.cute.value).toBe(false)
    mode.toggle()
    expect(mode.cute.value).toBe(true)
  })

  it('has nothing to toggle without a wallpaper', async () => {
    const mode = createBackdropMode(true)
    await setWallpaper(null)
    expect(mode.available.value).toBe(false)
    expect(mode.cute.value).toBe(false)
  })

  it('a fresh page starts cute again — the choice is not remembered', async () => {
    await setWallpaper('u/1.jpg')
    createBackdropMode(true).toggle()
    expect(createBackdropMode(true).cute.value).toBe(true)
  })

  it('outside a page that provides one (Week), the mode is neither cute nor clear', async () => {
    await setWallpaper('u/1.jpg')
    const app = createApp({})
    const mode = app.runWithContext(() => useBackdropMode())
    expect(mode.available.value).toBe(false)
    expect(mode.cute.value).toBe(false)
    expect(mode.clear.value).toBe(false)
  })
})
