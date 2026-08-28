import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'

/**
 * Guards --pv2-nav-h against the bottom nav's real box.
 *
 * Pv2BottomNav is a floating overlay, so nothing in the layout reserves space for
 * it: every FAB and every scrolling pane clears it by hand off --pv2-nav-h. That
 * makes the token a duplicate of the nav's geometry, and a duplicate that drifts
 * silently — the pane still renders, it just runs under the pill, and the FAB
 * still renders, it just sits on top of it. Which is exactly what happened: the
 * token's arithmetic omitted .pv2-nav__item's own 8px/8px padding, so it came out
 * 15px short and the FAB's nominal 16px gap resolved to 1px.
 *
 * vitest runs `environment: 'node'` (vitest.config.ts) with no DOM, so the nav
 * can't be mounted and computed styles can't be read. Instead this recomputes the
 * sum from the component's own declarations and compares it to the token. Only
 * the label's line box can't be read off the source — 9px in the display face,
 * measured in Chromium against the bundled Inter — so it stays a named constant
 * here. Re-measure it if --cd-font-display or the label's size changes; it is the
 * one number in the sum that a font swap moves without touching any declaration.
 */

const LABEL_LINE = 11

let nav = ''
let fab = ''
let tokens = ''

beforeAll(async () => {
  nav = await readFile(new URL('./Pv2BottomNav.vue', import.meta.url), 'utf8')
  fab = await readFile(new URL('./Pv2Fab.vue', import.meta.url), 'utf8')
  tokens = await readFile(new URL('../../../css/cadence-tokens.css', import.meta.url), 'utf8')
})

/**
 * Pull one declaration out of a scoped-CSS rule block.
 * Anchored to a line start so `.pv2-nav` can't match `.pv2-nav__item`.
 */
function decl(source: string, selector: string, prop: string): string | undefined {
  const start = source.search(new RegExp(`^\\${selector} \\{`, 'm'))
  if (start === -1) return undefined
  const block = source.slice(start, source.indexOf('}', start))
  return block.match(new RegExp(`(?:^|[;{]|\\*/)\\s*${prop}:\\s*([^;]+);`, 'm'))?.[1]?.trim()
}

/** First px length in a declaration, e.g. `10px 10px` → 10, `1px solid …` → 1. */
function px(value: string | undefined): number {
  const n = value?.match(/(-?[\d.]+)px/)?.[1]
  expect(n, `expected a px length in ${JSON.stringify(value)}`).toBeDefined()
  return parseFloat(n as string)
}

/** A bare `--token: 14px;` declaration from the token sheet. */
function token(name: string): number {
  return px(tokens.match(new RegExp(`\\s${name}:\\s*([^;]+);`))?.[1])
}

/** Vertical padding of a shorthand: `10px 10px` → 10, `8px 4px` → 8, `10px` → 10. */
function padY(value: string | undefined): number {
  return px(value)
}

describe('Pv2BottomNav · clearance token matches the rendered pill', () => {
  it('builds the pill height from the nav box, the button box and the label line', () => {
    // Sum the same boxes the browser stacks: nav padding + border around a single
    // implicit grid row whose height is the tab button's own content box.
    const navPadY = padY(decl(nav, '.pv2-nav', 'padding'))
    const navBorder = px(decl(nav, '.pv2-nav', 'border'))
    const itemPadY = padY(decl(nav, '.pv2-nav__item', 'padding'))
    const iconH = px(decl(nav, '.pv2-nav__icon', 'height'))
    const itemGap = px(decl(nav, '.pv2-nav__item', 'gap'))

    const buttonH = itemPadY * 2 + iconH + itemGap + LABEL_LINE
    const pillH = navPadY * 2 + navBorder * 2 + buttonH

    expect(token('--pv2-nav-pill-h')).toBe(pillH)
  })

  it('anchors the pill off the same inset the clearance token is built from', () => {
    // If the nav restated its floating margin as a literal, moving one and not the
    // other would slide the pill out from under everything that clears it.
    expect(decl(nav, '.pv2-nav', 'bottom')).toBe(
      'calc(var(--pv2-nav-inset) + env(safe-area-inset-bottom, 0px))'
    )
  })

  it('sums the clearance as inset + pill + the home-indicator inset', () => {
    const value = tokens.match(/\s--pv2-nav-h:\s*([^;]+);/)?.[1]
    expect(value).toBe(
      'calc(var(--pv2-nav-inset) + var(--pv2-nav-pill-h) + env(safe-area-inset-bottom, 0px))'
    )
  })
})

describe('Pv2Fab · sits clear of the nav on every view that shows one', () => {
  it('derives its own offset from the clearance token, not a literal', () => {
    expect(decl(fab, '.pv2-fab', 'bottom')).toBe('calc(var(--pv2-nav-h) + var(--pv2-fab-gap))')
    expect(token('--pv2-fab-gap')).toBeGreaterThan(0)
  })

  it('leaves that offset to the component instead of per-view overrides', async () => {
    // Day, Week and Notebook each carried an identical `bottom:` override, so the
    // nav's box could only be re-cleared by finding all three. One home now.
    const views = await Promise.all(
      ['../day/DayViewV2.vue', '../week/WeekViewV2.vue', '../notebook/NotebookViewV2.vue'].map((p) =>
        readFile(new URL(p, import.meta.url), 'utf8')
      )
    )
    for (const view of views) {
      expect(view).toContain('<Pv2Fab')
      expect(view).not.toMatch(/^\.\w+__fab \{/m)
    }
  })
})
