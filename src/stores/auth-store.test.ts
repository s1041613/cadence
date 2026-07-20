import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Session } from '@supabase/supabase-js'

// Mock holders live inside vi.hoisted so they are initialised before the
// hoisted vi.mock factory runs and before the store module is imported.
const h = vi.hoisted(() => {
  const state: {
    getSessionResult: { data: { session: unknown }; error: { message: string } | null }
    authStateCallback: ((event: string, session: unknown) => void) | null
  } = {
    getSessionResult: { data: { session: null }, error: null },
    authStateCallback: null
  }
  return {
    state,
    signOutMock: vi.fn(async () => ({ error: null as { message: string } | null })),
    onAuthStateChangeMock: vi.fn((cb: (event: string, session: unknown) => void) => {
      state.authStateCallback = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
  }
})

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  authCallbackUrl: () => 'http://localhost/auth/callback',
  supabase: {
    auth: {
      getSession: vi.fn(async () => h.state.getSessionResult),
      onAuthStateChange: h.onAuthStateChangeMock,
      signOut: h.signOutMock,
      signInWithOAuth: vi.fn(async () => ({ error: null }))
    }
  }
}))

import { useAuthStore } from './auth-store'
import { useUiStore } from './ui-store'

function fakeSession(userId = 'user-1'): Session {
  return {
    access_token: 'token',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: userId, user_metadata: {} }
  } as unknown as Session
}

describe('auth-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    h.state.getSessionResult = { data: { session: null }, error: null }
    h.state.authStateCallback = null
    h.signOutMock.mockClear()
    h.onAuthStateChangeMock.mockClear()
  })

  it('marks isReady after init even when no session exists', async () => {
    const store = useAuthStore()
    expect(store.isReady).toBe(false)

    await store.init()

    expect(store.isReady).toBe(true)
    expect(store.isLoading).toBe(false)
    expect(store.isSignedIn).toBe(false)
  })

  it('populates user and session from an existing session on init', async () => {
    h.state.getSessionResult = { data: { session: fakeSession() }, error: null }
    const store = useAuthStore()

    await store.init()

    expect(store.isSignedIn).toBe(true)
    expect(store.user?.id).toBe('user-1')
  })

  it('updates user when onAuthStateChange fires with a session', async () => {
    const store = useAuthStore()
    await store.init()
    expect(store.isSignedIn).toBe(false)

    h.state.authStateCallback?.('SIGNED_IN', fakeSession('user-2'))

    expect(store.isSignedIn).toBe(true)
    expect(store.user?.id).toBe('user-2')
  })

  it('sets the month view idempotently on repeated sign-in events', async () => {
    const ui = useUiStore()
    ui.activeView = 'day'
    const store = useAuthStore()
    await store.init()

    // Multiple SIGNED_IN / INITIAL_SESSION events must not throw or attempt a
    // full-page redirect — they only reset the view. (No window in node env,
    // so any window.location.replace call would throw here.)
    h.state.authStateCallback?.('INITIAL_SESSION', fakeSession())
    h.state.authStateCallback?.('SIGNED_IN', fakeSession())

    expect(ui.activeView).toBe('month')
    expect(store.isSignedIn).toBe(true)
  })

  it('clears user and session on signOut', async () => {
    h.state.getSessionResult = { data: { session: fakeSession() }, error: null }
    const store = useAuthStore()
    await store.init()
    expect(store.isSignedIn).toBe(true)

    await store.signOut()

    expect(store.isSignedIn).toBe(false)
    expect(store.session).toBeNull()
  })
})
