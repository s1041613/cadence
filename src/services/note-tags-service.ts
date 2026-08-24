import type { NoteTag } from '@/types/note'
import { requireSupabase } from '@/lib/supabase'

const REQUEST_TIMEOUT_MS = 10_000

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS)
}

export interface NoteTagRow {
  id: string
  user_id: string
  name: string
  position: number
  created_at: string
  updated_at: string | null
}

export function rowToNoteTag(row: NoteTagRow): NoteTag {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null
  }
}

export function noteTagToRow(tag: NoteTag, ownerId: string): NoteTagRow {
  return {
    id: tag.id,
    user_id: ownerId,
    name: tag.name,
    position: tag.position,
    created_at: tag.createdAt,
    updated_at: tag.updatedAt
  }
}

export async function fetchNoteTags(ownerId: string): Promise<NoteTag[]> {
  const { data, error } = await requireSupabase()
    .from('note_tags')
    .select('*')
    .eq('user_id', ownerId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .abortSignal(timeoutSignal())
  if (error) throw error

  return ((data ?? []) as NoteTagRow[]).map(rowToNoteTag)
}

export async function insertNoteTag(tag: NoteTag, ownerId: string): Promise<void> {
  const { error } = await requireSupabase().from('note_tags').insert(noteTagToRow(tag, ownerId)).abortSignal(timeoutSignal())
  if (error) throw error
}
