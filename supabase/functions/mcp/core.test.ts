import { describe, it, expect } from 'vitest'
import {
  ToolInputError,
  buildEventUpdate,
  buildNewEventRow,
  buildNewTodoRows,
  encodeEventInterval,
  parseRange,
  rowToEntry,
  todayIn,
  todosForRange,
  utcToWallTime,
  wallTimeToUtc,
  type DayTodoRow,
  type EventRow
} from './core.ts'

const TPE = 'Asia/Taipei'
const NYC = 'America/New_York'

function eventRow(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: 'ev-1',
    calendar_id: 'cal-1',
    owner_id: 'me',
    type: 'event',
    title: 'Dentist',
    quadrant: null,
    color: null,
    icon: null,
    all_day: false,
    // 2026-11-12 14:00–15:00 Taipei
    starts_at: '2026-11-12T06:00:00.000Z',
    ends_at: '2026-11-12T07:00:00.000Z',
    show_in_month: true,
    location: null,
    notes: null,
    repeat_mode: 'none',
    done: false,
    estimated_pomodoros: 0,
    completed_pomodoros: 0,
    time_edited_at: null,
    ...overrides
  }
}

describe('time zones', () => {
  it('converts Taipei wall time to UTC and back', () => {
    expect(wallTimeToUtc('2026-11-11', '15:00', TPE).toISOString()).toBe('2026-11-11T07:00:00.000Z')
    expect(utcToWallTime('2026-11-11T07:00:00.000Z', TPE)).toEqual({ date: '2026-11-11', time: '15:00' })
  })

  it('crosses the date line correctly: 06:00 Taipei is the previous UTC day', () => {
    expect(wallTimeToUtc('2026-11-11', '06:00', TPE).toISOString()).toBe('2026-11-10T22:00:00.000Z')
  })

  it('uses the offset in force on that date, either side of a DST change', () => {
    expect(wallTimeToUtc('2026-07-01', '09:00', NYC).toISOString()).toBe('2026-07-01T13:00:00.000Z')
    expect(wallTimeToUtc('2026-12-01', '09:00', NYC).toISOString()).toBe('2026-12-01T14:00:00.000Z')
  })

  it('places a wall time inside the spring-forward gap just after it', () => {
    // 2026-03-08 02:30 does not exist in New York; it lands at 03:30 EDT.
    const t = wallTimeToUtc('2026-03-08', '02:30', NYC)
    expect(utcToWallTime(t, NYC)).toEqual({ date: '2026-03-08', time: '03:30' })
  })

  it('uses the first occurrence of a wall time repeated by fall-back', () => {
    // 2026-11-01 01:30 happens twice in New York; the first is EDT (UTC-4).
    expect(wallTimeToUtc('2026-11-01', '01:30', NYC).toISOString()).toBe('2026-11-01T05:30:00.000Z')
  })

  it('takes "today" from the user’s zone, not UTC', () => {
    // 23:30 UTC on the 10th is already the 11th in Taipei.
    expect(todayIn(TPE, new Date('2026-11-10T23:30:00Z'))).toBe('2026-11-11')
  })
})

describe('parseRange', () => {
  it('defaults to a single day and refuses inverted or oversized ranges', () => {
    expect(parseRange('2026-11-11', undefined)).toEqual({ from: '2026-11-11', to: '2026-11-11' })
    expect(() => parseRange('2026-11-11', '2026-11-10')).toThrow(ToolInputError)
    expect(() => parseRange('2026-01-01', '2026-12-31')).toThrow(/at most 62 days/)
    expect(() => parseRange('2026-02-30', undefined)).toThrow(ToolInputError)
  })
})

describe('encodeEventInterval', () => {
  it('encodes all-day at UTC midnight against the inclusive end day', () => {
    expect(encodeEventInterval({ date: '2026-11-11', end_date: '2026-11-13', all_day: true }, TPE)).toEqual({
      all_day: true,
      starts_at: '2026-11-11T00:00:00.000Z',
      ends_at: '2026-11-13T00:00:00.000Z'
    })
  })

  it('gives a start-only event one hour', () => {
    const r = encodeEventInterval({ date: '2026-11-11', start: '15:00' }, TPE)
    expect(r.ends_at).toBe('2026-11-11T08:00:00.000Z')
  })

  it('refuses an end that is not after the start, instead of silently repairing it', () => {
    expect(() => encodeEventInterval({ date: '2026-11-11', start: '15:00', end: '14:00' }, TPE)).toThrow(/end_date/)
  })

  it('accepts an overnight event when end_date says so', () => {
    const r = encodeEventInterval({ date: '2026-11-11', end_date: '2026-11-12', start: '22:00', end: '02:00' }, TPE)
    expect(r).toEqual({ all_day: false, starts_at: '2026-11-11T14:00:00.000Z', ends_at: '2026-11-11T18:00:00.000Z' })
  })

  it('refuses a start-only event whose hour would run past midnight', () => {
    expect(() => encodeEventInterval({ date: '2026-11-11', start: '23:30' }, TPE)).toThrow(/midnight/)
  })

  it('requires a start for a timed event', () => {
    expect(() => encodeEventInterval({ date: '2026-11-11' }, TPE)).toThrow(/start is required/)
  })
})

describe('buildNewEventRow', () => {
  it('writes the app’s defaults for a new event', () => {
    const row = buildNewEventRow(
      { title: '  Team   sync ', date: '2026-11-11', start: '10:00', end: '11:00', location: '', notes: 'agenda' },
      { id: 'new', ownerId: 'me', calendarId: 'cal-1' },
      TPE
    )
    expect(row).toMatchObject({
      type: 'event',
      title: 'Team sync',
      owner_id: 'me',
      calendar_id: 'cal-1',
      show_in_month: true,
      repeat_mode: 'none',
      location: null,
      notes: 'agenda',
      quadrant: null,
      time_edited_at: null
    })
  })

  it('refuses a blank title', () => {
    expect(() => buildNewEventRow({ title: '   ', date: '2026-11-11', all_day: true }, { id: 'x', ownerId: 'me', calendarId: 'c' }, TPE)).toThrow(
      ToolInputError
    )
  })
})

describe('buildEventUpdate', () => {
  const now = new Date('2026-11-10T00:00:00Z')

  it('moving the start keeps the duration and stamps time_edited_at', () => {
    const u = buildEventUpdate(eventRow(), { start: '16:00' }, TPE, now)
    expect(u.starts_at).toBe('2026-11-12T08:00:00.000Z')
    expect(u.ends_at).toBe('2026-11-12T09:00:00.000Z')
    expect(u.time_edited_at).toBe(now.toISOString())
  })

  it('moving the date keeps the time', () => {
    const u = buildEventUpdate(eventRow(), { date: '2026-11-13' }, TPE, now)
    expect(u.starts_at).toBe('2026-11-13T06:00:00.000Z')
    expect(u.ends_at).toBe('2026-11-13T07:00:00.000Z')
  })

  it('moving a multi-day all-day event keeps its length', () => {
    const row = eventRow({ all_day: true, starts_at: '2026-11-12T00:00:00.000Z', ends_at: '2026-11-14T00:00:00.000Z' })
    const u = buildEventUpdate(row, { date: '2026-11-20' }, TPE, now)
    expect(u).toMatchObject({ starts_at: '2026-11-20T00:00:00.000Z', ends_at: '2026-11-22T00:00:00.000Z' })
    // All-day entries have no clock time to move (tasks-store isTimeChange).
    expect(u.time_edited_at).toBeUndefined()
  })

  it('a title-only change leaves the times and time_edited_at alone', () => {
    expect(buildEventUpdate(eventRow(), { title: 'Dentist (moved)' }, TPE, now)).toEqual({ title: 'Dentist (moved)' })
  })

  it('refuses to change a task', () => {
    expect(() => buildEventUpdate(eventRow({ type: 'task', quadrant: 'do' }), { title: 'x' }, TPE, now)).toThrow(/task/)
  })

  it('needs a start to turn an all-day event into a timed one', () => {
    const row = eventRow({ all_day: true, starts_at: '2026-11-12T00:00:00.000Z', ends_at: '2026-11-12T00:00:00.000Z' })
    expect(() => buildEventUpdate(row, { all_day: false }, TPE, now)).toThrow(/needs start/)
  })

  it('refuses an empty patch', () => {
    expect(() => buildEventUpdate(eventRow(), {}, TPE, now)).toThrow(/Nothing to change/)
  })
})

describe('rowToEntry', () => {
  it('decodes a task’s quadrant into important/urgent', () => {
    const e = rowToEntry(eventRow({ type: 'task', quadrant: 'quick', done: true }), TPE, 'me', new Map([['cal-1', 'Work']]))
    expect(e).toMatchObject({ kind: 'task', important: false, urgent: true, done: true, calendar_name: 'Work', start: '14:00', end: '15:00' })
  })

  it('marks another member’s event as not mine', () => {
    expect(rowToEntry(eventRow({ owner_id: 'someone-else' }), TPE, 'me', new Map()).mine).toBe(false)
  })

  it('reports the reminder preset, or none', () => {
    expect(rowToEntry({ ...eventRow(), event_reminders: [{ minutes_before: 60 }] }, TPE, 'me', new Map()).reminder).toBe('1-hour')
    expect(rowToEntry({ ...eventRow(), event_reminders: [] }, TPE, 'me', new Map()).reminder).toBe('none')
  })
})

describe('todosForRange', () => {
  const todo = (overrides: Partial<DayTodoRow>): DayTodoRow => ({
    id: 't',
    user_id: 'me',
    date: '2026-11-11',
    origin_date: '2026-11-11',
    title: 'x',
    done: false,
    position: 0,
    ...overrides
  })

  it('shows open todos from past days on today, as the app’s carry-over would', () => {
    const rows = [
      todo({ id: 'old-open', date: '2026-11-08', origin_date: '2026-11-08' }),
      todo({ id: 'old-done', date: '2026-11-08', origin_date: '2026-11-08', done: true }),
      todo({ id: 'today', date: '2026-11-11', position: 0 })
    ]
    const result = todosForRange(rows, { from: '2026-11-11', to: '2026-11-11' }, '2026-11-11')
    expect(result.map((t) => t.id)).toEqual(['old-open', 'today'])
    expect(result[0]).toMatchObject({ date: '2026-11-11', carried_from: '2026-11-08' })
  })

  it('keeps ticked todos on the day they were ticked', () => {
    const rows = [todo({ id: 'old-done', date: '2026-11-08', origin_date: '2026-11-08', done: true })]
    expect(todosForRange(rows, { from: '2026-11-08', to: '2026-11-08' }, '2026-11-11').map((t) => t.id)).toEqual(['old-done'])
  })

  it('leaves future todos on their own day', () => {
    const rows = [todo({ id: 'fri', date: '2026-11-13', origin_date: '2026-11-13' })]
    expect(todosForRange(rows, { from: '2026-11-11', to: '2026-11-11' }, '2026-11-11')).toEqual([])
  })
})

describe('buildNewTodoRows', () => {
  it('appends after the highest existing position and drops blank lines', () => {
    let n = 0
    const rows = buildNewTodoRows(['Milk', '  ', ' Eggs '], '2026-11-11', [{ position: 0 }, { position: 4 }], {
      ownerId: 'me',
      newId: () => `id-${n++}`
    })
    expect(rows.map((r) => [r.title, r.position, r.origin_date])).toEqual([
      ['Milk', 5, '2026-11-11'],
      ['Eggs', 6, '2026-11-11']
    ])
  })

  it('caps how many one call may add', () => {
    const many = Array.from({ length: 31 }, (_, i) => `t${i}`)
    expect(() => buildNewTodoRows(many, '2026-11-11', [], { ownerId: 'me', newId: () => 'x' })).toThrow(/At most 30/)
  })
})
