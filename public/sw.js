// Cadence push-only service worker.
//
// Zero-cache by design: no `fetch` handler and no precache. This SW never
// intercepts page resource loads, so it can never serve a stale HTML/JS bundle
// — the exact GitHub Pages cache hazard we avoid by NOT using Quasar PWA mode /
// Workbox. `push` and `notificationclick` are stateless handlers, so an old
// waiting SW is harmless: the browser starts the current version to deliver the
// next push. No skipWaiting()/clients.claim() version-grabbing needed.
//
// Base path is derived from `registration.scope` (dev '/', GitHub Pages
// '/cadence/') so nothing is hard-coded. This file is copied verbatim into
// dist/ by `quasar build`; it is not part of the app bundle.

// Resolve an app-relative URL against the SW's own scope, e.g. base '/cadence/'
// + 'v2/month' -> '/cadence/v2/month'. Absolute paths (starting with '/') are
// returned unchanged so callers can still pass a fully-qualified path if needed.
function scopedUrl(path) {
  return new URL(path, self.registration.scope).pathname
}

self.addEventListener('push', (event) => {
  // The sender guarantees JSON { title, body, url, tag }. Fall back defensively
  // so a malformed / empty payload still shows something rather than throwing.
  let payload = { title: 'Cadence', body: '', url: 'v2/month', tag: undefined }
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() }
    } catch {
      payload.body = event.data.text()
    }
  }

  const icon = scopedUrl('icons/favicon-512x512.png')

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon,
      badge: icon,
      data: { url: payload.url },
      tag: payload.tag
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const target = scopedUrl(event.notification.data?.url || 'v2/month')

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

      // Focus (and navigate) an existing Cadence window if one is open.
      for (const client of allClients) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(target).catch(() => {})
          return
        }
      }

      // Otherwise open a fresh window at the target.
      if (self.clients.openWindow) await self.clients.openWindow(target)
    })()
  )
})
