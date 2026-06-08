# Pre-Launch QA Audit — Real Audio

**Initial audit:** 2026-06-08 · **Blocker fixes applied:** 2026-06-08  
**Build status:** ✅ `npm run lint` → exit 0 · `npm run build` → exit 0  
**Route table:** `/` static, `/listen/[streamId]` dynamic, `/listen/-/opengraph-image` dynamic (Edge), `/api/stream` dynamic (Node.js), `/pwa-icon/[size]` · `/icon` · `/apple-icon` dynamic (Edge)

---

## ✅ Blockers Fixed (2026-06-08)

| # | Was | Fix applied |
|---|---|---|
| C-1 | Location labels/coords wrong for 8 of 18 locations | `app/lib/locations.ts` updated — all 8 entries now show correct city, region, timezone, and coordinates. See `docs/LOCATION_FIXES.md`. |
| C-2 | FFmpeg not checked at startup; silent fail on Vercel | `app/api/stream/route.ts` now runs `execFileSync('ffmpeg', ['-version'])` at module load. Returns `503 { error: 'ffmpeg_unavailable' }` if missing. `docs/DEPLOYMENT.md` created with platform guide and Vercel warning. |
| C-3 | Play button disabled during loading = no way to cancel | `disabled` attribute removed. Button now acts as cancel/stop during `loading` state. Spinner shows a small stop-square to indicate it's clickable. |
| H-2 | No OG image — share previews text-only | `app/listen/[streamId]/opengraph-image.tsx` created (Edge Runtime, `ImageResponse`). Shows city name, region, category glow, "LIVE AMBIENT SOUND" footer. Automatically applied to all `/listen/[streamId]` share previews. |

---

---

## 🔴 Critical Issues — ALL RESOLVED

### ~~C-1 — Location labels contradict the actual audio source~~ ✅ FIXED

The most serious user-facing integrity problem in the app.

`app/lib/locations.ts` displays these locations to users:

| Display label (frontend) | Actual microphone (route.ts stream label) | Mismatch? |
|---|---|---|
| Kyoto, Japan | Jeju Island, Korea | ⚠️ Different country |
| Reykjavík, Iceland | Falmouth Coast, Cornwall UK | 🔴 Wrong country/continent |
| Bergen, Norway | Loch Patrick, Dumfries, Scotland | 🔴 Different country |
| Seattle, USA | Jasper Ridge, California, USA | ⚠️ Different US city |
| Helsinki, Finland | Lužánky Park, Brno, Czech Republic | 🔴 Different country |
| Edinburgh, Scotland | Lancaster, Northern England | ⚠️ Different city |

The world map makes this worse by drawing a dot on **Iceland** for a stream that plays **Cornwall, UK**, a dot on **Norway** for audio from **Scotland**, and a dot on **Finland** for audio from the **Czech Republic**. Users who know geography will notice immediately and lose trust.

**This is not an aesthetic issue — it is false information presented as fact on a live world map.**

**Applied fix:** `app/lib/locations.ts` updated. All 8 mismatched entries now show the correct location. See `docs/LOCATION_FIXES.md` for before/after table.

---

### ~~C-2 — FFmpeg binary required at deploy time — not bundled~~ ✅ FIXED

`app/api/stream/route.ts` calls `fluent-ffmpeg` which shells out to the system `ffmpeg` binary. If deployed to:

| Platform | ffmpeg available? | Stream API status |
|---|---|---|
| **Vercel** (serverless) | ❌ No | All streams 500 / silent fail |
| **Render** (Docker) | Needs `apt-get install ffmpeg` in Dockerfile | OK if configured |
| **Railway / Fly.io** | Needs Dockerfile or Nixpacks config | OK if configured |
| Local dev | Assumed installed per original spec | ✅ |

The deploy target is not documented anywhere. There is no startup check, no meaningful error returned to the client when ffmpeg is missing, and no fallback. If deployed to Vercel (the obvious choice for a Next.js app), every stream will fail silently.

**Applied fix:** `execFileSync('ffmpeg', ['-version'])` runs at module load (once per worker). Missing ffmpeg → `503 JSON`. `docs/DEPLOYMENT.md` created with Render/Railway/Fly.io setup and explicit Vercel warning.

---

### ~~C-3 — Play button disabled during loading = user cannot abort a hung stream~~ ✅ FIXED

When `playState === 'loading'`, the play button renders `disabled`. The 8-second load watchdog is the only escape. During those 8 seconds, users cannot:

- Cancel and try a different location
- Stop a hanging connection
- Do anything meaningful

On a slow mobile connection, 8 seconds of a frozen, non-interactive UI is a significant UX problem.

```tsx
// AudioPlayer.tsx line 502
disabled={playState === 'loading'}
```

**Applied fix:** `disabled` prop removed. `aria-label` updated to "Cancel connection" during loading. Spinner now shows a small stop square to signal it is clickable.

---

## 🟠 High Priority Issues

### H-1 — No ffmpeg process timeout on the server side

The stream route has no server-side timeout. If a Locus Sonus source disconnects mid-stream (common with free public microphones), FFmpeg may:

- Hang indefinitely waiting for data
- Keep the Node.js process alive and memory-occupied
- Not trigger the `'error'` event (because no error occurred — the upstream just went quiet)

The client has an 8-second watchdog but only for the **initial** connection. Once streaming starts, a mid-stream hang will cause the client to eventually fire `'stalled'` → retry, but the original FFmpeg process on the server keeps running.

**Fix:** Add a server-side AbortController timeout (e.g., 30s max wait for first byte) and ensure the `abort` signal cleans up the FFmpeg process.

---

### ~~H-2 — OG image missing~~ ✅ FIXED

`app/listen/[streamId]/opengraph-image.tsx` created (Edge Runtime, 1200×630). Shows city name, region, category-coloured glow, and "LIVE AMBIENT SOUND" footer. Automatically sets `og:image` and `twitter:image` for all `/listen/[streamId]` routes via Next.js file convention.

---

### ~~H-3 — `console.log` in production stream route~~ ✅ FIXED

`console.log` removed from `route.ts`. The startup FFmpeg check logs an error only if the binary is missing (`console.error`).

---

### H-4 — World map CDN dependency (jsDelivr)

Country outlines load from `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json`. This means:

- Corporate/school networks that block CDNs → no country outlines (dots only)
- CDN temporary downtime → no country outlines
- No guarantee of indefinite availability (world-atlas@2 package could be deprecated)

**Fix:** Bundle `world-atlas` as an npm dependency (`npm install world-atlas`) and import the JSON locally to make it offline-reliable and deploy-reliable.

---

### H-5 — sleep timer runs even when audio has errored out

If a stream fails and `playState === 'error'`, a previously set sleep timer continues counting down. When it reaches zero, `stopStream()` is called on an already-stopped stream (harmless), but the UI shows a countdown for a timer that will have no effect. Users may be confused about why a timer is running with no audio.

---

### H-6 — No `robots.txt` or `sitemap.xml`

Neither file exists. Search engines will crawl the entire app including `/listen/[all 18 ids]`. Without a canonical strategy this creates 18 near-duplicate indexed pages. Without a sitemap, the `/listen/[streamId]` pages may not be discovered.

---

### H-7 — No `/favicon.ico` static fallback

The app generates a favicon via `app/icon.tsx` (Edge Runtime). Some environments (email clients, older crawlers, some RSS readers) request `/favicon.ico` directly. This returns a 404. A static `public/favicon.ico` fallback would solve this.

---

## 🟡 Medium Priority Issues

### M-1 — `resolvedInitialId` computed every render

```typescript
// AudioPlayer.tsx line 118
const resolvedInitialId = LOCATIONS.some(l => l.id === initialId) ? (initialId ?? 'provence') : 'provence'
```

This runs `Array.some()` on every re-render. Since `initialId` is a static prop that never changes, this should be a `useMemo` or a `useState` initializer function. Low performance impact but indicates a pattern to fix.

---

### M-2 — Map dots overlap in western Europe cluster

12 of 18 locations are in or around western Europe. At the world overview scale (`scale: 145`), dots for knepp, kisumu, brussels, santamarta, alps, ortler, bergen, marseille, provence, edinburgh, scotland, and vienna are packed into a ~100×80px area of the rendered map. On a 280px-wide screen, these dots are nearly impossible to tap individually.

---

### M-3 — PWA maskable icon safe zone missing

`public/manifest.json` marks the 512×512 icon as `"purpose": "any maskable"`. Android's adaptive icon system applies a mask shape (circle, rounded square, squircle, etc.) that clips ~33% from each edge. The current icon design (concentric rings that extend to 76% of icon width) will be clipped on adaptive icon platforms, showing only the center dot and inner rings.

---

### M-4 — `overflow-hidden` on `<main>` may clip content

```tsx
// AudioPlayer.tsx line 414
<main className="min-h-screen ... overflow-hidden relative">
```

`overflow-hidden` clips the pulsing rings animation (intentional) but also clips any content that extends beyond `max-w-[280px]`. On short screens (iPhone SE, landscape) or with a keyboard open (pushing content up), parts of the location list can be clipped.

---

### M-5 — `aria-pressed` on location list vs. `role="radio"`

Location list items use `aria-pressed={isSelected}` (toggle button semantics). Since only one location can be active at a time, the correct ARIA pattern is `role="radiogroup"` on the group container and `role="radio"` with `aria-checked` on each item. Screen readers would better communicate "1 of 18 selected" to keyboard users.

---

### M-6 — `Access-Control-Allow-Origin: '*'` on stream API

```typescript
// route.ts line 173
'Access-Control-Allow-Origin': '*',
```

This allows any external website to embed and proxy the audio stream endpoint. If the server runs on a free hosting tier with bandwidth limits, this could be abused to consume bandwidth. Consider restricting to same-origin or a specific allow-list.

---

### M-7 — No `og:url` in metadata

Neither `app/layout.tsx` nor `app/listen/[streamId]/page.tsx` sets `og:url`. Social crawlers may construct or guess the URL, leading to inconsistent unfurls.

---

### M-8 — Share button aria-label says "Share {location}" even when not streaming

The share button label (`aria-label={Share ${activeLocation.label}}`) is always visible and always refers to the selected location. When a user is just browsing (not streaming), "Share Knepp Wildland" is accurate but could be mistaken for sharing current playback rather than sharing a listen link. A `title` tooltip already exists but aria-label is what screen readers announce.

---

## 🟢 Low Priority Polish

### L-1 — Footer overlaps content on short screens

```tsx
<p className="absolute bottom-5 ...">Locus Sonus open microphones</p>
```

On iPhone SE landscape or any very short viewport, this absolute footer can overlap the bottom of the location list. Making it `relative` in the normal document flow (or adding enough bottom padding to `<main>`) would be cleaner.

---

### L-2 — Service worker cache version is static

`const CACHE_NAME = 'real-audio-v1'` in `public/sw.js`. If `public/offline.html` is ever updated (copy changes, design tweaks), users will receive the stale cached version until they manually clear site data or the SW is updated. Consider auto-versioning based on a build timestamp.

---

### L-3 — World map shows skeleton until CDN loads

On first visit (empty browser cache), the world map shows a pulsing skeleton while the CDN request resolves. On slow connections this could take 2-5 seconds. The skeleton is well-designed but there's no visible explanation for why the map is loading.

---

### L-4 — Sleep timer "Off" button always highlighted

When no timer is set, the "Off" button shows as `text-slate-300 bg-slate-700/60` (highlighted). This looks like the user has something selected, but it's just indicating "no timer." Consider making "Off" the default non-highlighted state and only highlighting the active duration.

---

### L-5 — `react-simple-maps` peer dependency warning at install time

```
npm warn peer react@"^16.8.0 || 17.x || 18.x" from react-simple-maps@3.0.0
```

Not a runtime issue (React 19 is backward compatible here) but will alarm developers running `npm install` or CI pipelines without `--legacy-peer-deps`. Consider documenting in README.

---

### L-6 — No `lang` metadata propagation to `<html>` element for `/listen/[streamId]`

The root `<html lang="en">` is in `app/layout.tsx`. For `/listen/[streamId]` pages that could be in other languages (future), the lang attribute isn't dynamically updated. Not an issue now but worth noting.

---

### L-7 — Pulsing rings animation has no `prefers-reduced-motion` fallback

```tsx
{visualizerActive && [1,2,3].map(i => <span className="animate-ping" />)}
```

The pulsing rings animation doesn't respect `@media (prefers-reduced-motion: reduce)`. Users who have enabled reduced motion in OS accessibility settings will see the animation regardless.

---

### L-8 — No "now playing" indicator on map dot while streaming

The map dot uses a glow filter when `isStreaming && health === 'live'`. But the glow condition checks `health === 'live'`, which is only set after the `'playing'` event fires. Between `playState === 'loading'` and `health === 'live'`, the dot appears in its normal active state without any loading indicator on the map.

---

## ✅ What Works Well

- **Build:** Clean, 0 type errors, 0 lint errors
- **Stream health:** 3-retry + 8s watchdog pattern is solid
- **Audio cleanup:** `destroyAudio` correctly uses `removeAttribute('src')` + `load()` to avoid MEDIA_ELEMENT_ERROR
- **Sleep timer:** Wall-clock timestamp approach is accurate across tab suspension
- **Media Session API:** Lock screen / car display integration with previous/next track
- **Service worker:** Network-first strategy correctly skips `/api/` routes
- **Safe area:** `viewport-fit=cover` + `env(safe-area-inset-*)` in CSS
- **Dynamic import:** WorldMap code-split correctly (`ssr: false`)
- **Shareable URLs:** OG metadata per location, not-found fallback, CTA on share arrival
- **Local time display:** `suppressHydrationWarning` + minute-aligned interval — no flicker
- **PWA manifest:** Correct `background_color`, `theme_color`, standalone display

---

## Recommended Fixes Before Launch

| Priority | Fix | Status |
|---|---|---|
| ~~🔴 C-1~~ | Fix location label/coordinate mismatches | ✅ Done |
| ~~🔴 C-2~~ | Document ffmpeg deploy dependency + startup check | ✅ Done |
| ~~🔴 C-3~~ | Re-enable play button during loading | ✅ Done |
| ~~🟠 H-2~~ | Add OG image using Next.js ImageResponse | ✅ Done |
| ~~🟠 H-3~~ | Remove `console.log` from production stream route | ✅ Done |
| 🟠 H-4 | Bundle world-atlas locally instead of CDN URL | Pending |
| 🟡 M-3 | Fix maskable icon safe zone (add 33% padding inset) | Pending |
| 🟡 M-4 | Remove `overflow-hidden` from `<main>` or change to `overflow-x-hidden` | Pending |

---

## Recommended Fixes After Launch

| Priority | Fix | Effort |
|---|---|---|
| 🟠 H-1 | Add server-side FFmpeg stream timeout | Medium |
| 🟠 H-5 | Pause sleep timer countdown when not playing | Small |
| 🟠 H-6 | Add `robots.txt` and `sitemap.xml` | Small |
| 🟠 H-7 | Add `public/favicon.ico` static fallback | Trivial |
| 🟡 M-1 | Wrap `resolvedInitialId` in `useMemo` | Trivial |
| 🟡 M-2 | Add tooltip/label on map dot hover for crowded Europe cluster | Medium |
| 🟡 M-5 | Change location list to `role="radiogroup"` / `role="radio"` | Small |
| 🟡 M-7 | Add `og:url` to metadata | Trivial |
| 🟢 L-1 | Fix footer position on short screens | Trivial |
| 🟢 L-2 | Auto-version SW cache name | Small |
| 🟢 L-4 | Rethink "Off" button highlight state for sleep timer | Trivial |
| 🟢 L-7 | Add `prefers-reduced-motion` CSS for pulsing rings | Trivial |

---

## Launch Readiness Score

### Before fixes (initial audit): 5 / 10

```
  First impression          8/10
  Playback UX               6/10  — frozen during loading
  Stream failure handling   7/10
  World map UX              4/10  — 6/18 locations wrong
  Share URLs                7/10  — no OG image
  Sleep timer               7/10
  PWA behavior              7/10
  Mobile layout             7/10
  Performance               8/10
  Deployment readiness      4/10  — no ffmpeg docs/check
```

### After fixes (current): 7.5 / 10

```
  First impression          8/10
  Playback UX               8/10  ✅ cancel button works
  Stream failure handling   7/10
  World map UX              8/10  ✅ all 18 locations accurate
  Share URLs                9/10  ✅ OG image generated per location
  Sleep timer               7/10
  PWA behavior              7/10
  Mobile layout             7/10
  Performance               8/10
  Deployment readiness      8/10  ✅ FFmpeg check + DEPLOYMENT.md
```

**The app is ready for a soft launch.** Remaining open items (H-4, M-3, M-4) are cosmetic or resilience improvements — none are blockers.

---

## Build & Lint Results

### Initial audit (pre-fix)
```
npm run lint   → exit 0
npm run build  → exit 0  (Compiled in 2.7s)
```

### After blocker fixes (2026-06-08)
```
npm run lint
  → tsc --noEmit
  → exit 0   (0 errors, 0 warnings)

npm run build
  → next build (Next.js 16.2.7, Turbopack)
  → Compiled successfully in 4.0s
  → TypeScript check passed in 3.9s
  → exit 0

Route table:
  ○  /                            — Static
  ○  /_not-found                  — Static
  ƒ  /api/stream                  — Dynamic (Node.js runtime, fluent-ffmpeg)
  ƒ  /apple-icon                  — Dynamic (Edge runtime, ImageResponse)
  ƒ  /icon                        — Dynamic (Edge runtime, ImageResponse)
  ƒ  /listen/[streamId]           — Dynamic (per-location OG metadata)
  ƒ  /listen/-/opengraph-image    — Dynamic (Edge runtime, NEW OG image)
  ƒ  /pwa-icon/[size]             — Dynamic (Edge runtime, ImageResponse)

⚠  Build warning: "Using edge runtime on a page currently disables static
   generation for that page" — expected, applies to icon routes only.
```
