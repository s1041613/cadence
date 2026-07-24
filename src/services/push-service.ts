import { requireSupabase } from '@/lib/supabase'

// Pure I/O layer for Web Push subscriptions, mirroring events-service's style:
// no store access, callers own orchestration. Talks to the browser Push API and
// the `push_subscriptions` table only.

const REQUEST_TIMEOUT_MS = 10_000
function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS)
}

// applicationServerKey wants the raw 65-byte P-256 point, not the base64url
// string the VAPID tooling emits — decode url-safe base64 to bytes here.
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  // Explicit ArrayBuffer backing so the result satisfies BufferSource for
  // pushManager.subscribe()'s applicationServerKey (a plain Uint8Array widens to
  // ArrayBufferLike, which the DOM lib rejects).
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export function isPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// Register from a base-anchored absolute path, NOT a relative 'sw.js'. Under a
// history-mode subroute like /v2/settings a relative 'sw.js' resolves to
// /v2/sw.js, which the dev server / SPA fallback answers with index.html — the
// browser then rejects the SW ("unsupported MIME type 'text/html'"). BASE_URL is
// '/' in dev and '/cadence/' on GitHub Pages, so this is correct in both.
export function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const base = import.meta.env.BASE_URL
  return navigator.serviceWorker.register(`${base}sw.js`, { scope: base })
}

export type SubscribeStatus = 'subscribed' | 'denied' | 'unsupported'

export interface SubscribeResult {
  status: SubscribeStatus
}

export async function subscribeToPush(userId: string): Promise<SubscribeResult> {
  if (!isPushSupported()) return { status: 'unsupported' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { status: 'denied' }

  const vapidKey = import.meta.env.QCLI_VAPID_PUBLIC_KEY
  if (!vapidKey) throw new Error('QCLI_VAPID_PUBLIC_KEY is not configured')

  await registerServiceWorker()
  const registration = await navigator.serviceWorker.ready

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey)
  })

  // unique(user_id, payload): re-subscribing the same endpoint would collide,
  // so ignore duplicates rather than error.
  const { error } = await requireSupabase()
    .from('push_subscriptions')
    .upsert(
      { user_id: userId, type: 'webpush', payload: subscription.toJSON() },
      { onConflict: 'user_id,payload', ignoreDuplicates: true }
    )
    .abortSignal(timeoutSignal())
  if (error) throw error

  return { status: 'subscribed' }
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!isPushSupported()) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  const endpoint = subscription.toJSON().endpoint
  await subscription.unsubscribe()

  // Delete only this device's row (endpoint is the per-device identity).
  if (endpoint) {
    const { error } = await requireSupabase()
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('type', 'webpush')
      .filter('payload->>endpoint', 'eq', endpoint)
      .abortSignal(timeoutSignal())
    if (error) throw error
  }
}

// The switch's source of truth is the browser's own subscription, not a stored
// boolean — subscriptions are per-device, so a profile flag can't express
// "on for phone, off for desktop".
export async function hasActiveSubscription(_userId: string): Promise<boolean> {
  if (!isPushSupported()) return false
  const registration = await navigator.serviceWorker.ready.catch(() => null)
  if (!registration) return false
  const subscription = await registration.pushManager.getSubscription()
  return Boolean(subscription)
}
