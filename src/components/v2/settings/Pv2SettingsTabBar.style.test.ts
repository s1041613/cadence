import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'

// vitest runs `environment: 'node'` (vitest.config.ts) so the component can't be
// mounted and computed styles can't be read. These assertions pin the handful of
// spec'd values that are easy to drift on silently — everything else about the
// visual result is verified by eye in the browser.

let src = ''

beforeAll(async () => {
  src = await readFile(new URL('./Pv2SettingsTabBar.vue', import.meta.url), 'utf8')
})

/**
 * Pull one declaration out of a scoped-CSS rule block.
 * Anchored to a line start so `.pv2-tabs__row` can't match `.pv2-tabs__row--divided`.
 */
function decl(selector: string, prop: string): string | undefined {
  const start = src.search(new RegExp(`^\\${selector} \\{`, 'm'))
  if (start === -1) return undefined
  const block = src.slice(start, src.indexOf('}', start))
  return block.match(new RegExp(`\\b${prop}:\\s*([^;]+);`))?.[1]?.trim()
}

describe('Pv2SettingsTabBar · spec values', () => {
  it('sizes the save button at the spec 32px circle', () => {
    expect(decl('.pv2-tabs__save', 'width')).toBe('32px')
    expect(decl('.pv2-tabs__save', 'height')).toBe('32px')
  })

  it('sets the hint line in the mono face the spec calls for', () => {
    // Spec: hint is `400 11px mono #9c9c9c` — the settings pages use mono for this
    // register, so --cd-font-ui here would read as a different typographic voice.
    expect(decl('.pv2-tabs__hint', 'font')).toContain('--cd-font-mono')
  })

  it('keeps the row height locked to the drag maths constant', () => {
    // ROW_H in the script and this height must agree, or drag reordering lands
    // rows on the wrong index. box-sizing absorbs the 1px divider.
    expect(decl('.pv2-tabs__row', 'height')).toBe('60px')
    expect(decl('.pv2-tabs__row', 'box-sizing')).toBe('border-box')
    expect(src).toMatch(/const ROW_H = 60\b/)
  })

  it('confines touch-action to the drag handle so the pane still scrolls', () => {
    expect(decl('.pv2-tabs__handle', 'touch-action')).toBe('none')
    expect(decl('.pv2-tabs__scroll', 'touch-action')).toBeUndefined()
    expect(decl('.pv2-tabs__row', 'touch-action')).toBeUndefined()
  })

  it('handles pointercancel so an interrupted drag cannot stick', () => {
    expect(src).toContain('@pointercancel="onHandleUp"')
  })
})
