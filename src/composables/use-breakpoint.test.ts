import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * A tiny media-query evaluator, so these cases describe a DEVICE (width + primary
 * pointer) rather than restating the composable's own query strings back at it. It
 * understands only what the composable actually asks for — comma-separated
 * alternatives of `and`-joined (min-width:) / (max-width:) / (pointer:) clauses —
 * and throws on anything else, which is the point: a query form it can't evaluate
 * is a query whose behaviour this file is no longer testing.
 */
function matches(query: string, device: { width: number; pointer: 'fine' | 'coarse' }): boolean {
  return query.split(',').some((alternative) =>
    alternative.split(' and ').every((clause) => {
      const [, feature, value] = clause.trim().match(/^\((.+?):\s*(.+?)\)$/) ?? []
      if (feature === 'min-width') return device.width >= parseFloat(value as string)
      if (feature === 'max-width') return device.width <= parseFloat(value as string)
      if (feature === 'pointer') return device.pointer === value
      throw new Error(`unhandled media clause: ${clause}`)
    })
  )
}

/**
 * Fresh module per case: the composable's refs are module-level singletons seeded at import.
 *
 * `window` itself has to be stubbed, not just matchMedia: vitest runs environment: 'node'
 * (vitest.config.ts), so there is no window at all and every read would otherwise fall to the
 * composable's SSR defaults — which is what the previous single case was silently asserting.
 */
async function on(device: { width: number; pointer: 'fine' | 'coarse' }) {
  const matchMedia = (query: string) => ({
    matches: matches(query, device),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })
  vi.stubGlobal('window', { matchMedia })
  vi.stubGlobal('matchMedia', matchMedia)
  vi.resetModules()
  const { useBreakpoint } = await import('./use-breakpoint')
  return useBreakpoint()
}

describe('useBreakpoint', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.unstubAllGlobals())

  it('reflects the current matchMedia result', async () => {
    const { isDesktop } = await on({ width: 1440, pointer: 'fine' })
    expect(isDesktop.value).toBe(true)
  })

  it('subscribes to both queries, so rotating an iPad re-resolves the layout', async () => {
    // Rotating crosses 900px without remounting anything, and it flips only the desktop
    // query — the tablet band matches in both orientations. A ref left seeded at import
    // would strand the app on whichever layout it started in.
    const mqls: { query: string; on: ReturnType<typeof vi.fn> }[] = []
    vi.stubGlobal('window', {
      matchMedia: (query: string) => {
        const entry = { query, on: vi.fn() }
        mqls.push(entry)
        return { matches: false, media: query, addEventListener: entry.on, removeEventListener: vi.fn() }
      }
    })
    vi.resetModules()
    const { useBreakpoint } = await import('./use-breakpoint')
    const { isDesktop, layout } = useBreakpoint()

    // Each query is asked twice — once at import to seed the ref, once here to subscribe —
    // so it is the subscribed set, not the call count, that matters.
    const listening = mqls.filter((m) => m.on.mock.calls.length > 0)
    expect(listening.map((m) => m.query)).toHaveLength(2)
    for (const mql of listening) {
      expect(mql.on, `${mql.query} needs a change listener`).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      )
    }

    // Fire the desktop query's own listener, as a rotation past 900px would.
    expect(layout.value).toBe('phone')
    const desktop = listening.find((m) => m.query === '(min-width: 900px)')
    expect(desktop, 'the desktop query must be one of the subscribed ones').toBeDefined()
    const onChange = desktop!.on.mock.calls[0]![1] as (e: { matches: boolean }) => void
    onChange({ matches: true })
    expect(isDesktop.value).toBe(true)
    expect(layout.value).toBe('desktop')
  })

  it('leaves a phone on the phone layout', async () => {
    const { layout, isDesktop, isTablet } = await on({ width: 393, pointer: 'coarse' })
    expect(layout.value).toBe('phone')
    expect(isDesktop.value).toBe(false)
    expect(isTablet.value).toBe(false)
  })

  it('leaves a desktop browser on the device-frame layout', async () => {
    const { layout } = await on({ width: 1440, pointer: 'fine' })
    expect(layout.value).toBe('desktop')
  })

  it('puts a tablet in portrait on the tablet layout', async () => {
    const { layout } = await on({ width: 834, pointer: 'coarse' })
    expect(layout.value).toBe('tablet')
  })

  it('keeps a tablet in landscape off the device frame', async () => {
    // The regression this band exists for: 1024 (and 1366 on the 12.9") is above
    // --cd-bp-desktop, so a landscape iPad used to get the centred 393x852 phone mock
    // — whose 852px height the 768px-tall viewport then clipped, nav pill included.
    for (const width of [1024, 1194, 1366]) {
      const { layout, isDesktop } = await on({ width, pointer: 'coarse' })
      expect(isDesktop.value, `${width} still matches the desktop query`).toBe(true)
      expect(layout.value, `${width} should resolve to tablet`).toBe('tablet')
    }
  })

  it('keeps a narrowed desktop window on the tablet layout, so the band is reachable by resizing', async () => {
    const { layout } = await on({ width: 1000, pointer: 'fine' })
    expect(layout.value).toBe('tablet')
  })

  it('returns a wide fine-pointer window to the device frame', async () => {
    const { layout } = await on({ width: 1200, pointer: 'fine' })
    expect(layout.value).toBe('desktop')
  })
})
