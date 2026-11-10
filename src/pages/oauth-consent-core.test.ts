import { describe, it, expect, vi } from 'vitest'
import { startConsent, type ConsentDeps } from './oauth-consent-core'

function deps(overrides: Partial<ConsentDeps> = {}): ConsentDeps {
  return {
    getCurrentUserId: () => 'me',
    hasMcpAccess: vi.fn(async () => true),
    getDetails: vi.fn(async () => ({ kind: 'ask' as const, clientName: 'Claude', redirectUri: 'https://claude.ai/api/mcp/auth_callback' })),
    savePostLoginRedirect: vi.fn(),
    navigate: vi.fn(),
    leaveTo: vi.fn(),
    ...overrides
  }
}

const ID = 'auth_0123456789abcdef'
const PATH = `/oauth/consent?authorization_id=${ID}`

describe('startConsent', () => {
  it('asks when the user is signed in, enabled, and has not approved this client before', async () => {
    expect(await startConsent(ID, PATH, deps())).toEqual({
      status: 'ask',
      clientName: 'Claude',
      redirectUri: 'https://claude.ai/api/mcp/auth_callback'
    })
  })

  it('refuses a missing or malformed id without calling anything', async () => {
    const d = deps()
    expect(await startConsent(undefined, PATH, d)).toEqual({ status: 'invalid' })
    expect(await startConsent('bad id!', PATH, d)).toEqual({ status: 'invalid' })
    expect(d.getDetails).not.toHaveBeenCalled()
  })

  it('sends a signed-out user to log in and keeps the way back', async () => {
    const d = deps({ getCurrentUserId: () => null })
    expect(await startConsent(ID, PATH, d)).toEqual({ status: 'login-redirect' })
    expect(d.savePostLoginRedirect).toHaveBeenCalledWith(PATH)
    expect(d.navigate).toHaveBeenCalledWith('/login')
  })

  it('stops a user outside the beta before showing any grant', async () => {
    const d = deps({ hasMcpAccess: async () => false })
    expect(await startConsent(ID, PATH, d)).toEqual({ status: 'not-enabled' })
    expect(d.getDetails).not.toHaveBeenCalled()
  })

  it('goes straight back to the client when it was approved before', async () => {
    const d = deps({ getDetails: async () => ({ kind: 'redirect', url: 'https://claude.ai/cb?code=x' }) })
    expect(await startConsent(ID, PATH, d)).toEqual({ status: 'redirected' })
    expect(d.leaveTo).toHaveBeenCalledWith('https://claude.ai/cb?code=x')
  })

  it('reports a failed lookup as an error', async () => {
    const d = deps({
      getDetails: async () => {
        throw new Error('authorization not found')
      }
    })
    expect(await startConsent(ID, PATH, d)).toEqual({ status: 'error' })
  })
})
