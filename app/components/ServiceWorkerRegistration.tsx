'use client'

import { useEffect } from 'react'

// Registers /sw.js on mount. Rendered once in the root layout.
// No UI — returns null.
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => { /* silently ignore: SW unavailable in some environments */ })
  }, [])

  return null
}
