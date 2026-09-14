import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'
import { CELL } from '@/utils/month-lanes'

/**
 * Guards CELL.moreBottom against where Pv2Cell actually pins its "+N" label.
 *
 * moreNeedsLane decides whether an overflowing week keeps all its lanes or gives one up, and it
 * decides it by asking whether the last lane's chip reaches into the band the label occupies. The
 * band is described twice — once as CSS here, once as a number in month-lanes' CELL — and a drift
 * between them is silent: the row still renders, the label is just drawn through by a chip, or a
 * lane is surrendered for clearance that was never needed.
 *
 * vitest runs `environment: 'node'` (vitest.config.ts), so the cell can't be mounted and computed
 * styles can't be read; this recomputes the offset from the component's own declarations instead.
 * The label's line box is the one number no declaration carries — 8px mono at normal
 * line-height, measured in Chromium — so it stays a named constant, as in
 * Pv2BottomNav.clearance.test.ts. Re-measure it if .pv2-cell__more's font changes.
 */

const LABEL_LINE = 10

let cell = ''

beforeAll(async () => {
  cell = await readFile(new URL('./Pv2Cell.vue', import.meta.url), 'utf8')
})

/** Pull one declaration out of a scoped-CSS rule block. Anchored so `.pv2-cell` can't match
 *  `.pv2-cell__more`. */
function decl(selector: string, prop: string): string | undefined {
  const start = cell.search(new RegExp(`^\\${selector} \\{`, 'm'))
  if (start === -1) return undefined
  const block = cell.slice(start, cell.indexOf('}', start))
  return block.match(new RegExp(`(?:^|[;{]|\\*/)\\s*${prop}:\\s*([^;]+);`, 'm'))?.[1]?.trim()
}

const px = (v: string | undefined): number => Number(v?.match(/(-?[\d.]+)px/)?.[1])

describe('Pv2Cell "+N" geometry', () => {
  // The label is inset from the cell's PADDING box, which the bottom border sits outside of, so
  // its distance from the row's bottom edge is the inset plus that border — the two terms
  // CELL.moreBottom stands for.
  it('matches CELL.moreBottom to the label inset plus the cell border', () => {
    const inset = px(decl('.pv2-cell__more', 'bottom'))
    const border = px(decl('.pv2-cell', 'border-bottom'))

    expect(inset).toBeGreaterThan(0)
    expect(border).toBeGreaterThan(0)
    expect(CELL.moreBottom).toBe(inset + border)
  })

  it('matches CELL.moreH to the measured label line box', () => {
    expect(CELL.moreH).toBe(LABEL_LINE)
  })

  // The whole point of the pair: the label costs the row no layout height, which is only true
  // while it stays absolutely positioned. If it ever rejoins the flow, moreNeedsLane's answer is
  // wrong on every row rather than on an edge case.
  it('keeps the label out of the cell\'s layout flow', () => {
    expect(decl('.pv2-cell__more', 'position')).toBe('absolute')
  })
})
