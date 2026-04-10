// Sri Krishnaa Dairy — Service Worker
// Handles push notifications and offline caching

const CACHE_NAME = 'skd-v1'
const STATIC_ASSETS = ['/', '/manifest.json', '/Logo.jpg']

// ── Install: cache static assets ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch: network-first for API, cache-first for assets ─────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) return // never cache API calls
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})

// ── Push: show notification ───────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Sri Krishnaa Dairy', body: 'You have a new notification.' }
  try {
    data = event.data.json()
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
      data: { url: data.url || '/dashboard' },
      requireInteraction: data.requireInteraction || false,
    })
  )
})

// ── Notification click: open target URL ──────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
