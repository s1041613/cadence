import { describe, it, expect } from 'vitest'
import { countCompletedBreaths, breathingGeometry, isRisingAt } from './breathing-curve'

// Only the breath count is asserted in detail: it gates the transition out of the intro,
// so an off-by-one strands the user. The frame geometry is animation — asserting its
// floats would pin down numbers that are meant to be tuned by eye.

describe('countCompletedBreaths', () => {
  it('counts a breath when the curve turns from inhale to exhale', () => {
    expect(countCompletedBreaths(true, false)).toBe(1)
  })

  it('does not count while still inhaling', () => {
    expect(countCompletedBreaths(true, true)).toBe(0)
  })

  it('does not count while still exhaling', () => {
    expect(countCompletedBreaths(false, false)).toBe(0)
  })

  it('does not count on the exhale to inhale turn', () => {
    expect(countCompletedBreaths(false, true)).toBe(0)
  })

  // The bootstrap case: on the first frame there is no previous phase, and crediting a
  // breath the user never took would end the intro one breath early.
  it('does not count on the first frame, whichever way the curve is going', () => {
    expect(countCompletedBreaths(undefined, false)).toBe(0)
    expect(countCompletedBreaths(undefined, true)).toBe(0)
  })

  it('reaches the target after exactly that many inhale-exhale turns', () => {
    // Walk a full cycle the way the rAF loop does and count the crossings.
    let prev: boolean | undefined
    let breaths = 0
    for (let step = 0; step < 400; step++) {
      const rising = isRisingAt(Math.PI / 2 + (step / 100) * Math.PI * 2)
      breaths += countCompletedBreaths(prev, rising)
      prev = rising
    }
    expect(breaths).toBe(4)
  })
})

describe('breathingGeometry', () => {
  it('produces a closed hill path spanning the viewbox', () => {
    const frame = breathingGeometry(0)
    expect(frame.hillPath.startsWith('M0 190')).toBe(true)
    expect(frame.hillPath.endsWith('Z')).toBe(true)
  })

  it('keeps the breath value within the unit range', () => {
    for (let step = 0; step < 40; step++) {
      const { breath } = breathingGeometry((step / 40) * Math.PI * 2)
      expect(breath).toBeGreaterThanOrEqual(0)
      expect(breath).toBeLessThanOrEqual(1)
    }
  })

  it('is periodic over a full cycle', () => {
    expect(breathingGeometry(0.3).hillPath).toBe(breathingGeometry(0.3 + Math.PI * 2).hillPath)
  })
})
