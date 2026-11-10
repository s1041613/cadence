import { describe, it, expect } from 'vitest'
import type { Task } from '@/types/task'
import { rowToTask, taskToRow } from '@/services/events-mapper'
import { buildNewEventRow, rowToEntry } from './core.ts'

// core.ts re-implements the app's event encoding because the Edge Function cannot import from
// src/. These pin the two together: if events-mapper changes how it writes a row, an event made
// through MCP must still look exactly like one made in the app.
//
// The app encodes in the machine's local zone, so the MCP side is given that same zone here.
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone
const ctx = { ownerId: 'me', remoteDefaultCalendarId: '00000000-0000-4000-8000-000000000000' }
const CAL = '11111111-1111-4111-8111-111111111111'

function appEvent(overrides: Partial<Task>): Task {
  return {
    id: 'e',
    title: 'Lunch',
    date: '2026-11-11',
    start: '12:00',
    end: '13:00',
    allDay: false,
    showInMonth: true,
    location: '',
    repeat: 'none',
    notes: '',
    important: false,
    urgent: false,
    done: false,
    estimatedPomodoros: 0,
    completedPomodoros: 0,
    type: 'event',
    backgroundColor: null,
    icon: null,
    calendarId: CAL,
    reminder: null,
    timeEditedAt: null,
    ...overrides
  }
}

const cases: Array<[string, Partial<Task>, Parameters<typeof buildNewEventRow>[0]]> = [
  ['a timed event', {}, { title: 'Lunch', date: '2026-11-11', start: '12:00', end: '13:00' }],
  ['an all-day event', { allDay: true, start: '', end: '' }, { title: 'Lunch', date: '2026-11-11', all_day: true }],
  [
    'a multi-day all-day event',
    { allDay: true, start: '', end: '', endDate: '2026-11-14' },
    { title: 'Lunch', date: '2026-11-11', end_date: '2026-11-14', all_day: true }
  ],
  [
    'an overnight event',
    { start: '22:00', end: '02:00', endDate: '2026-11-12' },
    { title: 'Lunch', date: '2026-11-11', end_date: '2026-11-12', start: '22:00', end: '02:00' }
  ],
  [
    'an event with location and notes',
    { location: 'Cafe', notes: 'bring laptop' },
    { title: 'Lunch', date: '2026-11-11', start: '12:00', end: '13:00', location: 'Cafe', notes: 'bring laptop' }
  ]
]

describe('MCP event rows match the app’s', () => {
  it.each(cases)('%s', (_name, task, fields) => {
    const app = taskToRow(appEvent(task), ctx)
    const mcp = buildNewEventRow(fields, { id: 'e', ownerId: 'me', calendarId: CAL }, LOCAL_TZ)
    expect(mcp).toEqual(app)
  })

  it.each(cases)('%s decodes to the same day and times', (_name, task) => {
    const row = taskToRow(appEvent(task), ctx)
    const app = rowToTask(row, ctx)
    const mcp = rowToEntry(row, LOCAL_TZ, 'me', new Map())
    expect({ date: mcp.date, endDate: mcp.end_date, start: mcp.start ?? '', end: mcp.end ?? '' }).toEqual({
      date: app.date,
      endDate: app.endDate,
      start: app.start,
      end: app.end
    })
  })
})
