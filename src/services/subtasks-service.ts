import type { Subtask } from '@/types/subtask'
import { requireSupabase } from '@/lib/supabase'

// Pure I/O layer, matching events-service: no store access, no concurrency control.
// Callers pass immutable snapshots; ordering, rollback and notifications live in the
// tasks store.
//
// Subtasks carry no calendar or owner column of their own — RLS resolves both through the
// parent event — so unlike events these functions need no MapContext.

const REQUEST_TIMEOUT_MS = 10_000

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS)
}

/** The row shape as written and read. created_at is defaulted by the database and never
 *  read by the client, so it appears in neither direction. */
export interface SubtaskRow {
  id: string
  parent_id: string
  title: string
  done: boolean
  position: number
}

export function rowToSubtask(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    parentId: row.parent_id,
    title: row.title,
    done: row.done,
    position: row.position
  }
}

export function subtaskToRow(subtask: Subtask): SubtaskRow {
  return {
    id: subtask.id,
    parent_id: subtask.parentId,
    title: subtask.title,
    done: subtask.done,
    position: subtask.position
  }
}

/** Loaded by parent id rather than by calendar: the caller already knows which events it
 *  holds, and RLS filters to the ones the user may read regardless. */
export async function fetchSubtasks(parentIds: string[]): Promise<Subtask[]> {
  if (parentIds.length === 0) return []

  const { data, error } = await requireSupabase()
    .from('subtasks')
    .select('*')
    .in('parent_id', parentIds)
    .order('position', { ascending: true })
    .abortSignal(timeoutSignal())
  if (error) throw error

  return ((data ?? []) as SubtaskRow[]).map(rowToSubtask)
}

export async function upsertSubtask(subtask: Subtask): Promise<void> {
  const { error } = await requireSupabase()
    .from('subtasks')
    .upsert(subtaskToRow(subtask), { onConflict: 'id' })
    .abortSignal(timeoutSignal())
  if (error) throw error
}

export async function deleteSubtask(id: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('subtasks')
    .delete()
    .eq('id', id)
    .abortSignal(timeoutSignal())
  if (error) throw error
}
