import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBreakpoint } from './use-breakpoint'

describe('useBreakpoint', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(min-width: 900px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  })

  it('reflects the current matchMedia result', () => {
    const { isDesktop } = useBreakpoint()
    expect(isDesktop.value).toBe(true)
  })
})
