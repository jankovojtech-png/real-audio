// Real Audio — Service Worker
// Strategy: network-first navigation, offline fallback for HTML pages only.
// Live audio streams (/api/stream) are never intercepted.

const CACHE_NAME  = 'real-audio-v1'
const OFFLINE_URL = '/offline.html'

// ── Install ──────────────────────────────────────────────────────────────────
// Pre-cache the offline page so it is available without a network connection.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_URL))
      .catch(() => { /* silently skip if offline page can't be fetched */ })
  )
  // Take control immediately without waiting for old SW to be discarded.
  self.skipWaiting()
})

// ── Activate ─────────────────────────────────────────────────────────────────
// Delete any caches from previous versions so we don't serve stale assets.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
// Only intercept HTML navigation requests. Let all other requests (JS bundles,
// CSS, audio stream, icons) pass through to the network unchanged.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return

  const url = new URL(event.request.url)

  // Never intercept the live audio stream API.
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(event.request)
      .catch(() =>
        caches.match(OFFLINE_URL).then(
          (cached) =>
            cached ??
            new Response(
              '<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Offline — Real Audio</title></head>' +
              '<body style="margin:0;background:#080c10;display:flex;min-height:100svh;align-items:center;justify-content:center;font-family:system-ui,sans-serif;">' +
              '<p style="color:#475569;font-size:0.75rem;letter-spacing:0.1em;text-align:center">Real Audio needs internet to stream live sound.</p>' +
              '</body></html>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            )
        )
      )
  )
})
