import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'

/**
 * Pins the day block's completion checkbox to the four decisions that are invisible in a diff
 * and expensive to get back once they rot.
 *
 * Same source-reading approach as Pv2EventBlock.layout.test.ts, and for the same reason:
 * vitest runs `environment: 'node'` (vitest.config.ts), so nothing here can be mounted or
 * measured. What can be checked is that the component still says what it is supposed to say.
 */

let block = ''
let grid = ''
let icons = ''

beforeAll(async () => {
  block = await readFile(new URL('./Pv2EventBlock.vue', import.meta.url), 'utf8')
  grid = await readFile(new URL('./Pv2TimeGrid.vue', import.meta.url), 'utf8')
  icons = await readFile(new URL('../../ui/icons.ts', import.meta.url), 'utf8')
})

/** The declaration body of one rule, matched on a selector anchored to a line start. */
function rule(selector: string): string {
  const start = block.search(new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{`, 'm'))
  expect(start, `rule not found: ${selector}`).toBeGreaterThan(-1)
  return block.slice(start, block.indexOf('}', start))
}

function pxDecl(selector: string, prop: string): number {
  const m = new RegExp(`${prop}:\\s*(\\d+)px`).exec(rule(selector))
  expect(m, `no ${prop} in ${selector}`).not.toBeNull()
  return Number(m![1])
}

function constant(name: string): number {
  const m = new RegExp(`const ${name} = (\\d+)`).exec(block)
  expect(m, `constant not found: ${name}`).not.toBeNull()
  return Number(m![1])
}

describe('the checkbox costs the block no vertical space', () => {
  // This is what keeps Pv2EventBlock.layout.test.ts's whole row budget valid. The button is a
  // title LINE BOX tall and centres the circle inside it, so the head occupies exactly what it
  // did before the checkbox existed. Give the button a height of its own — or drop it onto the
  // head with a margin — and every tier threshold above it starts lying about what fits.
  it('the button is one small title line box tall', () => {
    expect(pxDecl('.pv2-event-block__check', 'height')).toBe(constant('TITLE_LH_SM'))
  })

  // One title line box, and only one: no tier-scoped rule may give the button a height of its
  // own, or the row budget starts lying about what fits.
  it('no tier overrides the button height', () => {
    const heights = block.match(/^\.pv2-event-block[^{]*__check \{[^}]*height:/gm) ?? []
    expect(heights).toHaveLength(1)
  })
})

describe('what the checkbox is, and who gets one', () => {
  it('only a task renders one', () => {
    // `v-if="done"` would compile and look right on a finished task, and would put a checkbox
    // on every calendar event that has ever been checked by something else.
    expect(block).toMatch(/class="pv2-event-block__check"[\s\S]{0,400}?v-if="isTask"|v-if="isTask"[\s\S]{0,400}?class="pv2-event-block__check"/)
  })

  // A stroke weight CdIcon has no variant file for resolves to the 2.0 base silently — no
  // error, no warning, just a thinner mark than the one that was asked for. icons.ts is the
  // list of weights that actually exist; the checkbox must pass one of them.
  it('the checkmark asks for a stroke weight that check.svg actually ships', () => {
    const asked = /name="check"[^>]*?:stroke-width="([\d.]+)"/.exec(block)
    expect(asked, 'no stroke-width on the checkmark').not.toBeNull()
    const weights = /check:\s*\{[\s\S]*?weights:\s*\{([^}]*)\}/.exec(icons)
    expect(weights, 'no weights map for check in icons.ts').not.toBeNull()
    const shipped = [...weights![1]!.matchAll(/'([\d.]+)'/g)].map((m) => m[1]!)
    expect(shipped).toContain(asked![1]!)
  })

  it('it is a circle', () => {
    expect(rule('.pv2-event-block__box')).toMatch(/border-radius:\s*50%/)
  })

  it('checking does not also open the preview card', () => {
    // The block's own click emits `click`, which the page turns into the preview popover. One
    // tap must not both settle the task and open a card over it.
    expect(block).toMatch(/@click\.stop="emit\('toggleDone'\)"/)
  })

  it("a task you do not own shows its state but cannot be written", () => {
    expect(block).toMatch(/:disabled="!canToggle"/)
  })
})

describe('done and in-progress cannot both be true', () => {
  it('the grid stops marking a finished task in progress', () => {
    // Otherwise a task checked off early keeps its ring and goes on counting down "18 min left"
    // under a struck-through title.
    expect(grid).toMatch(/props\.nowMinutes < ev\.end && !done/)
  })

  it('--done is declared after --active, which is what decides the collision', () => {
    // Both are one class deep, so specificity cannot separate them — source order does. If
    // --done moves above --active, a finished block keeps the active time treatment.
    const done = block.indexOf('.pv2-event-block--done .pv2-event-block__time')
    const active = block.indexOf('.pv2-event-block--active .pv2-event-block__time')
    expect(done).toBeGreaterThan(-1)
    expect(active).toBeGreaterThan(-1)
    expect(done).toBeGreaterThan(active)
  })
})
