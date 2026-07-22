import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { savePostLoginRedirect, consumePostLoginRedirect } from './post-login-redirect'

function fakeSessionStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    }
  }
}

describe('post-login-redirect', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', fakeSessionStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips a /join path through save and consume', () => {
    savePostLoginRedirect('/join/abcdef0123456789abcdef0123456789')
    expect(consumePostLoginRedirect()).toBe('/join/abcdef0123456789abcdef0123456789')
  })

  it('consumes at most once — the second consume returns null', () => {
    savePostLoginRedirect('/join/abcdef0123456789abcdef0123456789')
    consumePostLoginRedirect()
    expect(consumePostLoginRedirect()).toBeNull()
  })

  it('rejects stored values that do not start with /join/ (open-redirect protection)', () => {
    savePostLoginRedirect('https://evil.example/phish')
    expect(consumePostLoginRedirect()).toBeNull()

    savePostLoginRedirect('/settings')
    expect(consumePostLoginRedirect()).toBeNull()
  })

  it('returns null when nothing was saved', () => {
    expect(consumePostLoginRedirect()).toBeNull()
  })

  it('never throws when sessionStorage is unavailable', () => {
    vi.stubGlobal('sessionStorage', undefined)
    expect(() => savePostLoginRedirect('/join/abc')).not.toThrow()
    expect(consumePostLoginRedirect()).toBeNull()
  })
})
