'use client'

// ── Anonymous, cookie-free, client-side analytics beacon ─────────────────────
//
// Uses an ephemeral session ID stored in sessionStorage (cleared when the tab
// closes — NOT localStorage, NOT a cookie, NOT persistent across sessions).
// No PII is ever sent. Failures are silently swallowed so analytics can never
// break playback.

function getSid(): string {
  try {
    let id = sessionStorage.getItem('ra_sid')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('ra_sid', id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

/**
 * Fire-and-forget event. Uses sendBeacon so it survives page unload.
 *
 * @param event    One of the valid event names defined in the collect route.
 * @param location Stream ID, e.g. "knepp".
 * @param value    Optional numeric payload (duration_seconds, sleep_minutes).
 */
export function track(
  event: string,
  location?: string,
  value?: number,
): void {
  if (typeof window === 'undefined') return
  try {
    const body = JSON.stringify({
      event,
      location: location ?? null,
      value:    value    ?? null,
      sid:      getSid(),
    })
    // sendBeacon with Blob ensures Content-Type: application/json and
    // survives tab close / navigation.
    const sent = navigator.sendBeacon(
      '/api/analytics/collect',
      new Blob([body], { type: 'application/json' }),
    )
    if (!sent) {
      // Beacon queue full — fall back to fetch with keepalive
      fetch('/api/analytics/collect', {
        method:   'POST',
        body,
        keepalive: true,
        headers:  { 'Content-Type': 'application/json' },
      }).catch(() => {})
    }
  } catch {
    // Analytics must never throw or affect playback
  }
}
