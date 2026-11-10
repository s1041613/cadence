import { requireSupabase } from '@/lib/supabase'
import type { ConsentDetails } from '@/pages/oauth-consent-core'

// The consent page's I/O, against Supabase Auth's OAuth 2.1 server (supabase.auth.oauth) and the
// has_mcp_access() check. Kept out of the page so the page stays wiring and the flow stays testable.

const REQUEST_TIMEOUT_MS = 10_000

/** The same has_mcp_access() check the mcp Edge Function makes, so the consent page never
 *  grants a connection the function would then refuse. Answers for the signed-in user only. */
export async function hasMcpAccess(): Promise<boolean> {
  const { data, error } = await requireSupabase()
    .rpc('has_mcp_access')
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  return data === true
}

export async function getConsentDetails(authorizationId: string): Promise<ConsentDetails> {
  const { data, error } = await requireSupabase().auth.oauth.getAuthorizationDetails(authorizationId)
  if (error) throw error
  if (!data) throw new Error('No authorization request found')
  if ('authorization_id' in data) {
    return { kind: 'ask', clientName: data.client.name, redirectUri: data.redirect_uri }
  }
  return { kind: 'redirect', url: data.redirect_url }
}

/** Returns where to send the browser: back to the client with a code (approve) or an error (deny). */
export async function decideConsent(authorizationId: string, approve: boolean): Promise<string> {
  const oauth = requireSupabase().auth.oauth
  // skipBrowserRedirect: the page navigates itself, after it has finished updating its own state.
  const { data, error } = approve
    ? await oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
    : await oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true })
  if (error) throw error
  return data.redirect_url
}
