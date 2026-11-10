// The OAuth consent flow behind OAuthConsentPage.vue, pulled out so its branches are testable
// without the router or Supabase (same split as join-calendar-core.ts).
//
// Supabase Auth's OAuth 2.1 server sends a user here when an AI client (Claude, ChatGPT, …) asks
// to connect to their account, with ?authorization_id=… . The page decides, approve or deny goes
// back to Supabase, and Supabase hands back the URL to send the browser to.

export interface ConsentClient {
  name: string
}

export type ConsentDetails =
  | { kind: 'ask'; clientName: string; redirectUri: string }
  /** The user approved this client before; Supabase returns where to go straight away. */
  | { kind: 'redirect'; url: string }

export type ConsentStart =
  | { status: 'invalid' }
  | { status: 'login-redirect' }
  | { status: 'not-enabled' }
  | { status: 'ask'; clientName: string; redirectUri: string }
  | { status: 'redirected' }
  | { status: 'error' }

export interface ConsentDeps {
  getCurrentUserId: () => string | null
  /** Whether this user may connect AI clients (has_mcp_access(), the same check the function makes). */
  hasMcpAccess: () => Promise<boolean>
  getDetails: (authorizationId: string) => Promise<ConsentDetails>
  savePostLoginRedirect: (path: string) => void
  navigate: (path: string) => void
  /** Full-page navigation to the AI client — leaves the app. */
  leaveTo: (url: string) => void
}

// Supabase's authorization ids are opaque; this only refuses what cannot be one, so a mangled
// link fails here instead of as a confusing server error.
const AUTHORIZATION_ID = /^[A-Za-z0-9_-]{8,200}$/

export function isAuthorizationId(value: unknown): value is string {
  return typeof value === 'string' && AUTHORIZATION_ID.test(value)
}

export async function startConsent(authorizationId: unknown, fullPath: string, deps: ConsentDeps): Promise<ConsentStart> {
  if (!isAuthorizationId(authorizationId)) return { status: 'invalid' }

  if (deps.getCurrentUserId() === null) {
    deps.savePostLoginRedirect(fullPath)
    deps.navigate('/login')
    return { status: 'login-redirect' }
  }

  try {
    // Checked before anything is shown, so a user outside the beta is never asked to grant
    // access the connection would then refuse to use.
    if (!(await deps.hasMcpAccess())) return { status: 'not-enabled' }

    const details = await deps.getDetails(authorizationId)
    if (details.kind === 'redirect') {
      deps.leaveTo(details.url)
      return { status: 'redirected' }
    }
    return { status: 'ask', clientName: details.clientName, redirectUri: details.redirectUri }
  } catch {
    return { status: 'error' }
  }
}

/** What the connection may do, shown on the consent screen. Kept next to the flow so the list
 *  is reviewed together with the tool set in supabase/functions/mcp/server.ts. */
export const CONSENT_CAN = [
  'See your events, tasks and day todos, including those on calendars shared with you',
  'Add events and todos, change events you created, and tick todos off'
]
export const CONSENT_CANNOT = ['Delete anything', 'Change other members’ events']
