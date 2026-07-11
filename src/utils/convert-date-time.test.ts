import { describe, it, expect } from 'vitest'
import { pad, iso, parseISO, addDays, startOfWeek, minutes, toHM, fmtDur, autoPoms, quickAddTimeRange, formatTime } from './convert-date-time'

describe('pad', () => {
  it('pads single digits', () => {
    expect(pad(5)).toBe('05')
    expect(pad(12)).toBe('12')
  })
})

describe('iso', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(iso(new Date(2026, 6, 4))).toBe('2026-07-04')
  })
})

describe('parseISO', () => {
  it('parses a date string into local midnight, not UTC', () => {
    // new Date('2026-07-01') parses as UTC midnight, which shifts to 2026-06-30 in
    // any timezone west of UTC. parseISO must not have this bug.
    const d = parseISO('2026-07-01')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(6)
    expect(d.getDate()).toBe(1)
  })
})

describe('addDays', () => {
  it('crosses a month boundary', () => {
    const d = parseISO('2026-01-30')
    const result = addDays(d, 3)
    expect(iso(result)).toBe('2026-02-02')
  })

  it('crosses a year boundary', () => {
    const d = parseISO('2026-12-30')
    const result = addDays(d, 5)
    expect(iso(result)).toBe('2027-01-04')
  })
})

describe('startOfWeek', () => {
  it('returns the preceding Monday', () => {
    // 2026-07-04 is a Saturday
    const d = parseISO('2026-07-04')
    const monday = startOfWeek(d)
    expect(iso(monday)).toBe('2026-06-29')
  })

  it('returns the same day when already Monday', () => {
    const d = parseISO('2026-06-29')
    expect(iso(startOfWeek(d))).toBe('2026-06-29')
  })

  // user-settings spec "First day of week re-anchors all week-based layouts" / Example: July 2026
  // anchoring — July 1, 2026 is a Wednesday.
  it('re-anchors to the given first day of week', () => {
    const d = parseISO('2026-07-01')
    expect(iso(startOfWeek(d, 'Sunday'))).toBe('2026-06-28')
    expect(iso(startOfWeek(d, 'Monday'))).toBe('2026-06-29')
    expect(iso(startOfWeek(d, 'Saturday'))).toBe('2026-06-27')
  })

  it('places July 1 2026 in the fourth column with Sunday start and the third with Monday start', () => {
    const sundayStart = startOfWeek(parseISO('2026-07-01'), 'Sunday')
    const mondayStart = startOfWeek(parseISO('2026-07-01'), 'Monday')
    const daysSince = (start: Date) => Math.round((parseISO('2026-07-01').getTime() - start.getTime()) / 86400000)
    expect(daysSince(sundayStart) + 1).toBe(4)
    expect(daysSince(mondayStart) + 1).toBe(3)
  })
})

describe('minutes', () => {
  it('converts HH:MM to minutes since midnight', () => {
    expect(minutes('09:30')).toBe(570)
    expect(minutes('00:00')).toBe(0)
  })
})

describe('toHM', () => {
  it('converts minutes since midnight to HH:MM', () => {
    expect(toHM(570)).toBe('09:30')
    expect(toHM(0)).toBe('00:00')
  })
})

describe('fmtDur', () => {
  it('formats minutes under an hour', () => {
    expect(fmtDur(45)).toBe('45 min')
  })

  it('formats exact hours without decimal', () => {
    expect(fmtDur(120)).toBe('2 hr')
  })

  it('formats fractional hours with one decimal', () => {
    expect(fmtDur(90)).toBe('1.5 hr')
  })
})

describe('autoPoms', () => {
  it('returns 1 for all-day tasks', () => {
    expect(autoPoms({ allDay: true, start: '', end: '' })).toBe(1)
  })

  it('returns 1 for tasks with no start/end', () => {
    expect(autoPoms({ allDay: false, start: '', end: '' })).toBe(1)
  })

  it('rounds up to the nearest 25-minute pomodoro', () => {
    expect(autoPoms({ allDay: false, start: '09:00', end: '09:30' })).toBe(2)
    expect(autoPoms({ allDay: false, start: '09:00', end: '09:25' })).toBe(1)
    expect(autoPoms({ allDay: false, start: '09:00', end: '10:30' })).toBe(4)
  })
})

describe('quickAddTimeRange', () => {
  // app-shell spec "Creation entry points seed context from where they are invoked" /
  // Example: rounding and clamping boundaries.
  it.each([
    ['10:20', '10:00', '11:00', 'rounds down to 30-minute step'],
    ['10:45', '10:30', '11:30', 'rounds down to 30-minute step'],
    ['05:40', '06:00', '07:00', 'clamped to earliest start 06:00'],
    ['22:50', '22:00', '23:00', 'clamped to latest start 22:00']
  ])('%s -> start %s, end %s (%s)', (clicked, expectedStart, expectedEnd) => {
    expect(quickAddTimeRange(minutes(clicked))).toEqual({ start: expectedStart, end: expectedEnd })
  })
})

describe('formatTime', () => {
  // user-settings spec "Time format applies to displayed times" / Example: 2:30 PM stored at
  // 14:30 displays as 14:30 in 24h mode and unchanged in the stored value either way.
  it('passes 24-hour values through unchanged', () => {
    expect(formatTime('14:30', '24-Hour')).toBe('14:30')
    expect(formatTime('00:00', '24-Hour')).toBe('00:00')
  })
})
