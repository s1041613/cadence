import { describe, expect, it } from 'vitest'
import { relativeDayLabel } from './relative-day'

// Local-time constructor throughout: relativeDayLabel compares calendar days, so a test
// that built its instants in UTC would drift by a day in any non-UTC CI timezone.
const at = (y: number, m: number, d: number, h = 12, min = 0): string =>
  new Date(y, m - 1, d, h, min).toISOString()

describe('relativeDayLabel', () => {
  it('labels the same calendar day Today', () => {
    const now = new Date(2026, 2, 4, 9, 0)
    expect(relativeDayLabel(at(2026, 3, 4, 8, 0), now)).toBe('Today')
  })

  it('labels the previous calendar day Yesterday', () => {
    const now = new Date(2026, 2, 4, 9, 0)
    expect(relativeDayLabel(at(2026, 3, 3, 22, 0), now)).toBe('Yesterday')
  })

  // The boundary bug this helper exists to avoid: naive elapsed-hours arithmetic
  // ((now - created) / 86400000 < 1) would call this "Today" because only 20 minutes
  // passed. Calendar-day comparison is what makes it Yesterday.
  it('says Yesterday for 23:50 seen at 00:10 the next morning, not Today', () => {
    const now = new Date(2026, 2, 4, 0, 10)
    expect(relativeDayLabel(at(2026, 3, 3, 23, 50), now)).toBe('Yesterday')
  })

  // The mirror of the case above: ~24h apart in elapsed terms, but the same calendar day.
  it('says Today for 00:05 seen at 23:55 the same day', () => {
    const now = new Date(2026, 2, 4, 23, 55)
    expect(relativeDayLabel(at(2026, 3, 4, 0, 5), now)).toBe('Today')
  })

  it('uses the weekday name from 2 days ago', () => {
    // 2026-03-04 is a Wednesday, so 2 days earlier is Monday.
    const now = new Date(2026, 2, 4, 9, 0)
    expect(relativeDayLabel(at(2026, 3, 2, 9, 0), now)).toBe('Mon')
  })

  it('uses the weekday name at 6 days ago, the last day that is unambiguous', () => {
    // 6 days before Wednesday 2026-03-04 is Thursday 2026-02-26.
    const now = new Date(2026, 2, 4, 9, 0)
    expect(relativeDayLabel(at(2026, 2, 26, 9, 0), now)).toBe('Thu')
  })

  // At exactly 7 days the weekday name repeats today's, so "Wed" would be ambiguous
  // with today. Fall back to a date instead.
  it('falls back to a dated form at 7 days, not the ambiguous weekday', () => {
    const now = new Date(2026, 2, 4, 9, 0)
    expect(relativeDayLabel(at(2026, 2, 25, 9, 0), now)).toBe('Feb 25')
  })

  it('uses the dated form for anything older within the same year', () => {
    const now = new Date(2026, 2, 4, 9, 0)
    expect(relativeDayLabel(at(2026, 1, 3, 9, 0), now)).toBe('Jan 3')
  })

  it('includes the year once the note is from a prior calendar year', () => {
    const now = new Date(2026, 2, 4, 9, 0)
    expect(relativeDayLabel(at(2025, 12, 24, 9, 0), now)).toBe('Dec 24, 2025')
  })

  // A note dated a few days into the future (clock skew between devices) must not
  // fall through the 2-6 day weekday branch and read as a week-old note.
  it('treats a future-dated note as Today rather than a stale weekday', () => {
    const now = new Date(2026, 2, 4, 9, 0)
    expect(relativeDayLabel(at(2026, 3, 6, 9, 0), now)).toBe('Today')
  })
})
