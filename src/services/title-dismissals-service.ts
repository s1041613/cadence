import { requireSupabase } from '@/lib/supabase'

// Pure I/O layer, mirroring inbox-service.ts: no store access, callers pass the
// owner explicitly and own any optimistic update or rollback.

const REQUEST_TIMEOUT_MS = 10_000

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS)
}

interface DismissedTitleSuggestionRow {
  user_id: string
  suggestion_key: string
}

export async function fetchDismissedTitleKeys(ownerId: string): Promise<string[]> {
  const { data, error } = await requireSupabase()
    .from('dismissed_title_suggestions')
    .select('suggestion_key')
    .eq('user_id', ownerId)
    .abortSignal(timeoutSignal())
  if (error) throw error

  return ((data ?? []) as Pick<DismissedTitleSuggestionRow, 'suggestion_key'>[]).map((row) => row.suggestion_key)
}

export async function insertDismissedTitleKey(key: string, ownerId: string): Promise<void> {
  const row: DismissedTitleSuggestionRow = { user_id: ownerId, suggestion_key: key }

  // ignoreDuplicates, not a plain upsert: upsert emits ON CONFLICT DO UPDATE, and Postgres
  // evaluates the UPDATE policy on that path — which this table deliberately lacks, since a
  // dismissal is insert-or-delete only. Re-dismissing the same key is a no-op, not an error.
  const { error } = await requireSupabase()
    .from('dismissed_title_suggestions')
    .upsert(row, { ignoreDuplicates: true })
    .abortSignal(timeoutSignal())
  if (error) throw error
}
