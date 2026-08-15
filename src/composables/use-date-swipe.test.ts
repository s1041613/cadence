import { describe, it, expect } from 'vitest'
import {
  resolveSwipeStep,
  resolveKeyStep,
  resolveSlideDirection,
  MIN_SWIPE_DISTANCE_PX,
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

const FAR = MIN_SWIPE_DISTANCE_PX + 10

describe('resolveSwipeStep', () => {
  it('advances one step when swiping left, matching iOS Calendar', () => {
    expect(resolveSwipeStep(swipe('left', FAR), false)).toBe(1)
  })

  it('goes back one step when swiping right', () => {
    expect(resolveSwipeStep(swipe('right', FAR), false)).toBe(-1)
  })

  it('ignores a swipe shorter than the distance floor', () => {
    expect(resolveSwipeStep(swipe('left', MIN_SWIPE_DISTANCE_PX - 1), false)).toBe(0)
  })

  it('treats the distance floor as inclusive', () => {
    expect(resolveSwipeStep(swipe('left', MIN_SWIPE_DISTANCE_PX), false)).toBe(1)
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
