import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'

/**
 * Pins the decisions behind the to-do sheet that a diff cannot show and a later edit would
 * quietly undo. Source-reading rather than mounting, as the sibling DayUnfinishedSheet test does:
 * vitest runs `environment: 'node'`.
 */
let sheet = ''
let view = ''
let composer = ''
let header = ''

beforeAll(async () => {
  const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8')
  ;[sheet, view, composer, header] = await Promise.all([
    read('./DayTodoSheet.vue'),
    read('./DayViewV2.vue'),
    read('../../shell/EventComposerOverlay.vue'),
    read('../ui/Pv2DayHeader.vue')
  ])
})

function rule(src: string, selector: string): string {
  const start = src.search(new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{`, 'm'))
  expect(start, `rule not found: ${selector}`).toBeGreaterThan(-1)
  return src.slice(start, src.indexOf('}', start))
}

describe('the sheet opens at one fixed height', () => {
  it('is 70% of the frame — taller than the other day sheets, on purpose', () => {
    expect(rule(sheet, '.dt2')).toMatch(/height:\s*70%/)
    expect(rule(sheet, '.dt2')).not.toMatch(/fit-content|max-height|min-height|\d+vh/)
  })

  it('scrolls the list inside that height instead of growing', () => {
    expect(rule(sheet, '.dt2__list')).toMatch(/overflow-y:\s*auto/)
  })
})

describe('writing a list', () => {
  it('takes many lines at once and makes each one a todo', () => {
    expect(sheet).toMatch(/<textarea/)
    expect(sheet).toMatch(/store\.addLines\(props\.date, draft\.value\)/)
    expect(sheet).toMatch(/ADD \{\{ pending \}\}/)
  })

  it('labels the interface in English', () => {
    expect(sheet).toMatch(/>TO-DO</)
    expect(sheet).toMatch(/'CARRIED OVER'/)
    expect(sheet).toMatch(/placeholder="list\.length \? 'Add…'/)
  })
})

describe('the three things you do to a todo', () => {
  it('deletes with an always-visible ×, not a hover-only one or a swipe', () => {
    expect(sheet).toMatch(/class="dt2__del"/)
    expect(rule(sheet, '.dt2__del')).not.toMatch(/opacity:\s*0/)
  })

  it('schedules with a swipe right that uncovers a light-rose circle holding the task icon', () => {
    const btn = rule(sheet, '.dt2__schedule')
    expect(btn).toMatch(/border-radius:\s*50%/)
    expect(btn).toMatch(/rgba\(var\(--pv2-accent-rgb\), 0\.12\)/)
    expect(btn).toMatch(/--pv2-accent-ink/)
    // The four-square task glyph, the one Pv2TypeSwitch uses.
    expect(sheet.match(/<rect x="(4|13)" y="(4|13)" width="7" height="7" rx="2" \/>/g)).toHaveLength(4)
  })

  it('leaves vertical movement to the list scroll', () => {
    expect(rule(sheet, '.dt2__row')).toMatch(/touch-action:\s*pan-y/)
  })
})

describe('scheduling hands the todo to the task composer', () => {
  it('opens the composer as a task on the todo\'s day, closing the sheet first', () => {
    expect(view).toMatch(/dayTodosStore\.beginSchedule\(todo\.id\)/)
    expect(view).toMatch(/todoOpen\.value = false\s*\n\s*ui\.eventComposerInitialValues = \{\s*\n\s*date: todo\.date,\s*\n\s*title: todo\.title,\s*\n\s*type: 'quadrant'/)
  })

  it('removes the todo on save and leaves it on cancel', () => {
    expect(composer).toMatch(/function trySave[\s\S]*?dayTodosStore\.completeSchedule\(\)/)
    expect(composer).toMatch(/function close\(\)[\s\S]*?dayTodosStore\.cancelSchedule\(\)/)
  })
})

describe('the header control', () => {
  it('sits in the capsule with the wallpaper toggle and the overdue control, icon only', () => {
    const cap = header.slice(header.indexOf('class="pv2-dh__cap"'), header.indexOf('<Pv2HeaderNav'))
    expect(cap).toMatch(/<Pv2BackdropToggle bare/)
    expect(cap).toMatch(/emit\('toggleTodo'\)/)
    expect(cap).toMatch(/emit\('toggleUnfinished'\)/)
    expect(cap).not.toMatch(/\{\{/)
  })

  it('opens one sheet at a time', () => {
    expect(view).toMatch(/function toggleTodo\(\): void \{\s*\n\s*unfinishedOpen\.value = false/)
    expect(view).toMatch(/function toggleUnfinished\(\): void \{\s*\n\s*todoOpen\.value = false/)
  })
})
