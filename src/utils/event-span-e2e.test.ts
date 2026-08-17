import { describe, it, expect } from 'vitest'
import { taskToRow, rowToTask, type MapContext } from '@/services/events-mapper'
import { mkTask } from '@/stores/tasks-store'
import { spansDate } from './event-span'
import { isSlotOver } from './convert-date-time'

// The reported bug end-to-end: create a cross-day event, persist it, read it back, and
// confirm every calendar day it covers can find it. Component wiring has no test harness in
// this repo, so this pins the data path the rewired pickers feed.
const ctx: MapContext = {
  ownerId: '11111111-1111-1111-1111-111111111111',
  remoteDefaultCalendarId: '22222222-2222-2222-2222-222222222222'
}

describe('multi-day event, end to end', () => {
  const trip = mkTask({
    date: '2026-07-10',
    endDate: '2026-07-12',
    calendarId: ctx.remoteDefaultCalendarId,
    type: 'event',
    title: 'Taipei trip',
    start: '09:00',
    end: '17:00',
    reminder: null
  })

  it('survives a round-trip through the database representation', () => {
    const restored = rowToTask(taskToRow(trip, ctx), ctx)

    expect(restored.date).toBe('2026-07-10')
    expect(restored.endDate).toBe('2026-07-12')
  })

  it('is found by every calendar day it covers, and no others', () => {
    const restored = rowToTask(taskToRow(trip, ctx), ctx)
    const days = ['2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13']

    expect(days.filter((d) => spansDate(restored, d))).toEqual(['2026-07-10', '2026-07-11', '2026-07-12'])
  })

  it('does not read as finished partway through the trip', () => {
    const restored = rowToTask(taskToRow(trip, ctx), ctx)

    expect(isSlotOver(restored, new Date(2026, 6, 11, 20, 0))).toBe(false)
    expect(isSlotOver(restored, new Date(2026, 6, 12, 17, 0))).toBe(true)
  })

  it('derives one pomodoro rather than a count scaled by the span', () => {
    // Three days of 09:00-17:00 would otherwise estimate from raw clock arithmetic.
    expect(trip.estimatedPomodoros).toBe(1)
  })

  // The overnight case the old same-day validation rejected outright.
  it('round-trips an overnight span whose end time precedes its start time', () => {
    const shift = mkTask({
      date: '2026-07-10',
      endDate: '2026-07-11',
      calendarId: ctx.remoteDefaultCalendarId,
      type: 'event',
      title: 'Night shift',
      start: '22:00',
      end: '02:00',
      reminder: null
    })

    const restored = rowToTask(taskToRow(shift, ctx), ctx)
    expect(restored.start).toBe('22:00')
    expect(restored.end).toBe('02:00')
    expect(restored.endDate).toBe('2026-07-11')
  })
})
