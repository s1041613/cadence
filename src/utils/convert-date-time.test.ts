import { describe, it, expect } from 'vitest'
import { pad, iso, parseISO, addDays, startOfWeek, minutes, hasTimeRange, toHM, fmtDur, autoPoms, pomsInSlot, defaultPoms, estPomsOf, slotEndAt, isSlotOver, quickAddTimeRange, formatTime, snapToStep, shiftRange, daysBetween, endDateOf, spanDayCount, isMultiDay } from './convert-date-time'
import { DEFAULT_FOCUS_MS, DEFAULT_REST_MS } from './focus-timer'

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

describe('hasTimeRange', () => {
  it('requires valid start/end values with a positive duration', () => {
    expect(hasTimeRange({ start: '09:00', end: '09:30' })).toBe(true)
    expect(hasTimeRange({ start: '', end: '' })).toBe(false)
    expect(hasTimeRange({ start: '09:30', end: '09:00' })).toBe(false)
    expect(hasTimeRange({ start: 'nope', end: '09:30' })).toBe(false)
  })

  // 22:00 -> 02:00 is inverted within one day but legitimate across two.
  it('accepts an inverted clock range when the span crosses days', () => {
    expect(hasTimeRange({ start: '22:00', end: '02:00', date: '2026-07-10', endDate: '2026-07-11' })).toBe(true)
    expect(hasTimeRange({ start: '22:00', end: '02:00', date: '2026-07-10' })).toBe(false)
  })

  // Times still have to be real values, span or no span.
  it('still rejects unparseable times on a multi-day span', () => {
    expect(hasTimeRange({ start: 'nope', end: '02:00', date: '2026-07-10', endDate: '2026-07-11' })).toBe(false)
  })
})

describe('daysBetween', () => {
  it('counts whole days forward and backward', () => {
    expect(daysBetween('2026-07-10', '2026-07-12')).toBe(2)
    expect(daysBetween('2026-07-10', '2026-07-10')).toBe(0)
    expect(daysBetween('2026-07-12', '2026-07-10')).toBe(-2)
  })

  it('crosses month, year and leap-day boundaries', () => {
    expect(daysBetween('2026-07-31', '2026-08-02')).toBe(2)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2)
  })
})

describe('endDateOf', () => {
  it('falls back to the start date when there is no end date', () => {
    expect(endDateOf({ date: '2026-07-10' })).toBe('2026-07-10')
    expect(endDateOf({ date: '2026-07-10', endDate: '2026-07-10' })).toBe('2026-07-10')
  })

  it('returns a later end date', () => {
    expect(endDateOf({ date: '2026-07-10', endDate: '2026-07-12' })).toBe('2026-07-12')
  })

  // Repairing an inverted span here means no downstream consumer has to re-check it.
  it('normalizes an inverted end date back to single-day', () => {
    expect(endDateOf({ date: '2026-07-10', endDate: '2026-07-08' })).toBe('2026-07-10')
  })
})

describe('spanDayCount', () => {
  it('counts a single day as one', () => {
    expect(spanDayCount({ date: '2026-07-10' })).toBe(1)
    expect(spanDayCount({ date: '2026-07-10', endDate: '2026-07-08' })).toBe(1)
  })

  it('counts inclusively across boundaries', () => {
    expect(spanDayCount({ date: '2026-07-10', endDate: '2026-07-12' })).toBe(3)
    expect(spanDayCount({ date: '2026-07-31', endDate: '2026-08-02' })).toBe(3)
    expect(spanDayCount({ date: '2026-12-31', endDate: '2027-01-01' })).toBe(2)
    expect(spanDayCount({ date: '2028-02-28', endDate: '2028-03-01' })).toBe(3)
  })
})

describe('isMultiDay', () => {
  it('is true only when the span extends past the start date', () => {
    expect(isMultiDay({ date: '2026-07-10' })).toBe(false)
    expect(isMultiDay({ date: '2026-07-10', endDate: '2026-07-10' })).toBe(false)
    expect(isMultiDay({ date: '2026-07-10', endDate: '2026-07-08' })).toBe(false)
    expect(isMultiDay({ date: '2026-07-10', endDate: '2026-07-11' })).toBe(true)
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

  // A multi-day span is a container, not a focus session. Deriving from the clock times
  // alone would give a four-day trip 231 pomodoros, and that number gets persisted.
  it('returns 1 for a multi-day span', () => {
    expect(autoPoms({ allDay: false, start: '09:00', end: '17:00', date: '2026-07-10', endDate: '2026-07-13' })).toBe(1)
  })

  it('still derives from the slot for a single-day span', () => {
    expect(autoPoms({ allDay: false, start: '09:00', end: '10:30', date: '2026-07-10', endDate: '2026-07-10' })).toBe(4)
  })
})

describe('estPomsOf', () => {
  // The stored estimate is a snapshot taken at creation; autoPoms recomputes from the
  // slot. When a user edits an event's times the two diverge, so every consumer must
  // agree on which wins — otherwise progress stalls or completes early.
  it('prefers a stored estimate over the slot-derived count', () => {
    expect(estPomsOf({ estimatedPomodoros: 2, allDay: false, start: '09:00', end: '10:30' })).toBe(2)
  })

  it('falls back to the slot-derived count when no estimate is stored', () => {
    expect(estPomsOf({ estimatedPomodoros: 0, allDay: false, start: '09:00', end: '10:30' })).toBe(4)
  })

  it('falls back for all-day tasks with no stored estimate', () => {
    expect(estPomsOf({ estimatedPomodoros: 0, allDay: true, start: '', end: '' })).toBe(1)
  })

  it('ignores a negative stored estimate', () => {
    expect(estPomsOf({ estimatedPomodoros: -3, allDay: false, start: '09:00', end: '09:30' })).toBe(2)
  })

  it('falls back to 1 for a multi-day span with no stored estimate', () => {
    expect(
      estPomsOf({ estimatedPomodoros: 0, allDay: false, start: '09:00', end: '17:00', date: '2026-07-10', endDate: '2026-07-13' })
    ).toBe(1)
  })
})

describe('slotEndAt', () => {
  it('combines the date and the end time into one instant', () => {
    const at = slotEndAt({ allDay: false, date: '2026-07-31', end: '10:40' })
    expect(at?.getFullYear()).toBe(2026)
    expect(at?.getMonth()).toBe(6)
    expect(at?.getDate()).toBe(31)
    expect(at?.getHours()).toBe(10)
    expect(at?.getMinutes()).toBe(40)
  })

  it('has no end instant for an all-day event', () => {
    expect(slotEndAt({ allDay: true, date: '2026-07-31', end: '' })).toBeNull()
  })

  it('has no end instant when the time was never filled in', () => {
    expect(slotEndAt({ allDay: false, date: '2026-07-31', end: '' })).toBeNull()
  })

  // A multi-day event ends on its LAST day. Anchoring to `date` would place the end instant
  // on the first day and mark the event over from that evening onward.
  it('anchors the end time to the end date of a multi-day span', () => {
    const at = slotEndAt({ allDay: false, date: '2026-07-10', endDate: '2026-07-12', end: '02:00' })
    expect(at?.getDate()).toBe(12)
    expect(at?.getHours()).toBe(2)
  })
})

describe('isSlotOver', () => {
  const event = { allDay: false, date: '2026-07-31', end: '10:00' }

  it('is not over before the end time', () => {
    expect(isSlotOver(event, new Date(2026, 6, 31, 9, 59))).toBe(false)
  })

  it('is over from the end time onwards', () => {
    expect(isSlotOver(event, new Date(2026, 6, 31, 10, 0))).toBe(true)
    expect(isSlotOver(event, new Date(2026, 6, 31, 18, 0))).toBe(true)
  })

  // Comparing only HH:MM would make yesterday's morning event look current again today.
  it('stays over on a later day, whatever the clock says', () => {
    expect(isSlotOver(event, new Date(2026, 7, 1, 8, 0))).toBe(true)
  })

  // The regression multi-day support would otherwise introduce: a trip running the 10th to
  // the 12th must not read as finished on the 11th just because its end time has passed.
  it('is not over on a middle day of a multi-day span', () => {
    const trip = { allDay: false, date: '2026-07-10', endDate: '2026-07-12', end: '17:00' }
    expect(isSlotOver(trip, new Date(2026, 6, 11, 23, 0))).toBe(false)
    expect(isSlotOver(trip, new Date(2026, 6, 12, 17, 0))).toBe(true)
  })

  it('is not over on an earlier day', () => {
    expect(isSlotOver(event, new Date(2026, 6, 30, 23, 59))).toBe(false)
  })

  it('is never over for an all-day event', () => {
    expect(isSlotOver({ allDay: true, date: '2026-07-31', end: '' }, new Date(2027, 0, 1))).toBe(false)
  })
})

describe('pomsInSlot', () => {
  // focus-subtasks spec "A new slot-to-pomodoro function supplies the default for newly
  // created events only". Unlike autoPoms this counts the breaks between pomodoros, so the
  // answer is what actually fits: a 2-hour slot holds 4 (115 min), not 5 (145 min).
  const FOCUS = 25 * 60_000
  const REST = 5 * 60_000
  const slot = (min: number) => ({ allDay: false, start: '10:00', end: toHM(minutes('10:00') + min) })

  it.each([
    [120, 4, 'the worked example: 5 would need 145 min and overrun the slot'],
    [25, 1, 'exactly one pomodoro, no break needed'],
    [55, 2, 'two pomodoros plus the break between them'],
    [60, 2, 'the spare 5 min cannot hold a third'],
    [85, 3, 'three pomodoros and two breaks']
  ])('a %i-minute slot holds %i pomodoros (%s)', (min, expected) => {
    expect(pomsInSlot(slot(min), FOCUS, REST)).toBe(expected)
  })

  // The boundary the spec calls out: one more minute must not silently admit another pomodoro.
  it('admits another pomodoro only once the slot genuinely grows to fit it', () => {
    expect(pomsInSlot(slot(54), FOCUS, REST)).toBe(1)
    expect(pomsInSlot(slot(55), FOCUS, REST)).toBe(2)
  })

  // A slot too short for even one pomodoro still offers one: the estimate is a reference,
  // and zero would render as "0 sessions" on the card.
  it('never returns less than one', () => {
    expect(pomsInSlot(slot(10), FOCUS, REST)).toBe(1)
  })

  it('gives an all-day event one pomodoro, matching autoPoms', () => {
    expect(pomsInSlot({ allDay: true, start: '', end: '' }, FOCUS, REST)).toBe(1)
  })

  it('gives a multi-day span one pomodoro, matching autoPoms', () => {
    expect(
      pomsInSlot({ allDay: false, start: '09:00', end: '17:00', date: '2026-07-10', endDate: '2026-07-13' }, FOCUS, REST)
    ).toBe(1)
  })

  // The distinction from autoPoms is the whole point of the function existing.
  it('is more conservative than autoPoms wherever breaks change the answer', () => {
    const twoHours = slot(120)
    expect(autoPoms(twoHours)).toBe(5)
    expect(pomsInSlot(twoHours, FOCUS, REST)).toBe(4)
  })
})

describe('defaultPoms', () => {
  // The creation-time wrapper. It restates the pomodoro lengths rather than importing them,
  // so that this module stays independent of focus-timer — this test is what stops the two
  // copies drifting apart unnoticed.
  it('uses the same focus and rest lengths as the focus timer', () => {
    const twoHours = { allDay: false, start: '10:00', end: '12:00' }
    expect(defaultPoms(twoHours)).toBe(pomsInSlot(twoHours, DEFAULT_FOCUS_MS, DEFAULT_REST_MS))
  })

  it('gives an all-day task one', () => {
    expect(defaultPoms({ allDay: true, start: '', end: '' })).toBe(1)
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

describe('snapToStep', () => {
  it('rounds to the nearest step', () => {
    expect(snapToStep('09:07', 5)).toBe('09:05')
    expect(snapToStep('09:08', 5)).toBe('09:10')
  })

  it('leaves a value already on the step unchanged', () => {
    expect(snapToStep('09:05', 5)).toBe('09:05')
    expect(snapToStep('00:00', 5)).toBe('00:00')
  })

  it('carries into the next hour when rounding up', () => {
    expect(snapToStep('09:58', 5)).toBe('10:00')
  })

  // The wheel only renders times that exist. Rounding 23:58 up would produce 24:00, which
  // isTimeValue rejects and no hour column can display — clamp to the last slot instead.
  it('clamps at the end of the day rather than overflowing to 24:00', () => {
    expect(snapToStep('23:58', 5)).toBe('23:55')
    expect(snapToStep('23:59', 5)).toBe('23:55')
  })

  // An all-day event stores '' for its times. minutes('') is NaN, which would serialise as
  // the literal "NaN:NaN" — a value the wheel cannot render and isTimeValue rejects.
  it('returns an empty string for a time it cannot parse', () => {
    expect(snapToStep('', 5)).toBe('')
    expect(snapToStep('not-a-time', 5)).toBe('')
  })
})

describe('shiftRange', () => {
  it('carries the end along when the start moves, preserving duration', () => {
    expect(shiftRange({ start: '09:00', end: '10:30' }, 'start', '13:00')).toEqual({ start: '13:00', end: '14:30' })
  })

  it('carries the end backwards when the start moves earlier', () => {
    expect(shiftRange({ start: '13:00', end: '14:00' }, 'start', '09:00')).toEqual({ start: '09:00', end: '10:00' })
  })

  it('leaves the start alone when the end moves but stays later', () => {
    expect(shiftRange({ start: '09:00', end: '10:00' }, 'end', '11:00')).toEqual({ start: '09:00', end: '11:00' })
  })

  // Auto-shift exists so the picker never strands the user in the "end must be after start"
  // error state: dragging the end past the start pushes the start back instead of failing.
  it('carries the start backwards when the end is moved before it', () => {
    expect(shiftRange({ start: '13:00', end: '14:00' }, 'end', '11:00')).toEqual({ start: '10:00', end: '11:00' })
  })

  it('treats an end moved exactly onto the start as a conflict', () => {
    expect(shiftRange({ start: '13:00', end: '14:00' }, 'end', '13:00')).toEqual({ start: '12:00', end: '13:00' })
  })

  it('clamps at the end of the day when the carried end would overflow', () => {
    expect(shiftRange({ start: '09:00', end: '10:30' }, 'start', '23:00')).toEqual({ start: '23:00', end: '23:55' })
  })

  it('clamps at the start of the day when the carried start would underflow', () => {
    expect(shiftRange({ start: '13:00', end: '14:00' }, 'end', '00:30')).toEqual({ start: '00:00', end: '00:30' })
  })

  // An already-inverted range can arrive from elsewhere (the card keeps its "end must be
  // after start" backstop for exactly that). Carrying its negative duration would drag the
  // end backwards as the user drags the start forwards, preserving the broken state the
  // auto-shift exists to resolve — so the first move repairs it instead.
  it('repairs an inverted range rather than carrying a negative duration', () => {
    expect(shiftRange({ start: '13:00', end: '12:00' }, 'start', '15:00')).toEqual({ start: '15:00', end: '15:05' })
  })

  it('keeps the end after the start when the incoming range is empty', () => {
    expect(shiftRange({ start: '13:00', end: '13:00' }, 'start', '15:00')).toEqual({ start: '15:00', end: '15:05' })
  })

  // Times are stored as '' for an all-day event; arithmetic on those is NaN, which would
  // otherwise serialise as the literal "NaN:NaN" and be saved.
  it('falls back to a valid range when the incoming times are empty', () => {
    expect(shiftRange({ start: '', end: '' }, 'start', '09:00')).toEqual({ start: '09:00', end: '09:05' })
  })

  it('ignores an invalid new value rather than emitting NaN', () => {
    expect(shiftRange({ start: '09:00', end: '10:00' }, 'start', '')).toEqual({ start: '09:00', end: '10:00' })
  })
})
