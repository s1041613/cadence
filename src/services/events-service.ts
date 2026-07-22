import type { Task } from '@/types/task'
import { requireSupabase } from '@/lib/supabase'
import {
  taskToRow,
  rowToTask,
  reminderToMinutes,
  type FetchedEventRow,
  type MapContext
} from './events-mapper'

// Pure I/O layer: no store access, no concurrency control. Callers pass
// immutable snapshots and an explicit MapContext; ordering, rollback and
// notifications live in the tasks store.

const REQUEST_TIMEOUT_MS = 10_000

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS)
}

// Explicit id filter (not RLS-implied scope): the caller supplies every calendar the user is a
// member of, so shared calendars' events load alongside the user's own.
export async function fetchTasks(ctx: MapContext, memberCalendarIds: string[]): Promise<Task[]> {
  const { data, error } = await requireSupabase()
    .from('events')
    .select('*, event_reminders(minutes_before)')
    .in('calendar_id', memberCalendarIds)
    .abortSignal(timeoutSignal())
  if (error) throw error

  return ((data ?? []) as FetchedEventRow[]).map((row) => rowToTask(row, ctx))
}

export async function upsertTask(task: Task, ctx: MapContext): Promise<void> {
  const supabase = requireSupabase()
  // The DB has no updated_at trigger; the client stamps it explicitly.
  const row = { ...taskToRow(task, ctx), updated_at: new Date().toISOString() }

  const { error } = await supabase.from('events').upsert(row).abortSignal(timeoutSignal())
  if (error) throw error

  // Single-reminder model: upsert the one reminder row, delete it when cleared.
  if (task.reminder === null) {
    const { error: reminderError } = await supabase
      .from('event_reminders')
      .delete()
      .eq('event_id', task.id)
      .abortSignal(timeoutSignal())
    if (reminderError) throw reminderError
    return
  }

  const { error: reminderError } = await supabase
    .from('event_reminders')
    .upsert(
      { event_id: task.id, minutes_before: reminderToMinutes(task.reminder), fired_at: null },
      { onConflict: 'event_id' }
    )
    .abortSignal(timeoutSignal())
  if (reminderError) throw reminderError
}

export async function insertTasks(tasks: Task[], ctx: MapContext): Promise<void> {
  if (tasks.length === 0) return
  const supabase = requireSupabase()

  const rows = tasks.map((task) => taskToRow(task, ctx))
  const { error } = await supabase.from('events').upsert(rows, { onConflict: 'id' }).abortSignal(timeoutSignal())
  if (error) throw error

  const reminderRows = tasks.flatMap((task) =>
    task.reminder === null
      ? []
      : [{ event_id: task.id, minutes_before: reminderToMinutes(task.reminder), fired_at: null }]
  )
  if (reminderRows.length === 0) return

  const { error: reminderError } = await supabase
    .from('event_reminders')
    .upsert(reminderRows, { onConflict: 'event_id' })
    .abortSignal(timeoutSignal())
  if (reminderError) throw reminderError
}

export async function deleteTask(id: string): Promise<void> {
  // event_reminders rows cascade via the event_id foreign key.
  const { error } = await requireSupabase().from('events').delete().eq('id', id).abortSignal(timeoutSignal())
  if (error) throw error
}
