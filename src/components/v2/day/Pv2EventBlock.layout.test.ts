import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'

/**
 * Pins Pv2EventBlock's layout arithmetic to the stylesheet it is derived from.
 *
 * The block chooses its tier — and how many detail rows it can afford — from constants that
 * RESTATE CSS line boxes in JS (PAD_Y, TITLE_LH_SM, META_LH …). vitest runs `environment:
 * 'node'` (vitest.config.ts) so the component can't be mounted and the real line boxes can't
 * be measured; what can be checked is that the two copies still agree. A font size nudged in
 * the stylesheet without its constant is the whole failure mode: the head silently grows past
 * the height the tier threshold promised it, and the last detail row renders clipped in half.
 *
 * The row-budget cases at the bottom are the behavioural half — a one-hour event affording its
 * single detail line survives by 1px, which is exactly the kind of margin that disappears in a
 * refactor without anyone noticing.
 */

let src = ''

beforeAll(async () => {
  src = await readFile(new URL('./Pv2EventBlock.vue', import.meta.url), 'utf8')
})

/** The declaration body of one rule, matched on a selector anchored to a line start. */
function rule(selector: string): string {
  const start = src.search(new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{`, 'm'))
  expect(start, `rule not found: ${selector}`).toBeGreaterThan(-1)
  return src.slice(start, src.indexOf('}', start))
}

/** A JS constant's numeric value, read out of the <script setup> block. */
function constant(name: string): number {
  const m = new RegExp(`const ${name} = (\\d+)`).exec(src)
  expect(m, `constant not found: ${name}`).not.toBeNull()
  return Number(m![1])
}

/** The line-height half of a `font:` shorthand, e.g. `600 15px/19px …` -> 19. */
function fontLineHeight(selector: string): number {
  const m = /font:\s*\d+\s+\d+px\/(\d+)px/.exec(rule(selector))
  expect(m, `no font shorthand with a px line-height in ${selector}`).not.toBeNull()
  return Number(m![1])
}

function pxDecl(selector: string, prop: string): number {
  const m = new RegExp(`${prop}:\\s*(\\d+)px`).exec(rule(selector))
  expect(m, `no ${prop} in ${selector}`).not.toBeNull()
  return Number(m![1])
}

describe('layout constants mirror the stylesheet', () => {
  it('PAD_Y is the block padding, top and bottom', () => {
    const m = /padding:\s*(\d+)px\s+\d+px/.exec(rule('.pv2-event-block'))
    expect(m).not.toBeNull()
    expect(constant('PAD_Y')).toBe(Number(m![1]) * 2)
  })

  it('TITLE_LH_SM is the base title line box', () => {
    expect(constant('TITLE_LH_SM')).toBe(fontLineHeight('.pv2-event-block__title'))
  })

  it('TITLE_LH_LG is the tall title line box', () => {
    expect(constant('TITLE_LH_LG')).toBe(
      fontLineHeight('.pv2-event-block--tall .pv2-event-block__title')
    )
  })

  it('META_LH is the time line box', () => {
    expect(constant('META_LH')).toBe(fontLineHeight('.pv2-event-block__time'))
  })

  it('DETAIL_GAP is the detail list top margin', () => {
    const m = /margin:\s*(\d+)px\s/.exec(rule('.pv2-event-block__details'))
    expect(m).not.toBeNull()
    expect(constant('DETAIL_GAP')).toBe(Number(m![1]))
  })

  it('DETAIL_LINE_H is the fixed row height, not just the line-height', () => {
    // The row is given an explicit height so the budget below can count in whole rows; a row
    // sized only by its line-height drifts with the font and clips the last line.
    expect(constant('DETAIL_LINE_H')).toBe(pxDecl('.pv2-event-block__details li', 'height'))
  })
})

describe('tier thresholds are the heights each tier actually occupies', () => {
  // MIN_CONTENT_HEIGHT and REGULAR_MIN are written as these sums; the numbers on the right are
  // what they evaluate to today, so a font change that moves them fails here rather than
  // silently rendering a head taller than the block it was floored to.
  it('the compact floor is exactly its one-row head', () => {
    expect(constant('PAD_Y') + constant('TITLE_LH_SM')).toBe(31)
  })

  it('regular begins only once the stacked head fits', () => {
    expect(constant('PAD_Y') + constant('TITLE_LH_SM') + constant('META_LH')).toBe(47)
  })

  it('tall begins above its own head, leaving room for at least one detail row', () => {
    const tallHead = constant('PAD_Y') + constant('TITLE_LH_LG') + constant('META_LH')
    expect(constant('TALL_MIN')).toBeGreaterThanOrEqual(
      tallHead + constant('DETAIL_GAP') + constant('DETAIL_LINE_H')
    )
  })
})

describe('detail row budget at real block heights', () => {
  // Heights as Pv2TimeGrid computes them: (minutes / 60) * rowHeight - 2, at the default 68.
  const blockHeight = (minutes: number) => (minutes / 60) * 68 - 2

  function rowsFor(height: number): number {
    const h = Math.max(31, height)
    const head = h >= constant('TALL_MIN')
      ? constant('PAD_Y') + constant('TITLE_LH_LG') + constant('META_LH')
      : h >= 47
        ? 47
        : 31
    return Math.max(0, Math.floor((h - head - constant('DETAIL_GAP')) / constant('DETAIL_LINE_H')))
  }

  it('a 30-minute block stays one row: title and time only', () => {
    expect(blockHeight(30)).toBe(32)
    expect(rowsFor(blockHeight(30))).toBe(0)
  })

  it('a one-hour block still affords one detail line', () => {
    // 66px: 12 padding + 19 title + 16 time + 2 gap + 17 row = 66 exactly. Moving the time
    // onto its own row cost 16px, and this is what is left — it survives by nothing.
    expect(blockHeight(60)).toBe(66)
    expect(rowsFor(blockHeight(60))).toBe(1)
  })

  it('a four-hour block fills its height rather than leaving it blank', () => {
    expect(blockHeight(240)).toBe(270)
    expect(rowsFor(blockHeight(240))).toBe(12)
  })
})
