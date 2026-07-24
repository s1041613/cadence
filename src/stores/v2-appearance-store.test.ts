import { afterEach, describe, expect, it, vi } from 'vitest'

describe('v2-appearance-store', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('uses the configured public base for the default background image', async () => {
    vi.stubEnv('BASE_URL', '/cadence/')
    vi.resetModules()

    const { DEFAULT_BACKGROUND } = await import('./v2-appearance-store')

    expect(DEFAULT_BACKGROUND).toBe('/cadence/v2-backgrounds/default.jpg')
  })
})
