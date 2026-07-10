import { describe, it, expect } from 'vitest'
import { monthGridCells, stepMonth } from './month-grid'

describe('monthGridCells', () => {
  it('returns 42 cells starting on the preceding Monday', () => {
    const cells = monthGridCells(2026, 6) // July 2026, starts on a Wednesday
    expect(cells).toHaveLength(42)
    expect(cells[0]!.date).toBe('2026-06-29') // Monday before July 1
    expect(cells[0]!.outsideMonth).toBe(true)
  })

  it('marks in-month days correctly', () => {
    const cells = monthGridCells(2026, 6)
    const july1 = cells.find((c) => c.date === '2026-07-01')
    expect(july1?.outsideMonth).toBe(false)
    expect(july1?.dayNum).toBe(1)
    expect(july1?.dow).toBe(3) // Wednesday
  })

  it('handles leap-year February with 29 days', () => {
    const cells = monthGridCells(2028, 1) // Feb 2028 is a leap year
    const feb29 = cells.find((c) => c.date === '2028-02-29')
    expect(feb29).toBeDefined()
    expect(feb29?.outsideMonth).toBe(false)
    const mar1 = cells.find((c) => c.date === '2028-03-01')
    expect(mar1?.outsideMonth).toBe(true)
  })

  it('handles non-leap-year February with 28 days', () => {
    const cells = monthGridCells(2026, 1) // Feb 2026 is not a leap year
    const feb29 = cells.find((c) => c.date === '2026-02-29')
    expect(feb29).toBeUndefined()
    const feb28 = cells.find((c) => c.date === '2026-02-28')
    expect(feb28?.outsideMonth).toBe(false)
  })
})

describe('stepMonth', () => {
  it('steps forward within the same year', () => {
    expect(stepMonth(2026, 5, 1)).toEqual({ year: 2026, month: 6 })
  })

  it('carries the year forward across December to January', () => {
    expect(stepMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
  })

  it('carries the year backward across January to December', () => {
    expect(stepMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
  })

  it('handles multi-month deltas that cross multiple year boundaries', () => {
    expect(stepMonth(2026, 6, 18)).toEqual({ year: 2028, month: 0 })
  })
})
