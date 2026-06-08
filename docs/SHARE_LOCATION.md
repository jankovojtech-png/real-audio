# Shareable Location URLs — Real Audio

## Overview

Every listening location has a permanent, shareable URL in the form `/listen/[streamId]`. Opening a share link pre-selects the location and shows a "Start listening to …" CTA so the user knows exactly what they will hear before pressing play.

---

## URL Structure

| Route | Behavior |
|---|---|
| `/` | Root player — default location pre-selected (Provence) |
| `/listen/knepp` | Player with Knepp Wildland pre-selected |
| `/listen/ortler` | Player with Ortler Glacier pre-selected |
| `/listen/invalid` | Friendly not-found page with location suggestions |

All 18 stream IDs are valid share targets:

```
knepp · kisumu · ortler · scotland · marseille · kyoto · reykjavik
alps · bergen · seattle · provence · brussels · seoul · santamarta
helsinki · lisbon · bangkok · edinburgh
```

---

## Share Button

A small share icon (↑ box) is positioned in the top-right corner of the player, relative to the "Real Audio" title. It is always visible and always shares the **currently selected** location.

### Behavior

1. On supported devices (iOS Safari, Android Chrome): triggers the native **Web Share API** sheet.
2. On other browsers: copies the URL to the clipboard and briefly shows **"Copied"** in place of the icon for 2 seconds.
3. If both APIs fail (e.g., in an iframe without permissions): silently does nothing.

### Implementation

```typescript
const handleShare = useCallback(async () => {
  const url   = `${window.location.origin}/listen/${loc.id}`
  // 1. Try native share sheet
  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return } catch {}
  }
  // 2. Fall back to clipboard
  await navigator.clipboard.writeText(url)
  setShareFeedback(true)
  setTimeout(() => setShareFeedback(false), 2_000)
}, [])
```

---

## Route Architecture

### Shared data: `app/lib/locations.ts`

Exports `Location` type and `LOCATIONS` array. Importable in both server and client contexts without pulling in any browser APIs.

### Server component: `app/listen/[streamId]/page.tsx`

- Uses `generateMetadata()` for SSR Open Graph tags.
- Validates `streamId` against `LOCATIONS`.
- Renders `<AudioPlayer initialId={streamId} />` or `<NotFoundStream />`.
- `params` is typed as `Promise<{ streamId: string }>` (Next.js 15+ async params API).

### Client component: `app/components/AudioPlayer.tsx`

- Accepts `initialId?: string` prop.
- If `initialId` is provided and valid, uses it as the default `activeId`.
- If `initialId` is invalid, silently falls back to `'provence'`.
- Shows the "Start listening to …" CTA line when `initialId` is set and `playState === 'idle'`.

### Root page: `app/page.tsx`

Thin server component — just `<AudioPlayer />`. No props, no metadata changes (inherits from layout).

---

## Open Graph Metadata

Each `/listen/[streamId]` page has unique OG tags generated server-side via `generateMetadata`:

```
og:title       — "Listen live from Knepp Wildland — Real Audio"
og:description — "Real ambient sound from Knepp Wildland, England, live right now."
og:type        — "website"
og:site_name   — "Real Audio"
twitter:card   — "summary"
```

The root `/` uses the default metadata defined in `app/layout.tsx`.

---

## Not-Found State

Visiting `/listen/unknown-id` renders a styled fallback page (same dark background as the player) showing:

- The invalid ID in quotes
- A list of all 18 available locations as clickable links
- A "Browse all" link back to `/`

This is handled **inline** in `ListenPage` (no `notFound()` call) so the response stays 200 and the custom layout is preserved.

---

## Hydration Safety

- `initialId` is a string prop set at server render time — no hydration mismatch.
- Local time display uses `suppressHydrationWarning` (unchanged from before).
- The share button's `shareFeedback` state is client-only and only changes on user interaction.

---

## File Map

```
app/
├── lib/
│   └── locations.ts              ← shared Location type + LOCATIONS array
├── components/
│   └── AudioPlayer.tsx           ← full player (was app/page.tsx) + share + initialId
├── listen/
│   └── [streamId]/
│       └── page.tsx              ← server component: OG metadata + route
├── page.tsx                      ← thin wrapper: <AudioPlayer />
└── layout.tsx                    ← default OG metadata
```

---

## Known Limitations

- **No OG image**: `/listen/[streamId]` does not generate a custom OG image. A follow-up could add `app/listen/[streamId]/opengraph-image.tsx` using Next.js's image-response API.
- **No canonical URL**: The `/listen/[streamId]` page does not set a `canonical` link tag. Both `/` and `/listen/provence` show the same player without cross-linking.
- **Share sheet cancellation**: On iOS Safari, when the user dismisses the share sheet, the Web Share API throws `AbortError`. The code catches this and silently falls through — no clipboard copy, no "Copied" confirmation.
