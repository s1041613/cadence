import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Task } from '@/types/task'
import type { MapContext } from './events-mapper'
import { fetchTasks, insertTasks, upsertTask } from './events-service'

const requireSupabaseMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => requireSupabaseMock()
}))

const ctx: MapContext = {
  ownerId: 'user-1',
  remoteDefaultCalendarId: 'calendar-1'
}

const OWN_CALENDAR_UUID = '44444444-4444-4444-4444-444444444444'

const task: Task = {
  id: 'event-1',
  title: 'Planning',
  date: '2026-07-21',
  start: '10:00',
  end: '11:00',
  allDay: false,
  location: '',
  repeat: 'none',
  notes: '',
  important: false,
  urgent: false,
  done: false,
  estimatedPomodoros: 2,
  completedPomodoros: 0,
  type: 'event',
  backgroundColor: null,
  icon: null,
  calendarId: OWN_CALENDAR_UUID,
  reminder: '15-min'
}

describe('events-service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetches events across all member calendars with an explicit id filter', async () => {
    const calls: Array<[string, unknown]> = []
    const builder = {
      select: vi.fn((columns: string) => {
        calls.push(['select', columns])
        return builder
      }),
      in: vi.fn((column: string, values: unknown) => {
        calls.push(['in', [column, values]])
        return builder
      }),
      abortSignal: vi.fn(async () => ({ data: [], error: null }))
    }
    const supabase = { from: vi.fn(() => builder) }
    requireSupabaseMock.mockReturnValue(supabase)

    const memberCalendarIds = [OWN_CALENDAR_UUID, '55555555-5555-5555-5555-555555555555']
    await expect(fetchTasks(ctx, memberCalendarIds)).resolves.toEqual([])

    expect(supabase.from).toHaveBeenCalledWith('events')
    expect(calls).toEqual([
      ['select', expect.stringContaining('event_reminders')],
      ['in', ['calendar_id', memberCalendarIds]]
    ])
  })

  it('resets fired_at when upserting a reminder so changed future reminders can fire again', async () => {
    const eventAbortSignal = vi.fn(async () => ({ error: null }))
    const reminderAbortSignal = vi.fn(async () => ({ error: null }))
    const reminderUpsert = vi.fn(() => ({ abortSignal: reminderAbortSignal }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'events') {
          return {
            upsert: vi.fn(() => ({ abortSignal: eventAbortSignal }))
          }
        }

        return {
          upsert: reminderUpsert
        }
      })
    }
    requireSupabaseMock.mockReturnValue(supabase)

    await upsertTask(task, ctx)

    expect(reminderUpsert).toHaveBeenCalledWith(
      { event_id: task.id, minutes_before: 15, fired_at: null },
      { onConflict: 'event_id' }
    )
  })

  it('upserts copied event rows by id, passing a legal uuid calendarId through unchanged', async () => {
    const eventAbortSignal = vi.fn(async () => ({ error: null }))
    const eventUpsert = vi.fn(() => ({ abortSignal: eventAbortSignal }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'events') {
          return {
            upsert: eventUpsert
          }
        }

        return {
          upsert: vi.fn(() => ({ abortSignal: vi.fn(async () => ({ error: null })) }))
        }
      })
    }
    requireSupabaseMock.mockReturnValue(supabase)

    await insertTasks([task], ctx)

    expect(eventUpsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: task.id,
          calendar_id: OWN_CALENDAR_UUID,
          owner_id: ctx.ownerId
        })
      ],
      { onConflict: 'id' }
    )
  })

  it('falls back a non-uuid calendarId to the remote default calendar uuid', async () => {
    const eventAbortSignal = vi.fn(async () => ({ error: null }))
    const eventUpsert = vi.fn(() => ({ abortSignal: eventAbortSignal }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'events') {
          return {
            upsert: eventUpsert
          }
        }

        return {
          upsert: vi.fn(() => ({ abortSignal: vi.fn(async () => ({ error: null })) }))
        }
      })
    }
    requireSupabaseMock.mockReturnValue(supabase)

    await insertTasks([{ ...task, calendarId: 'default' }], ctx)

    expect(eventUpsert).toHaveBeenCalledWith(
      [expect.objectContaining({ id: task.id, calendar_id: ctx.remoteDefaultCalendarId })],
      { onConflict: 'id' }
    )
  })

  it('upserts copied reminder rows by event id so retries after event writes do not duplicate reminders', async () => {
    const reminderAbortSignal = vi.fn(async () => ({ error: null }))
    const reminderUpsert = vi.fn(() => ({ abortSignal: reminderAbortSignal }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'events') {
          return {
            upsert: vi.fn(() => ({ abortSignal: vi.fn(async () => ({ error: null })) }))
          }
        }

        return {
          upsert: reminderUpsert
        }
      })
    }
    requireSupabaseMock.mockReturnValue(supabase)

    await insertTasks([task], ctx)

    expect(reminderUpsert).toHaveBeenCalledWith(
      [{ event_id: task.id, minutes_before: 15, fired_at: null }],
      { onConflict: 'event_id' }
    )
  })
})
