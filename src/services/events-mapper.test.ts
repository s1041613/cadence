import { describe, it, expect } from 'vitest'
import type { ReminderPreset, Task } from '@/types/task'
import {
  taskToRow,
  rowToTask,
  reminderToMinutes,
  minutesToReminder,
  type EventRow,
  type MapContext,
  type QuadrantKey
} from './events-mapper'
import { mkTask } from '@/stores/tasks-store'

const ctx: MapContext = {
  ownerId: '11111111-1111-1111-1111-111111111111',
  remoteDefaultCalendarId: '22222222-2222-2222-2222-222222222222'
}

function roundTrip(task: Task): Task {
  return rowToTask(taskToRow(task, ctx), ctx)
}

// A real calendar id round-trips through taskToRow/rowToTask unchanged (calendar id boundary
// tests below cover the fallback path); every other test in this file uses a task that already
// belongs to the remote default calendar, matching the common "gate already passed" case.
const CAL_ID = ctx.remoteDefaultCalendarId

describe('events-mapper', () => {
  describe('ownerId mapping', () => {
    it('surfaces the row owner_id as Task.ownerId so the UI can gate edits on authorship', () => {
      const row = taskToRow(mkTask({ date: '2026-07-10', calendarId: CAL_ID }), ctx)
      const foreignRow: EventRow = { ...row, owner_id: '99999999-9999-9999-9999-999999999999' }

      expect(rowToTask(foreignRow, ctx).ownerId).toBe('99999999-9999-9999-9999-999999999999')
    })

    it('writes the current user as owner_id regardless of the local ownerId field', () => {
      const task = { ...mkTask({ date: '2026-07-10', calendarId: CAL_ID }), ownerId: 'someone-else' }

      expect(taskToRow(task, ctx).owner_id).toBe(ctx.ownerId)
    })
  })

  describe('round-trip', () => {
    it('round-trips a timed quadrant task unchanged', () => {
      const task = mkTask({
        date: '2026-07-10',
        calendarId: CAL_ID,
        title: 'Write report',
        start: '14:00',
        end: '15:30',
        location: 'Office',
        notes: 'Bring charger',
        important: true,
        urgent: false,
        done: true,
        estimatedPomodoros: 3,
        completedPomodoros: 2,
        repeat: 'weekly',
        reminder: null
      })

      expect(roundTrip(task)).toEqual({ ...task, ownerId: ctx.ownerId })
    })

    it('round-trips a timed event unchanged, keeping color and icon', () => {
      const task = mkTask({
        date: '2026-07-11',
        calendarId: CAL_ID,
        title: 'Team dinner',
        start: '18:00',
        end: '20:00',
        type: 'event',
        backgroundColor: '#c8a2c8',
        icon: 'star',
        location: 'Da-an',
        notes: '',
        repeat: 'none'
      })

      // Reminders live in event_reminders, not on the event row, so taskToRow cannot carry one
      // and the row-only round-trip always comes back null. events-service owns that write path
      // (upsert on save, delete when cleared); the reminder tests below cover rowToTask's side.
      expect(roundTrip(task)).toEqual({ ...task, ownerId: ctx.ownerId, reminder: null })
    })

    it('round-trips an all-day event unchanged', () => {
      const task = mkTask({
        date: '2026-07-12',
        calendarId: CAL_ID,
        title: 'Conference',
        allDay: true,
        type: 'event',
        backgroundColor: '#6E839B',
        icon: 'flag'
      })

      expect(roundTrip(task)).toEqual({ ...task, ownerId: ctx.ownerId, reminder: null })
    })
  })

  describe('type and quadrant mapping', () => {
    it.each<[boolean, boolean, QuadrantKey]>([
      [true, true, 'do'],
      [true, false, 'plan'],
      [false, true, 'quick'],
      [false, false, 'later']
    ])('maps important=%s urgent=%s to quadrant %s and back', (important, urgent, quadrant) => {
      const task = mkTask({ date: '2026-07-10', calendarId: CAL_ID, start: '09:00', end: '10:00', important, urgent })

      const row = taskToRow(task, ctx)
      expect(row.type).toBe('task')
      expect(row.quadrant).toBe(quadrant)

      const restored = rowToTask(row, ctx)
      expect(restored.important).toBe(important)
      expect(restored.urgent).toBe(urgent)
    })

    it('maps an event to a null quadrant', () => {
      const task = mkTask({ date: '2026-07-10', calendarId: CAL_ID, start: '09:00', end: '10:00', type: 'event' })

      const row = taskToRow(task, ctx)
      expect(row.type).toBe('event')
      expect(row.quadrant).toBeNull()
    })

    it('reads a null quadrant back as important=false urgent=false', () => {
      const row = taskToRow(mkTask({ date: '2026-07-10', calendarId: CAL_ID, start: '09:00', end: '10:00', type: 'event' }), ctx)

      const restored = rowToTask(row, ctx)
      expect(restored.important).toBe(false)
      expect(restored.urgent).toBe(false)
    })
  })

  describe('constraint clamps', () => {
    it('forces all_day=false, null icon and null color on tasks', () => {
      const task = mkTask({
        date: '2026-07-10',
        calendarId: CAL_ID,
        start: '09:00',
        end: '10:00',
        allDay: true,
        icon: 'star',
        backgroundColor: '#c8a2c8',
        type: 'quadrant'
      })

      const row = taskToRow(task, ctx)
      expect(row.all_day).toBe(false)
      expect(row.icon).toBeNull()
      expect(row.color).toBeNull()
    })

    it('falls back to 09:00-10:00 for a task with empty times', () => {
      const task = mkTask({ date: '2026-07-10', calendarId: CAL_ID })
      expect(task.start).toBe('')
      expect(task.end).toBe('')

      const restored = rowToTask(taskToRow(task, ctx), ctx)
      expect(restored.start).toBe('09:00')
      expect(restored.end).toBe('10:00')
      expect(restored.date).toBe('2026-07-10')
    })

    // focus-subtasks spec "The estimate ceases to be an upper bound". The estimate is derived
    // from the slot length, so it is a guess; exceeding it is information (the counter reads
    // 4/3), not an error. Previously this direction was clamped here AND by a DB constraint,
    // so an extra pomodoro was silently discarded on the way out.
    it('carries completed pomodoros above the estimate through unchanged', () => {
      const task = mkTask({
        date: '2026-07-10',
        calendarId: CAL_ID,
        start: '09:00',
        end: '10:00',
        estimatedPomodoros: 3,
        completedPomodoros: 5
      })

      expect(taskToRow(task, ctx).completed_pomodoros).toBe(5)
    })

    it('carries completed pomodoros through when the estimate is zero', () => {
      const task = mkTask({
        date: '2026-07-10',
        calendarId: CAL_ID,
        start: '09:00',
        end: '10:00',
        estimatedPomodoros: 0,
        completedPomodoros: 4
      })

      expect(taskToRow(task, ctx).completed_pomodoros).toBe(4)
    })

    // The assertion the spec names as the one that would have caught the DB constraint had it
    // been written first: an over-estimate count must survive the full write-and-read round trip.
    it('survives a write-and-read round trip above the estimate', () => {
      const task = mkTask({
        date: '2026-07-10',
        calendarId: CAL_ID,
        start: '09:00',
        end: '10:00',
        estimatedPomodoros: 3,
        completedPomodoros: 5
      })

      const restored = rowToTask(taskToRow(task, ctx), ctx)

      expect(restored.completedPomodoros).toBe(5)
      expect(restored.estimatedPomodoros).toBe(3)
    })
  })

  describe('nullable text fields', () => {
    it('writes empty location and notes as null and reads null back as empty strings', () => {
      const task = mkTask({ date: '2026-07-10', calendarId: CAL_ID, start: '09:00', end: '10:00', location: '', notes: '' })

      const row = taskToRow(task, ctx)
      expect(row.location).toBeNull()
      expect(row.notes).toBeNull()

      const restored = rowToTask(row, ctx)
      expect(restored.location).toBe('')
      expect(restored.notes).toBe('')
    })
  })

  describe('calendar id boundary', () => {
    it('passes a legal uuid calendarId through unchanged (no fallback)', () => {
      const ownCalendarUuid = '33333333-3333-3333-3333-333333333333'
      const task = mkTask({ date: '2026-07-10', start: '09:00', end: '10:00', calendarId: ownCalendarUuid })

      const row = taskToRow(task, ctx)
      expect(row.calendar_id).toBe(ownCalendarUuid)
      expect(rowToTask(row, ctx).calendarId).toBe(ownCalendarUuid)
    })

    it('falls back to the remote default calendar uuid for the local "default" sentinel', () => {
      const task = mkTask({ date: '2026-07-10', start: '09:00', end: '10:00', calendarId: 'default' })
      expect(taskToRow(task, ctx).calendar_id).toBe(ctx.remoteDefaultCalendarId)
    })

    it('falls back to the remote default calendar uuid for any other non-uuid value', () => {
      const task = mkTask({ date: '2026-07-10', start: '09:00', end: '10:00', calendarId: 'local-only-id' })
      expect(taskToRow(task, ctx).calendar_id).toBe(ctx.remoteDefaultCalendarId)
    })

    it('rowToTask passes the stored calendar_id through as-is (no translation)', () => {
      const row = taskToRow(mkTask({ date: '2026-07-10', calendarId: CAL_ID, start: '09:00', end: '10:00' }), ctx)
      expect(rowToTask(row, ctx).calendarId).toBe(ctx.remoteDefaultCalendarId)
    })
  })

  describe('all-day timezone independence', () => {
    it('encodes the all-day date at UTC midnight, without local time conversion', () => {
      const task = mkTask({ date: '2026-07-12', calendarId: CAL_ID, allDay: true, type: 'event' })

      const row = taskToRow(task, ctx)
      expect(row.starts_at).toBe('2026-07-12T00:00:00.000Z')
      expect(row.ends_at).toBe('2026-07-12T00:00:00.000Z')
    })

    it('reads the all-day date from the first 10 characters regardless of timestamp format', () => {
      // PostgREST renders timestamptz with a +00:00 offset rather than the Z suffix.
      const row: EventRow = {
        ...taskToRow(mkTask({ date: '2026-07-12', calendarId: CAL_ID, allDay: true, type: 'event' }), ctx),
        starts_at: '2026-07-12T00:00:00+00:00',
        ends_at: '2026-07-12T00:00:00+00:00'
      }

      const restored = rowToTask(row, ctx)
      expect(restored.date).toBe('2026-07-12')
      expect(restored.allDay).toBe(true)
    })
  })

  describe('multi-day spans', () => {
    it('round-trips a timed span that crosses midnight', () => {
      const task = mkTask({
        date: '2026-07-10',
        endDate: '2026-07-12',
        calendarId: CAL_ID,
        type: 'event',
        title: 'Conference',
        start: '22:00',
        end: '02:00',
        // Reminders round-trip through the event_reminders embed, which roundTrip omits.
        reminder: null
      })

      expect(roundTrip(task)).toEqual({ ...task, ownerId: ctx.ownerId })
    })

    it('anchors starts_at to the start date and ends_at to the end date', () => {
      const row = taskToRow(
        mkTask({ date: '2026-07-10', endDate: '2026-07-12', calendarId: CAL_ID, type: 'event', start: '22:00', end: '02:00' }),
        ctx
      )

      expect(new Date(row.starts_at).getDate()).toBe(10)
      expect(new Date(row.ends_at).getDate()).toBe(12)
      // The end_after_start constraint the DB enforces.
      expect(new Date(row.ends_at).getTime()).toBeGreaterThan(new Date(row.starts_at).getTime())
    })

    it('encodes an all-day span at UTC midnight on both ends, the end day inclusive', () => {
      const row = taskToRow(
        mkTask({ date: '2026-07-12', endDate: '2026-07-15', calendarId: CAL_ID, allDay: true, type: 'event' }),
        ctx
      )

      expect(row.starts_at).toBe('2026-07-12T00:00:00.000Z')
      expect(row.ends_at).toBe('2026-07-15T00:00:00.000Z')
    })

    it('reads an all-day span from the first 10 characters of both columns', () => {
      const row: EventRow = {
        ...taskToRow(mkTask({ date: '2026-07-12', calendarId: CAL_ID, allDay: true, type: 'event' }), ctx),
        starts_at: '2026-07-12T00:00:00+00:00',
        ends_at: '2026-07-15T00:00:00+00:00'
      }

      const restored = rowToTask(row, ctx)
      expect(restored.date).toBe('2026-07-12')
      expect(restored.endDate).toBe('2026-07-15')
    })

    // The guard that proves no backfill was needed: rows written before spans existed must
    // decode to exactly the shape they always had, with no endDate key at all.
    it('leaves a single-day all-day event encoded and decoded exactly as before', () => {
      const task = mkTask({ date: '2026-07-12', calendarId: CAL_ID, allDay: true, type: 'event' })
      const row = taskToRow(task, ctx)

      expect(row.starts_at).toBe(row.ends_at)
      expect(rowToTask(row, ctx)).not.toHaveProperty('endDate')
    })

    it('leaves a single-day timed event without an endDate key', () => {
      const row = taskToRow(mkTask({ date: '2026-07-10', calendarId: CAL_ID, start: '09:00', end: '10:00' }), ctx)

      expect(rowToTask(row, ctx)).not.toHaveProperty('endDate')
    })

    // hasTimeRange treats 22:00 -> 02:00 as inverted within one day; across two it is valid,
    // and the task must keep its own times instead of the 09:00-10:00 fallback.
    it('does not apply the task time fallback to a task whose times cross days', () => {
      const row = taskToRow(
        mkTask({ date: '2026-07-10', endDate: '2026-07-11', calendarId: CAL_ID, type: 'quadrant', start: '22:00', end: '02:00' }),
        ctx
      )

      const restored = rowToTask(row, ctx)
      expect(restored.start).toBe('22:00')
      expect(restored.end).toBe('02:00')
    })

    it('repairs an inverted span into a row the end_after_start constraint accepts', () => {
      const row = taskToRow(
        mkTask({ date: '2026-07-10', endDate: '2026-07-08', calendarId: CAL_ID, type: 'event', start: '10:00', end: '09:00' }),
        ctx
      )

      expect(new Date(row.ends_at).getTime()).toBeGreaterThan(new Date(row.starts_at).getTime())
    })
  })

  describe('reminder presets', () => {
    it.each<[ReminderPreset, number]>([
      ['at-time', 0],
      ['5-min', 5],
      ['15-min', 15],
      ['30-min', 30],
      ['1-hour', 60],
      ['1-day', 1440]
    ])('maps %s to %i minutes and back', (preset, minutes) => {
      expect(reminderToMinutes(preset)).toBe(minutes)
      expect(minutesToReminder(minutes)).toBe(preset)
    })

    it('maps unknown minute values to no reminder', () => {
      expect(minutesToReminder(7)).toBeNull()
      expect(minutesToReminder(-5)).toBeNull()
    })

    it('restores the reminder preset from the embedded reminder row', () => {
      const task = mkTask({ date: '2026-07-10', calendarId: CAL_ID, start: '09:00', end: '10:00', reminder: '15-min' })
      const row = { ...taskToRow(task, ctx), event_reminders: [{ minutes_before: 15 }] }

      expect(rowToTask(row, ctx)).toEqual({ ...task, ownerId: ctx.ownerId })
    })
  })
})
