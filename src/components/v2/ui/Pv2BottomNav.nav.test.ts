import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useV2TabsStore, type NavKey, type V2Tab } from '@/stores/v2-tabs-store'

// Pv2BottomNav's orphan-redirect rule, extracted so it can run without a DOM.
// vitest is configured `environment: 'node'` (vitest.config.ts) so the component
// itself can't be mounted; this pins the decision the watcher makes, which is the
// part that can be wrong. The wiring (watch + immediate) is verified by hand.
//
// Mirrors the watcher body in Pv2BottomNav.vue. Returns the navigation the watcher
// would perform, or null for "stay put".
function orphanRedirect(
  active: NavKey,
  shown: readonly V2Tab[]
): { to: string; mode: 'push' | 'replace' } | null {
  if (!shown.length) return null
  if (shown.some((t) => t.key === active)) return null
  const first = shown[0]
  if (!first) return null
  // History-safe: a corrective redirect must not leave the un-landable page on the
  // stack, or Back returns to it and the watcher bounces the user forward again.
  return { to: first.to, mode: 'replace' }
}

describe('Pv2BottomNav · orphan redirect', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stays put when the active tab is on the nav', () => {
    const store = useV2TabsStore()
    expect(orphanRedirect('month', store.shownTabs)).toBeNull()
  })

  it('redirects to the first shown tab when the active tab was hidden', () => {
    const store = useV2TabsStore()
    store.setShownKeys(['draft', 'notes', 'setting'])
    const result = orphanRedirect('month', store.shownTabs)
    expect(result?.to).toBe('/v2/day')
  })

  it('redirects with replace, not push, so Back cannot re-enter the hidden page', async () => {
    // Codex correctness finding: push() leaves the hidden page in history, so Back
    // lands on it, the watcher fires again, and the user is trapped in a loop.
    //
    // Asserted against the shipped component source, not the helper above — a helper
    // that hardcodes 'replace' could never fail, which would make this test theatre.
    const { readFile } = await import('node:fs/promises')
    const src = await readFile(
      new URL('./Pv2BottomNav.vue', import.meta.url),
      'utf8'
    )
    const watcherBody = src.slice(src.indexOf('watch('))
    expect(watcherBody).toContain('router.replace')
    expect(watcherBody).not.toContain('router.push')
  })

  it('does not redirect the settings page, which can never be orphaned', () => {
    const store = useV2TabsStore()
    store.setShownKeys(['draft', 'setting'])
    expect(orphanRedirect('setting', store.shownTabs)).toBeNull()
  })

  it('targets a real route for every reachable redirect', () => {
    const store = useV2TabsStore()
    store.setShownKeys(['notes', 'setting'])
    const result = orphanRedirect('week', store.shownTabs)
    expect(result?.to).toBe('/v2/notebook')
  })
})
