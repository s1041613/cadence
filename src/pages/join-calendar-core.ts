// Extracted from JoinCalendarPage.vue so the join flow's branches are unit-testable without
// mocking the router or Pinia (same rationale as boot/auth-data-sync-core.ts).

// accept_invite tokens are gen_random_bytes(16) hex — anything else is rejected client-side
// before any network request.
const TOKEN_PATTERN = /^[0-9a-f]{32}$/

export type JoinFlowResult =
  | { status: 'success'; calendarId: string }
  | { status: 'login-redirect' }
  | { status: 'invalid' }
  | { status: 'error' }
  | { status: 'stale' }

export interface RunJoinFlowDeps {
  // Reads the *current* signed-in user id at the moment it's called — consulted twice so a
  // logout/account switch during the wait aborts before the membership write.
  getCurrentUserId: () => string | null
  // Resolves true once calendars-store.isLoaded, false on the page's timeout safety net.
  waitForCalendarsLoaded: () => Promise<boolean>
  acceptInvite: (token: string) => Promise<string>
  // Reload calendars, normalize member positions, reload events — owned by the page since it
  // composes the stores.
  reloadAfterJoin: (userId: string) => Promise<void>
  savePostLoginRedirect: (path: string) => void
  navigate: (path: string) => void
}

export async function runJoinFlow(token: string, fullPath: string, deps: RunJoinFlowDeps): Promise<JoinFlowResult> {
  if (!TOKEN_PATTERN.test(token)) {
    return { status: 'invalid' }
  }

  const userId = deps.getCurrentUserId()
  if (userId === null) {
    deps.savePostLoginRedirect(fullPath)
    deps.navigate('/login')
    return { status: 'login-redirect' }
  }

  const loaded = await deps.waitForCalendarsLoaded()
  if (!loaded) {
    return { status: 'error' }
  }

  if (deps.getCurrentUserId() !== userId) {
    return { status: 'stale' }
  }

  let calendarId: string
  try {
    calendarId = await deps.acceptInvite(token)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return message.includes('invalid or expired invite') ? { status: 'invalid' } : { status: 'error' }
  }

  // The reload is part of the contract flow — surfacing its failure gives the user a Retry that
  // safely re-runs accept_invite (idempotent for existing members) and the reload.
  try {
    await deps.reloadAfterJoin(userId)
  } catch {
    return { status: 'error' }
  }

  deps.navigate('/')
  return { status: 'success', calendarId }
}
