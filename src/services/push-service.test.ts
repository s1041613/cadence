import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  urlBase64ToUint8Array,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  hasActiveSubscription
} from './push-service'

const requireSupabaseMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => requireSupabaseMock()
}))

// A real VAPID public key is 65 bytes base64url-encoded (uncompressed P-256 point).
const SAMPLE_VAPID = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8'

const USER_ID = 'user-1'
const ENDPOINT = 'https://push.example.com/abc123'

function makeSubscription() {
  const toJSON = () => ({ endpoint: ENDPOINT, keys: { p256dh: 'k', auth: 'a' } })
  return { toJSON, unsubscribe: vi.fn(async () => true), endpoint: ENDPOINT }
}

describe('urlBase64ToUint8Array', () => {
  it('decodes a base64url string to raw bytes without throwing on url-safe chars', () => {
    const out = urlBase64ToUint8Array(SAMPLE_VAPID)
    expect(out).toBeInstanceOf(Uint8Array)
    // base64 decodes 4 chars -> 3 bytes; the sample has no padding so length is
    // floor(len*3/4). The point is url-safe '-'/'_' don't break atob after the
    // +/ swap, and the result is non-empty raw bytes.
    expect(out.length).toBeGreaterThan(0)
  })

  it('round-trips a known byte sequence through standard base64', () => {
    // 'Ba8' (standard base64) decodes to bytes [0x05, 0xaf] — verifies the
    // decode math, independent of any particular VAPID key.
    const out = urlBase64ToUint8Array('Ba8=')
    expect(Array.from(out)).toEqual([0x05, 0xaf])
  })
})

describe('isPushSupported', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns false when serviceWorker is missing', () => {
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('window', {})
    expect(isPushSupported()).toBe(false)
  })

  it('returns true when serviceWorker, PushManager and Notification all exist', () => {
    vi.stubGlobal('navigator', { serviceWorker: {} })
    vi.stubGlobal('window', { PushManager: class {}, Notification: class {} })
    // Notification is read off window in the guard via globalThis; expose it there too.
    vi.stubGlobal('Notification', class {})
    vi.stubGlobal('PushManager', class {})
    expect(isPushSupported()).toBe(true)
  })
})

describe('subscribeToPush', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('QCLI_VAPID_PUBLIC_KEY', SAMPLE_VAPID)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('returns unsupported when the browser lacks push APIs', async () => {
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('window', {})
    vi.stubGlobal('Notification', undefined)
    const result = await subscribeToPush(USER_ID)
    expect(result.status).toBe('unsupported')
  })

  it('returns denied and does not write DB when permission is refused', async () => {
    const requestPermission = vi.fn(async () => 'denied')
    vi.stubGlobal('Notification', Object.assign(class {}, { requestPermission }))
    vi.stubGlobal('PushManager', class {})
    vi.stubGlobal('navigator', { serviceWorker: {} })
    vi.stubGlobal('window', { PushManager: class {}, Notification: class {} })

    const result = await subscribeToPush(USER_ID)
    expect(result.status).toBe('denied')
    expect(requireSupabaseMock).not.toHaveBeenCalled()
  })

  it('subscribes and upserts push_subscriptions with webpush type on granted permission', async () => {
    const subscription = makeSubscription()
    const abortSignal = vi.fn(async () => ({ error: null }))
    const upsert = vi.fn(() => ({ abortSignal }))
    const supabase = { from: vi.fn(() => ({ upsert })) }
    requireSupabaseMock.mockReturnValue(supabase)

    // BASE_URL is '/cadence/' on GitHub Pages; the SW must register from that
    // base, not a relative 'sw.js' (which breaks under /v2/* subroutes).
    vi.stubEnv('BASE_URL', '/cadence/')
    const requestPermission = vi.fn(async () => 'granted')
    const register = vi.fn(async () => registrationValue)
    const registrationValue = {
      pushManager: { subscribe: vi.fn(async () => subscription) }
    }
    vi.stubGlobal('Notification', Object.assign(class {}, { requestPermission }))
    vi.stubGlobal('PushManager', class {})
    vi.stubGlobal('navigator', {
      serviceWorker: {
        register,
        ready: Promise.resolve(registrationValue)
      }
    })
    vi.stubGlobal('window', { PushManager: class {}, Notification: class {} })

    const result = await subscribeToPush(USER_ID)

    expect(result.status).toBe('subscribed')
    // Absolute, base-anchored path + scope — never a bare relative 'sw.js'.
    expect(register).toHaveBeenCalledWith('/cadence/sw.js', { scope: '/cadence/' })
    expect(supabase.from).toHaveBeenCalledWith('push_subscriptions')
    expect(upsert).toHaveBeenCalledWith(
      { user_id: USER_ID, type: 'webpush', payload: subscription.toJSON() },
      { onConflict: 'user_id,payload', ignoreDuplicates: true }
    )
    expect(registrationValue.pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true })
    )
  })
})

describe('unsubscribeFromPush', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('unsubscribes locally and deletes the matching endpoint row', async () => {
    const subscription = makeSubscription()
    const abortSignal = vi.fn(async () => ({ error: null }))
    const filter = vi.fn(() => ({ abortSignal }))
    const eqType = vi.fn(() => ({ filter }))
    const eqUser = vi.fn(() => ({ eq: eqType }))
    const del = vi.fn(() => ({ eq: eqUser }))
    const supabase = { from: vi.fn(() => ({ delete: del })) }
    requireSupabaseMock.mockReturnValue(supabase)

    const registration = {
      pushManager: { getSubscription: vi.fn(async () => subscription) }
    }
    vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve(registration) } })
    vi.stubGlobal('window', { PushManager: class {}, Notification: class {} })
    vi.stubGlobal('PushManager', class {})
    vi.stubGlobal('Notification', class {})

    await unsubscribeFromPush(USER_ID)

    expect(subscription.unsubscribe).toHaveBeenCalled()
    expect(supabase.from).toHaveBeenCalledWith('push_subscriptions')
    expect(eqUser).toHaveBeenCalledWith('user_id', USER_ID)
    expect(filter).toHaveBeenCalledWith('payload->>endpoint', 'eq', ENDPOINT)
  })

  it('is a no-op when there is no local subscription', async () => {
    const registration = { pushManager: { getSubscription: vi.fn(async () => null) } }
    vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve(registration) } })
    vi.stubGlobal('window', { PushManager: class {}, Notification: class {} })
    vi.stubGlobal('PushManager', class {})
    vi.stubGlobal('Notification', class {})

    await unsubscribeFromPush(USER_ID)
    expect(requireSupabaseMock).not.toHaveBeenCalled()
  })
})

describe('hasActiveSubscription', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reflects whether the browser has a local push subscription', async () => {
    const registration = { pushManager: { getSubscription: vi.fn(async () => makeSubscription()) } }
    vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve(registration) } })
    vi.stubGlobal('window', { PushManager: class {}, Notification: class {} })
    vi.stubGlobal('PushManager', class {})
    vi.stubGlobal('Notification', class {})

    await expect(hasActiveSubscription(USER_ID)).resolves.toBe(true)
  })
})
