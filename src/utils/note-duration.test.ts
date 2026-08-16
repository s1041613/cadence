import { describe, it, expect } from 'vitest'
import {
  formatDuration,
  clampDuration,
  stepDuration,
  nextPreset,
  DURATION_PRESETS,
  MIN_DURATION,
  MAX_DURATION
} from './note-duration'

describe('formatDuration', () => {
  it('renders sub-hour values as minutes alone', () => {
    expect(formatDuration(15)).toBe('15m')
    expect(formatDuration(45)).toBe('45m')
  })

  it('renders whole hours without a minutes limb', () => {
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(480)).toBe('8h')
  })

  it('renders mixed values as hours and minutes', () => {
    expect(formatDuration(75)).toBe('1h 15m')
    expect(formatDuration(150)).toBe('2h 30m')
  })
})

describe('clampDuration', () => {
  it('holds values already on the grid', () => {
    expect(clampDuration(45)).toBe(45)
  })

  it('snaps an off-grid value onto the nearest 15-minute step', () => {
    // A legacy or hand-written row can hold anything the constraint was added after; the
    // stepper must still be able to reach the value it renders.
    expect(clampDuration(50)).toBe(45)
    expect(clampDuration(53)).toBe(60)
  })

  it('clamps to the range at both ends', () => {
    expect(clampDuration(0)).toBe(MIN_DURATION)
    expect(clampDuration(-30)).toBe(MIN_DURATION)
    expect(clampDuration(9000)).toBe(MAX_DURATION)
  })
})

describe('stepDuration', () => {
  it('moves one 15-minute step in each direction', () => {
    expect(stepDuration(60, 1)).toBe(75)
    expect(stepDuration(60, -1)).toBe(45)
  })

  it('returns the current value at a boundary rather than passing it', () => {
    expect(stepDuration(MIN_DURATION, -1)).toBe(MIN_DURATION)
    expect(stepDuration(MAX_DURATION, 1)).toBe(MAX_DURATION)
  })
})

describe('nextPreset', () => {
  it('advances to the next preset above the current value', () => {
    expect(nextPreset(15)).toBe(30)
    expect(nextPreset(120)).toBe(150)
  })

  // The ± buttons reach values the preset list skips; cycling from one of those must move
  // forward, not snap back to the preset below it.
  it('advances from a value that sits between two presets', () => {
    expect(nextPreset(135)).toBe(150)
    expect(nextPreset(200)).toBe(240)
  })

  it('wraps to the first preset once past the last', () => {
    expect(nextPreset(DURATION_PRESETS[DURATION_PRESETS.length - 1]!)).toBe(DURATION_PRESETS[0])
    expect(nextPreset(MAX_DURATION)).toBe(DURATION_PRESETS[0])
  })

  it('only offers values the range and grid allow', () => {
    for (const preset of DURATION_PRESETS) {
      expect(preset).toBeGreaterThanOrEqual(MIN_DURATION)
      expect(preset).toBeLessThanOrEqual(MAX_DURATION)
      expect(preset % 15).toBe(0)
    }
  })
})
