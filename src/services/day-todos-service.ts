import type { DayTodo } from '@/types/day-todo'
import { requireSupabase } from '@/lib/supabase'

// Pure I/O layer, matching notes-service: no store access, no concurrency control. Callers
// pass immutable snapshots; ordering, rollback and notifications live in day-todos-store.
//
// Todos carry no calendar column — RLS resolves authorization from user_id alone — so the
// owner is a bare string parameter rather than a context object.

const REQUEST_TIMEOUT_MS = 10_000

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS)
}

/** The row shape as written and read. created_at is defaulted by the database and never read. */
export interface DayTodoRow {
  id: string
  user_id: string
  date: string
  origin_date: string
  title: string
  done: boolean
  position: number
}

export function rowToDayTodo(row: DayTodoRow): DayTodo {
  return {
    id: row.id,
    date: row.date,
    originDate: row.origin_date,
    title: row.title,
    done: row.done,
    position: row.position
  }
}

export function dayTodoToRow(todo: DayTodo, ownerId: string): DayTodoRow {
  return {
    id: todo.id,
    user_id: ownerId,
    date: todo.date,
    origin_date: todo.originDate,
    title: todo.title,
    done: todo.done,
    position: todo.position
  }
}

/** Every todo this user has. A day's list is a filter over these, so there is no per-day
 *  fetch — and carrying over needs the open ones from every earlier day anyway. */
export async function fetchDayTodos(ownerId: string): Promise<DayTodo[]> {
  const { data, error } = await requireSupabase()
    .from('day_todos')
    .select('*')
    .eq('user_id', ownerId)
    .order('date', { ascending: true })
    .order('position', { ascending: true })
    .abortSignal(timeoutSignal())
  if (error) throw error

  return ((data ?? []) as DayTodoRow[]).map(rowToDayTodo)
}

/** Upserts one or many in a single request — adding a pasted list and carrying a day over
 *  are both several rows that should land together. */
export async function upsertDayTodos(todos: DayTodo[], ownerId: string): Promise<void> {
  if (todos.length === 0) return
  // The database has no updated_at trigger; the client stamps it explicitly.
  const stamp = new Date().toISOString()
  const rows = todos.map((todo) => ({ ...dayTodoToRow(todo, ownerId), updated_at: stamp }))

  const { error } = await requireSupabase()
    .from('day_todos')
    .upsert(rows, { onConflict: 'id' })
    .abortSignal(timeoutSignal())
  if (error) throw error
}

export async function deleteDayTodo(id: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('day_todos')
    .delete()
    .eq('id', id)
    .abortSignal(timeoutSignal())
  if (error) throw error
}
