import type { Note } from '@/types/note'
import { requireSupabase } from '@/lib/supabase'

// Pure I/O layer, matching subtasks-service: no store access, no concurrency control.
// Callers pass immutable snapshots; ordering, rollback and notifications live in the
// notebook store.
//
// Notes carry no calendar column — RLS resolves authorization from user_id alone — so
// unlike events these functions need no MapContext, and ownerId is a bare string
// parameter rather than a context object (matching title-dismissals-service).

const REQUEST_TIMEOUT_MS = 10_000

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS)
}

/** The row shape as written and read. */
export interface NoteRow {
  id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string | null
  tag_id: string | null
}

export function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    // Rows written before notes became editable have no column value at all.
    updatedAt: row.updated_at ?? null,
    tagId: row.tag_id ?? null
  }
}

export function noteToRow(note: Note, ownerId: string): NoteRow {
  return {
    id: note.id,
    user_id: ownerId,
    body: note.body,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    tag_id: note.tagId
  }
}

/** Newest-first: the feed renders in array order and has no other query shape. The
 *  user_id filter is redundant under RLS but stated explicitly — it makes the intent
 *  readable and lets notes_user_created_idx serve the query. */
export async function fetchNotes(ownerId: string): Promise<Note[]> {
  const { data, error } = await requireSupabase()
    .from('notes')
    .select('*')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: false })
    .abortSignal(timeoutSignal())
  if (error) throw error

  return ((data ?? []) as NoteRow[]).map(rowToNote)
}

export async function insertNote(note: Note, ownerId: string): Promise<void> {
  // ignoreDuplicates, not a plain insert and not a plain upsert.
  //
  // The store's retry re-sends this exact snapshot, id included. A plain .insert() would
  // hit the primary key when the first attempt actually reached the database but the
  // client saw a timeout — the store would then roll the card off screen while the row
  // sits persisted, so the note reappears on the next load.
  //
  // A plain .upsert() emits ON CONFLICT DO UPDATE, and Postgres evaluates the UPDATE
  // policy on that path — which this table deliberately lacks, since a note is
  // insert-or-delete only. ignoreDuplicates takes the DO NOTHING path instead: re-sending
  // the same note is a harmless no-op that never touches the missing policy.
  const { error } = await requireSupabase()
    .from('notes')
    .upsert(noteToRow(note, ownerId), { ignoreDuplicates: true })
    .abortSignal(timeoutSignal())
  if (error) throw error
}

/** Edits one note's body. An update rather than an upsert: the row is known to exist, and
 *  narrowing the write to the two columns that change means a stale snapshot can never
 *  rewrite created_at or reassign user_id. */
export async function updateNote(id: string, body: string, updatedAt: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('notes')
    .update({ body, updated_at: updatedAt })
    .eq('id', id)
    .abortSignal(timeoutSignal())
  if (error) throw error
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('notes')
    .delete()
    .eq('id', id)
    .abortSignal(timeoutSignal())
  if (error) throw error
}
