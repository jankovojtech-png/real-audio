# PWA Support — Real Audio

## Overview

Real Audio is a Progressive Web App (PWA). Users can install it to their home screen on iPhone, Android, and desktop Chrome. Once installed, the app:

- Runs in standalone mode (no browser chrome)
- Shows the correct app icon on the home screen
- Handles safe areas (notch, home indicator) on mobile
- Shows a friendly offline page when the network is unavailable
- Integrates with the OS lock screen via Web Media Session API (see `STREAM_HEALTH.md`)

---

## Install Behavior

| Platform | How to install |
|---|---|
| **Android Chrome** | Browser shows "Add to home screen" banner automatically; or tap ⋮ → "Install app" |
| **iOS Safari** | Tap Share → "Add to Home Screen" |
| **Desktop Chrome/Edge** | Address bar install icon (⊕) appears when PWA criteria are met |
| **Firefox** | Not supported (Firefox does not prompt for PWA install) |

Once installed, the app opens in `standalone` mode: full-screen, no browser bars, dark background fills the status bar area.

---

## File Map

```
app/
├── icon.tsx                    ← Favicon (32×32 PNG via ImageResponse)
├── apple-icon.tsx              ← iOS home screen icon (180×180 PNG)
├── pwa-icon/
│   └── [size]/route.ts         ← Manifest icons: /pwa-icon/192 and /pwa-icon/512
├── components/
│   └── ServiceWorkerRegistration.tsx  ← Registers /sw.js on mount
├── layout.tsx                  ← manifest link, appleWebApp, viewport
└── globals.css                 ← safe-area-inset-* support

public/
├── manifest.json               ← PWA web app manifest
├── offline.html                ← Self-contained offline fallback page
└── sw.js                       ← Service worker
```

---

## Manifest (`public/manifest.json`)

```json
{
  "name": "Real Audio",
  "short_name": "Real Audio",
  "description": "Listen to real live ambient sound from places around the world.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#080c10",
  "theme_color": "#080c10",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/pwa-icon/192", "sizes": "192x192", "type": "image/png" },
    { "src": "/pwa-icon/512", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- `background_color` and `theme_color` both match `#080c10` so the splash screen and status bar are consistent with the app's dark UI.
- Icons are served dynamically from the Edge Runtime route `app/pwa-icon/[size]/route.ts` using Next.js `ImageResponse` — no binary asset files required.

---

## App Icons

All icons use the same design: **three concentric rings on a dark background with an indigo center dot**. This mirrors the pulsing ring animation shown during active playback.

| File | Size | Usage |
|---|---|---|
| `app/icon.tsx` | 32×32 | Browser favicon (auto-linked by Next.js) |
| `app/apple-icon.tsx` | 180×180 | iOS home screen shortcut (auto-linked by Next.js) |
| `app/pwa-icon/[size]/route.ts` | 192/512 | Android Chrome install icon, desktop PWA icon |

Icons are generated at runtime via `next/og` (`ImageResponse`) on the Edge Runtime. No PNG build artifacts.

---

## Service Worker (`public/sw.js`)

**Strategy**: network-first for HTML navigation, no caching of anything else.

```
Install  → pre-cache /offline.html
Activate → delete old caches
Fetch    → for mode=navigate: try network, serve /offline.html on failure
         → for /api/* (audio stream): never intercept
         → all other requests: pass through (no caching)
```

Why no caching of JS/CSS assets? The app's JS bundles use content-hashed filenames from Next.js's build system. Caching them in a service worker creates version drift problems. For a simple app with no offline functionality beyond the error page, network-first-only is the cleanest approach.

Why not cache audio streams? Live audio streams are infinite, never cacheable, and change on every request. Intercepting them would break playback without any benefit.

---

## Offline Page (`public/offline.html`)

A fully self-contained HTML file with **inline styles** (no external dependencies). This ensures it displays correctly even when CSS bundles can't be loaded.

Features:
- Matches the app's dark color scheme (`#080c10` background)
- Shows the app's concentric-circle icon (inline SVG)
- Explains the network requirement clearly
- Includes a "Retry" button that reloads the page

---

## iOS Standalone Mode

The following settings ensure a native-like experience on iOS:

```typescript
// app/layout.tsx
export const metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',  // status bar overlaps the app
    title: 'Real Audio',
  },
}

export const viewport = {
  themeColor:  '#080c10',
  viewportFit: 'cover',   // enables env(safe-area-inset-*)
}
```

```css
/* app/globals.css */
@supports (padding: env(safe-area-inset-bottom)) {
  body {
    padding-bottom: env(safe-area-inset-bottom);
    padding-top: env(safe-area-inset-top);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
}
```

`statusBarStyle: 'black-translucent'` + `viewportFit: 'cover'` lets the app draw under the status bar, and the safe-area padding ensures content is not obscured by the home indicator.

---

## Service Worker Registration

Registered by `app/components/ServiceWorkerRegistration.tsx` — a 15-line client component rendered in the root layout. It calls `navigator.serviceWorker.register('/sw.js')` on mount, guarded by a feature check. Errors are silently ignored (e.g., in some embedded browser contexts that disable SW).

---

## Known Limitations

- **No asset caching**: JS/CSS bundles are not cached. The app requires a network connection to load for the first time and after SW cache busting.
- **Maskable icon padding**: The 512×512 icon uses `purpose: "any maskable"`, but the concentric-ring design does not include explicit maskable safe-zone padding (33% inset). On adaptive-icon platforms, the rings may be slightly cropped. A separate fully padded maskable icon would improve this.
- **iOS limitations**: iOS Safari does not support the Web App Manifest's `shortcuts` or `share_target` entries. Background audio works correctly in standalone mode once the user presses Play.
- **SW update**: When `sw.js` changes, existing users get the update on next navigation (because `skipWaiting()` is called on install). A "New version available" UI prompt is not implemented.
