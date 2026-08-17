import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'

/**
 * Guards the month sheet's open/close transition.
 *
 * vitest runs `environment: 'node'` (vitest.config.ts) with no @vue/test-utils,
 * so the sheet can't be mounted and the animation itself can only be judged on
 * a device. What IS checkable here is the handful of structural conditions the
 * transition rests on — and each of them fails SILENTLY when broken, which is
 * exactly why they earn a test:
 *
 *  - backdrop on the root instead of ::before → the scoped rule outranks the
 *    transition class and the start state never applies; the sheet just appears
 *  - a positioned ::before without the matching position:relative on the panel
 *    → the backdrop paints over the sheet, dimming it and eating its taps
 *  - a :duration that disagrees with --cd-duration-sheet → the leave is cut off
 *    partway or the node is left in the DOM
 *
 * All three were found by review on the day sheet (PR #64) before it shipped;
 * this file stops the month sheet from re-earning them.
 */

let sheet = ''
let monthView = ''
let tokens = ''

beforeAll(async () => {
  sheet = await readFile(new URL('./Pv2MonthSheet.vue', import.meta.url), 'utf8')
  monthView = await readFile(new URL('../month/MonthViewV2.vue', import.meta.url), 'utf8')
  tokens = await readFile(new URL('../../../css/cadence-tokens.css', import.meta.url), 'utf8')
})

/**
 * Pull one declaration out of a scoped-CSS rule block.
 * Anchored to a line start so `.pv2-sheet` can't match `.pv2-sheet-scrim`.
 */
function decl(source: string, selector: string, prop: string): string | undefined {
  const start = source.search(new RegExp(`^\\${selector} \\{`, 'm'))
  if (start === -1) return undefined
  const block = source.slice(start, source.indexOf('}', start))
  return block.match(new RegExp(`\\b${prop}:\\s*([^;]+);`))?.[1]?.trim()
}

describe('Pv2MonthSheet · backdrop carried by the pseudo-element', () => {
  it('keeps the backdrop off the transition root', () => {
    // The root is what Vue puts .pv2-sheet-enter-from on. A background declared
    // here lands on `.pv2-sheet-scrim[data-v-x]` (0,2,0), which outranks the
    // transition class (0,1,0) — the start state is then silently ignored.
    expect(decl(sheet, '.pv2-sheet-scrim', 'background')).toBeUndefined()
  })

  it('paints the backdrop on ::before at the day sheet value', () => {
    // Same value as Pv2DaySheet so the two sheets read as one system.
    expect(decl(sheet, '.pv2-sheet-scrim::before', 'background')).toBe('rgba(27, 27, 27, 0.32)')
  })
})

describe('Pv2MonthSheet · the ::before stacking fix, both halves', () => {
  it('makes the backdrop transparent to hit-testing AND lifts the panel above it', () => {
    // Deliberately one `it`: a positioned generated box paints above a
    // non-positioned sibling, so fixing only one half still leaves the panel
    // dimmed or its buttons dead. Both or neither.
    expect(decl(sheet, '.pv2-sheet-scrim::before', 'pointer-events')).toBe('none')
    expect(decl(sheet, '.pv2-sheet', 'position')).toBe('relative')
  })
})

describe('Pv2MonthSheet · transition wiring', () => {
  it('wraps the sheet in the shared pv2-sheet transition with an explicit duration', () => {
    // Neither animated layer is the transition root (backdrop is a ::before,
    // panel is a child), so Vue can neither infer the duration from the root's
    // computed style nor ever see a transitionend whose target is the root.
    // Without :duration the leave never completes and the node stays mounted.
    const mount = monthView.match(/<Transition name="pv2-sheet"[^>]*>\s*<Pv2MonthSheet/)
    expect(mount, 'Pv2MonthSheet must be wrapped in <Transition name="pv2-sheet">').not.toBeNull()
    expect(mount?.[0]).toMatch(/:duration="300"/)
  })

  it('keeps that duration equal to --cd-duration-sheet', () => {
    // The hardcoded 300 duplicates the token; this is what stops them drifting.
    const token = tokens.match(/--cd-duration-sheet:\s*([\d.]+)s;/)?.[1]
    expect(token, '--cd-duration-sheet must be declared in seconds').toBeDefined()
    expect(parseFloat(token as string) * 1000).toBe(300)
  })

  it('keeps the transition inside the Teleport so `defer` still resolves the target', () => {
    // MonthViewV2 documents why the Teleport needs `defer`: #mp2-root is
    // rendered by an ancestor, and a week→month remount otherwise leaves the
    // Teleport holding a stale node. Hoisting the Transition outside would
    // reintroduce that ordering problem.
    const teleport = monthView.match(/<Teleport defer to="#mp2-root">\s*<Transition name="pv2-sheet"/)
    expect(teleport, '<Transition> must sit inside <Teleport defer>').not.toBeNull()
  })
})
