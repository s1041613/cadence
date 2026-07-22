import { describe, it, expect, vi } from 'vitest'
import { runJoinFlow, type RunJoinFlowDeps } from './join-calendar-core'

const VALID_TOKEN = 'abcdef0123456789abcdef0123456789'

function mkDeps(overrides: Partial<RunJoinFlowDeps> = {}): RunJoinFlowDeps {
  return {
    getCurrentUserId: vi.fn(() => 'user-1'),
    waitForCalendarsLoaded: vi.fn(async () => true),
    acceptInvite: vi.fn(async () => 'joined-cal-id'),
    reloadAfterJoin: vi.fn(async () => {}),
    savePostLoginRedirect: vi.fn(),
    navigate: vi.fn(),
    ...overrides
  }
}

describe('runJoinFlow', () => {
  it('rejects a malformed token without any network or navigation', async () => {
    const deps = mkDeps()

    const result = await runJoinFlow('deadbeef', '/join/deadbeef', deps)

    expect(result).toEqual({ status: 'invalid' })
    expect(deps.acceptInvite).not.toHaveBeenCalled()
    expect(deps.savePostLoginRedirect).not.toHaveBeenCalled()
    expect(deps.navigate).not.toHaveBeenCalled()
  })

  it('saves the join destination and redirects to login when signed out', async () => {
    const deps = mkDeps({ getCurrentUserId: vi.fn(() => null) })

    const result = await runJoinFlow(VALID_TOKEN, `/join/${VALID_TOKEN}`, deps)

    expect(result).toEqual({ status: 'login-redirect' })
    expect(deps.savePostLoginRedirect).toHaveBeenCalledWith(`/join/${VALID_TOKEN}`)
    expect(deps.navigate).toHaveBeenCalledWith('/login')
    expect(deps.acceptInvite).not.toHaveBeenCalled()
  })

  it('accepts the invite, reloads data, and navigates home on success', async () => {
    const deps = mkDeps()

    const result = await runJoinFlow(VALID_TOKEN, `/join/${VALID_TOKEN}`, deps)

    expect(result).toEqual({ status: 'success', calendarId: 'joined-cal-id' })
    expect(deps.waitForCalendarsLoaded).toHaveBeenCalled()
    expect(deps.acceptInvite).toHaveBeenCalledWith(VALID_TOKEN)
    expect(deps.reloadAfterJoin).toHaveBeenCalledWith('user-1')
    expect(deps.navigate).toHaveBeenCalledWith('/')
  })

  it('maps the RPC invalid-or-expired rejection to the invalid state', async () => {
    const deps = mkDeps({ acceptInvite: vi.fn(async () => Promise.reject(new Error('invalid or expired invite'))) })

    const result = await runJoinFlow(VALID_TOKEN, `/join/${VALID_TOKEN}`, deps)

    expect(result).toEqual({ status: 'invalid' })
    expect(deps.reloadAfterJoin).not.toHaveBeenCalled()
    expect(deps.navigate).not.toHaveBeenCalled()
  })

  it('maps other failures (network) to the error state', async () => {
    const deps = mkDeps({ acceptInvite: vi.fn(async () => Promise.reject(new Error('fetch failed'))) })

    const result = await runJoinFlow(VALID_TOKEN, `/join/${VALID_TOKEN}`, deps)

    expect(result).toEqual({ status: 'error' })
  })

  it('errors without writing when the calendars load never completes (timeout)', async () => {
    const deps = mkDeps({ waitForCalendarsLoaded: vi.fn(async () => false) })

    const result = await runJoinFlow(VALID_TOKEN, `/join/${VALID_TOKEN}`, deps)

    expect(result).toEqual({ status: 'error' })
    expect(deps.acceptInvite).not.toHaveBeenCalled()
  })

  it('aborts without writing when the session user changes mid-flow (stale session)', async () => {
    const getCurrentUserId = vi.fn(() => 'user-1')
    const deps = mkDeps({ getCurrentUserId })
    getCurrentUserId.mockReturnValueOnce('user-1').mockReturnValue('user-2')

    const result = await runJoinFlow(VALID_TOKEN, `/join/${VALID_TOKEN}`, deps)

    expect(result).toEqual({ status: 'stale' })
    expect(deps.acceptInvite).not.toHaveBeenCalled()
  })

  it('surfaces a retryable error when the post-join reload fails (contract: reload is part of the flow)', async () => {
    const deps = mkDeps({ reloadAfterJoin: vi.fn(async () => Promise.reject(new Error('reload failed'))) })

    const result = await runJoinFlow(VALID_TOKEN, `/join/${VALID_TOKEN}`, deps)

    expect(result).toEqual({ status: 'error' })
    expect(deps.navigate).not.toHaveBeenCalled()
    // retrying is safe: accept_invite is idempotent for existing members
  })
})
