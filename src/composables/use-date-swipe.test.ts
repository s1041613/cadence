import { describe, it, expect } from 'vitest'
import {
  resolveSwipeStep,
  resolveKeyStep,
  resolveSlideDirection,
  resolveDaySheetStep,
  type SwipeDetails,
  type KeyIntent
} from './use-date-swipe'

function key(k: string, overrides: Partial<KeyIntent> = {}): KeyIntent {
  return { key: k, hasModifier: false, fromEditable: false, ...overrides }
}

function swipe(direction: SwipeDetails['direction'], x: number): SwipeDetails {
  return {
    evt: new Event('touchmove'),
    touch: true,
    mouse: false,
    direction,
    duration: 120,
    distance: { x, y: 4 }
  }
}

// A displacement comfortably past anything either input path reports on its first fire.
const FAR = 60

describe('resolveSwipeStep', () => {
  it('advances one step when swiping left, matching iOS Calendar', () => {
    expect(resolveSwipeStep(swipe('left', FAR), false)).toBe(1)
  })

  it('goes back one step when swiping right', () => {
    expect(resolveSwipeStep(swipe('right', FAR), false)).toBe(-1)
  })

  // Quasar fires the handler on the FIRST touchmove past its own 6px threshold and never
  // again (TouchSwipe.js:100-103, 116, 217-227), so distance.x is the displacement at that
  // instant — single-digit to low-twenties on a real finger — not the length of the finished
  // swipe. A distance floor above that silently rejects every touch gesture, which is exactly
  // what shipped and what made the month view unswipeable on iOS.
  it('acts on the small displacement Quasar reports on the first touchmove', () => {
    expect(resolveSwipeStep(swipe('left', 6), false)).toBe(1)
    expect(resolveSwipeStep(swipe('left', 12), false)).toBe(1)
    expect(resolveSwipeStep(swipe('right', 20), false)).toBe(-1)
  })

  // The mouse path only fires past 50px (sensitivity[2]), which is why this bug could not
  // reproduce on a desktop and survived review.
  it('still acts on the larger displacement the mouse path reports', () => {
    expect(resolveSwipeStep(swipe('left', 50), false)).toBe(1)
  })

  it('ignores vertical swipes, which belong to the scrolling regions inside a view', () => {
    expect(resolveSwipeStep(swipe('up', FAR), false)).toBe(0)
    expect(resolveSwipeStep(swipe('down', FAR), false)).toBe(0)
  })

  it('ignores a long swipe while something is blocking', () => {
    expect(resolveSwipeStep(swipe('left', FAR), true)).toBe(0)
  })
})

describe('resolveSlideDirection', () => {
  it('slides forward for a positive step and back for a negative one', () => {
    expect(resolveSlideDirection(1, 'prev')).toBe('next')
    expect(resolveSlideDirection(-1, 'next')).toBe('prev')
  })

  it('keeps the current direction when the date does not move', () => {
    // A wheel pick that lands on the month already shown must not flip the animation.
    expect(resolveSlideDirection(0, 'prev')).toBe('prev')
    expect(resolveSlideDirection(0, 'next')).toBe('next')
  })

  it('follows a multi-step jump, not just a single step', () => {
    // The month wheel can jump years at once.
    expect(resolveSlideDirection(14, 'prev')).toBe('next')
    expect(resolveSlideDirection(-14, 'next')).toBe('prev')
  })
})

describe('resolveKeyStep', () => {
  it('maps the arrow keys onto the same steps as the swipe', () => {
    expect(resolveKeyStep(key('ArrowRight'), false)).toBe(1)
    expect(resolveKeyStep(key('ArrowLeft'), false)).toBe(-1)
  })

  it('ignores keys it does not own', () => {
    expect(resolveKeyStep(key('ArrowUp'), false)).toBe(0)
    expect(resolveKeyStep(key('Enter'), false)).toBe(0)
    expect(resolveKeyStep(key('a'), false)).toBe(0)
  })

  it('ignores the arrow keys while something is blocking', () => {
    // The listener is on window, so without this an open overlay would have the date
    // change underneath it.
    expect(resolveKeyStep(key('ArrowRight'), true)).toBe(0)
    expect(resolveKeyStep(key('ArrowLeft'), true)).toBe(0)
  })

  it('leaves modified arrow keys to the browser and the OS', () => {
    // Cmd/Alt+Arrow is back/forward and word-wise caret movement; swallowing those would
    // break navigation shortcuts on every v2 page.
    expect(resolveKeyStep(key('ArrowLeft', { hasModifier: true }), false)).toBe(0)
    expect(resolveKeyStep(key('ArrowRight', { hasModifier: true }), false)).toBe(0)
  })

  it('leaves the arrow keys alone while typing in a field', () => {
    // Quick-add and the event composer both hold text inputs; moving the caret must not
    // also move the calendar.
    expect(resolveKeyStep(key('ArrowLeft', { fromEditable: true }), false)).toBe(0)
    expect(resolveKeyStep(key('ArrowRight', { fromEditable: true }), false)).toBe(0)
  })
})

describe('resolveDaySheetStep', () => {
  it('walks one day forward and back', () => {
    expect(resolveDaySheetStep('2026-08-13', 1, 2026, 7).date).toBe('2026-08-14')
    expect(resolveDaySheetStep('2026-08-13', -1, 2026, 7).date).toBe('2026-08-12')
  })

  it('leaves the grid alone while the step stays inside the shown month', () => {
    // The grid renders the whole month either way, so re-anchoring ui.selectedDate on every
    // day step would only re-key the grid and replay its slide for a move it does not show.
    expect(resolveDaySheetStep('2026-08-13', 1, 2026, 7).viewChanged).toBe(false)
    expect(resolveDaySheetStep('2026-08-01', 1, 2026, 7).viewChanged).toBe(false)
  })

  it('takes the grid along when the day crosses into the next month', () => {
    const result = resolveDaySheetStep('2026-08-31', 1, 2026, 7)
    expect(result.date).toBe('2026-09-01')
    expect(result.viewChanged).toBe(true)
  })

  it('takes the grid along when the day crosses back into the previous month', () => {
    const result = resolveDaySheetStep('2026-08-01', -1, 2026, 7)
    expect(result.date).toBe('2026-07-31')
    expect(result.viewChanged).toBe(true)
  })

  it('carries the year across the Dec/Jan boundary', () => {
    expect(resolveDaySheetStep('2026-12-31', 1, 2026, 11)).toEqual({
      date: '2027-01-01',
      viewChanged: true
    })
    expect(resolveDaySheetStep('2026-01-01', -1, 2026, 0)).toEqual({
      date: '2025-12-31',
      viewChanged: true
    })
  })

  it('notices a same-numbered month a year away', () => {
    // Comparing the month index alone would call this an in-month step and strand the grid
    // a year behind the sheet.
    expect(resolveDaySheetStep('2026-08-13', 365, 2026, 7).viewChanged).toBe(true)
  })

  it('crosses a DST boundary without landing on the same day twice', () => {
    // addDays is calendar arithmetic (setDate), not +86400000, so a spring-forward day
    // still advances exactly one date.
    expect(resolveDaySheetStep('2026-03-08', -1, 2026, 2).date).toBe('2026-03-07')
    expect(resolveDaySheetStep('2026-03-07', 1, 2026, 2).date).toBe('2026-03-08')
  })
})
