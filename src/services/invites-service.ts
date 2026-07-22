import { requireSupabase } from '@/lib/supabase'

const REQUEST_TIMEOUT_MS = 10_000

// TimeTree-style standing link: one permanent invite per calendar, reused every time the owner
// opens the invite panel. No DB uniqueness constraint backs this — a same-instant race can insert
// a duplicate row, which is accepted (both tokens stay valid; see design Non-Goals).
export async function getOrCreateInviteToken(calendarId: string, userId: string): Promise<string> {
  const supabase = requireSupabase()

  const { data, error } = await supabase
    .from('calendar_invites')
    .select('token')
    .eq('calendar_id', calendarId)
    .is('expires_at', null)
    .limit(1)
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error

  const existing = (data as Array<{ token: string }> | null)?.[0]
  if (existing) return existing.token

  // token comes from the DB default (gen_random_bytes hex); created_by has no default and is
  // required by the not-null constraint.
  const { data: created, error: insertError } = await supabase
    .from('calendar_invites')
    .insert({ calendar_id: calendarId, created_by: userId })
    .select('token')
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
    .single()
  if (insertError) throw insertError
  const token = (created as { token?: unknown } | null)?.token
  if (typeof token !== 'string') {
    throw new Error('calendar_invites insert returned no token')
  }
  return token
}

// SECURITY DEFINER RPC: validates the token (existence + expiry) and adds the current user as a
// member. Idempotent for existing members; raises 'invalid or expired invite' otherwise.
export async function acceptInvite(token: string): Promise<string> {
  const supabase = requireSupabase()

  const { data, error } = await supabase
    .rpc('accept_invite', { invite_token: token })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  if (typeof data !== 'string') {
    throw new Error('accept_invite returned no calendar id')
  }
  return data
}

// Absolute share URL for a token — same base-URL derivation as authCallbackUrl() so dev ('/')
// and GitHub Pages ('/cadence/') both produce a link that lands on the SPA's /join route.
export function joinUrl(token: string): string {
  const base = import.meta.env.QUASAR_VUE_ROUTER_BASE || '/'
  const baseUrl = new URL(base, window.location.origin)
  return new URL(`join/${token}`, baseUrl).toString()
}
