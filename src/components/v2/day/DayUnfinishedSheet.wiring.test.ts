import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'

/**
 * Pins the decisions behind the unfinished sheet that a diff cannot show and a later edit
 * would quietly undo. Source-reading rather than mounting, for the reason the sibling
 * Pv2EventBlock tests give: vitest runs `environment: 'node'` (vitest.config.ts).
 */
let sheet = ''
let header = ''
let page = ''
let view = ''

beforeAll(async () => {
  const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8')
  ;[sheet, header, page, view] = await Promise.all([
    read('./DayUnfinishedSheet.vue'),
    read('../ui/Pv2DayHeader.vue'),
    read('../../../pages/DayPageV2.vue'),
    read('./DayViewV2.vue')
  ])
})

/** The declaration body of one rule, matched on a selector anchored to a line start. */
function rule(src: string, selector: string): string {
  const start = src.search(new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{`, 'm'))
  expect(start, `rule not found: ${selector}`).toBeGreaterThan(-1)
  return src.slice(start, src.indexOf('}', start))
}

describe('the sheet opens at one fixed height', () => {
  it('is half the frame, not a height derived from its contents', () => {
    expect(rule(sheet, '.du2')).toMatch(/height:\s*50%/)
    expect(rule(sheet, '.du2')).not.toMatch(/fit-content|max-height|min-height/)
  })

  it('measures that against the frame, never the window', () => {
    // The scrim is absolute inside #dp2-root, and on desktop that frame is a fixed 393x852
    // device shell inside a far taller window — vh here would overflow the phone.
    expect(rule(sheet, '.du2')).not.toMatch(/\d+vh/)
  })

  it('matches Pv2DaySheet rather than sitting a few points off it', async () => {
    const daySheet = await readFile(new URL('../ui/Pv2DaySheet.vue', import.meta.url), 'utf8')
    expect(rule(daySheet, '.pv2-ds')).toMatch(/height:\s*50%/)
  })

  it('scrolls the list inside that height instead of growing', () => {
    expect(rule(sheet, '.du2__list')).toMatch(/overflow-y:\s*auto/)
  })
})

describe('every overdue task is in it', () => {
  it('renders the buckets whole — nothing sliced, capped or collapsed', () => {
    expect(sheet).toMatch(/v-for="task in bucket\.items"/)
    expect(sheet).not.toMatch(/\.slice\(|查看全部|v-if="expanded/)
  })

  it('keeps group headings visible while their rows scroll past', () => {
    expect(rule(sheet, '.du2__group')).toMatch(/position:\s*sticky/)
  })

  it('offers no single button that sweeps every bucket into the day at once', () => {
    // Bulk is reachable, but only through a selection the user made.
    expect(sheet).not.toMatch(/全部移到/)
    expect(sheet).toMatch(/selectedTasks/)
  })
})

describe('destructive and reversible actions are told apart', () => {
  it('confirms a delete in the row, and a bulk delete in the footer', () => {
    expect(sheet).toMatch(/confirmId === task\.id/)
    expect(sheet).toMatch(/v-if="bulkConfirm"/)
  })

  it('never asks through a native dialog', () => {
    expect(sheet).not.toMatch(/window\.confirm|alert\(/)
  })

  it('reports a move with an undo that saves the snapshots back', () => {
    expect(sheet).toMatch(/const before = list\.map/)
    expect(sheet).toMatch(/notifyUndo\([\s\S]*?tasksStore\.saveTask\(task\)/)
  })
})

describe('accent text uses the readable ink', () => {
  // --pv2-accent is 3.1:1 on the canvas; every accent role below carries text or a numeral.
  it.each(['.du2__mode', '.du2__group-action', '.du2__confirm-ok', '.du2__bulk'])('%s', (selector) => {
    expect(rule(sheet, selector)).toMatch(/--pv2-accent-ink/)
  })

  it('applies to the header count too', () => {
    expect(rule(header, '.pv2-dh__unfinished--on')).toMatch(/--pv2-accent-ink/)
  })
})

describe('the control and its target', () => {
  it('draws no pill when nothing is overdue', () => {
    expect(header).toMatch(/v-if="unfinishedCount > 0"/)
  })

  it('shows the real count rather than a saturating badge', () => {
    // The template prints the number straight through: no clamp, no "9+" substitution.
    expect(header).toMatch(/pv2-dh__unfinished-count">\{\{ unfinishedCount \}\}</)
    expect(header).not.toMatch(/Math\.min\(/)
  })

  it('keeps a 44px touch target under a 28px capsule', () => {
    expect(rule(header, '.pv2-dh__unfinished')).toMatch(/height:\s*28px/)
    expect(rule(header, '.pv2-dh__unfinished::after')).toMatch(/height:\s*44px/)
  })

  it('teleports to an id the page actually renders', () => {
    expect(view).toMatch(/to="#dp2-root"/)
    expect(page).toMatch(/id="dp2-root"/)
  })
})
