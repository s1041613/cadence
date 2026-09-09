import { describe, it, expect } from 'vitest'
import { festivalOf } from './festivals'

/**
 * The dates below are the published Gregorian dates of these festivals, not values read back
 * out of the conversion library — a test that asks the library what it thinks and then agrees
 * with it proves only that the code called the library.
 */
describe('festivalOf · Taiwan public holidays', () => {
  it.each([
    ['2026-01-01', '元旦'],
    ['2026-02-28', '和平紀念日'],
    ['2026-04-04', '兒童節'],
    ['2026-05-01', '勞動節'],
    ['2026-10-10', '國慶日']
  ])('%s is %s', (date, name) => {
    expect(festivalOf(date)).toEqual({ name, holiday: true })
  })

  it.each([
    ['2026-02-16', '除夕'],
    ['2026-02-17', '春節'],
    ['2026-02-18', '春節'],
    ['2026-02-19', '春節'],
    ['2026-06-19', '端午節'],
    ['2026-09-25', '中秋節']
  ])('%s is %s (lunar)', (date, name) => {
    expect(festivalOf(date)).toEqual({ name, holiday: true })
  })

  it('finds 清明 where the solar term falls, not on a fixed date', () => {
    // 2026's term is on the 5th; the 4th is 兒童節, which the fixed table resolves first.
    expect(festivalOf('2026-04-05')).toEqual({ name: '清明節', holiday: true })
    expect(festivalOf('2026-04-04')).toEqual({ name: '兒童節', holiday: true })
  })

  it("derives 除夕 from the next day's lunar date rather than a fixed lunar day", () => {
    // The lunar twelfth month runs 29 or 30 days, so 除夕 is not "12-30". Both years below
    // happen to end on 12-29, which a naive rule keyed on 12-30 would miss entirely.
    expect(festivalOf('2025-01-28')).toEqual({ name: '除夕', holiday: true })
    expect(festivalOf('2025-01-29')).toEqual({ name: '春節', holiday: true })
    expect(festivalOf('2027-02-05')).toEqual({ name: '除夕', holiday: true })
  })
})

describe('festivalOf · folk festivals, marked as working days', () => {
  it.each([
    ['2026-03-03', '元宵節'],
    ['2026-08-19', '七夕'],
    ['2026-08-27', '中元節'],
    ['2026-10-18', '重陽節']
  ])('%s is %s and is not a day off', (date, name) => {
    expect(festivalOf(date)).toEqual({ name, holiday: false })
  })
})

describe('festivalOf · ordinary days', () => {
  it('returns null for a day with nothing on it', () => {
    expect(festivalOf('2026-09-09')).toBeNull()
    expect(festivalOf('2026-07-15')).toBeNull()
  })

  it('does not print a solar term that is not 清明', () => {
    // 雨水 lands on 2026-02-18, which is a 春節 day: the festival wins and the term never shows.
    expect(festivalOf('2026-02-18')).toEqual({ name: '春節', holiday: true })
    // 立秋 2026 — a term, and nothing else. The reference design prints these; this one does not.
    expect(festivalOf('2026-08-07')).toBeNull()
  })

  it('returns null rather than throwing on a malformed date', () => {
    expect(festivalOf('')).toBeNull()
    expect(festivalOf('2026-9-9')).toBeNull()
  })
})
