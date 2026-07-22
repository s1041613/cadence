import type { InboxItem, ScheduledTag } from '@/stores/inbox-store'
import { requireSupabase } from '@/lib/supabase'

// Pure I/O layer: no store access, no concurrency control. Callers pass
// immutable snapshots and an explicit InboxContext; ordering, rollback and
// notifications live in the inbox store. Mirrors events-service.ts.

const REQUEST_TIMEOUT_MS = 10_000

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS)
}

// Inbox has no calendar concept, so ownerId is the only context needed (unlike
// tasks' MapContext, which also carries remoteDefaultCalendarId).
export interface InboxContext {
  ownerId: string
}

// The row shape as stored in Postgres. scheduled_* are all-or-none per the
// inbox_scheduled_all_or_none DB constraint.
export interface InboxItemRow {
  id: string
  user_id: string
  text: string
  created_on: string
  done: boolean
  scheduled_type: ScheduledTag['type'] | null
  scheduled_tag: string | null
  scheduled_color: string | null
}

// --- mappers (row <-> domain). Inbox has few columns, so unlike events these
// live inline rather than in a separate mapper module. ------------------------

export function rowToInboxItem(row: InboxItemRow): InboxItem {
  const scheduled: ScheduledTag | null =
    row.scheduled_type !== null && row.scheduled_tag !== null && row.scheduled_color !== null
      ? { type: row.scheduled_type, tag: row.scheduled_tag, color: row.scheduled_color }
      : null

  return {
    id: row.id,
    text: row.text,
    createdAt: row.created_on,
    done: row.done,
    scheduled
  }
}

export function inboxItemToRow(item: InboxItem, ownerId: string): InboxItemRow {
  return {
    id: item.id,
    user_id: ownerId,
    text: item.text,
    created_on: item.createdAt,
    done: item.done,
    scheduled_type: item.scheduled?.type ?? null,
    scheduled_tag: item.scheduled?.tag ?? null,
    scheduled_color: item.scheduled?.color ?? null
  }
}

export async function fetchInboxItems(ctx: InboxContext): Promise<InboxItem[]> {
  const { data, error } = await requireSupabase()
    .from('inbox_items')
    .select('*')
    .eq('user_id', ctx.ownerId)
    .order('created_on', { ascending: false })
    .order('created_at', { ascending: false })
    .abortSignal(timeoutSignal())
  if (error) throw error

  return ((data ?? []) as InboxItemRow[]).map(rowToInboxItem)
}

export async function upsertInboxItem(item: InboxItem, ctx: InboxContext): Promise<void> {
  // The DB has no updated_at trigger; the client stamps it explicitly.
  const row = { ...inboxItemToRow(item, ctx.ownerId), updated_at: new Date().toISOString() }

  const { error } = await requireSupabase().from('inbox_items').upsert(row).abortSignal(timeoutSignal())
  if (error) throw error
}

export async function deleteInboxItem(id: string): Promise<void> {
  const { error } = await requireSupabase().from('inbox_items').delete().eq('id', id).abortSignal(timeoutSignal())
  if (error) throw error
}
