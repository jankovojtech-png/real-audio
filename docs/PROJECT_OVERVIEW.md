# Real Audio — Project Overview

> **Status:** Working MVP · No database · No auth · No CI/CD · Single developer

---

## 1. Executive Summary

### What is this project?

**Real Audio** is a live ambient audio streaming web application. It connects to publicly broadcast open-microphone feeds from the [Locus Sonus Soundmap](http://locusonus.org/soundmap/) — a global network of permanently streaming outdoor microphones maintained by an art-research collective at the École Supérieure d'Art d'Aix-en-Provence (France, since 2006). The application strips video signals (when applicable) server-side using FFmpeg and delivers a single, continuous, live MP3 audio stream to the browser.

Users pick a location from a curated list of 18 places worldwide, hit Play, and hear the real, unedited ambient sound of that place — a Scottish loch, a Belgian city street, a Korean neighbourhood, a French countryside manor — right now, in real time.

### What problem does it solve?

Commercial ambient audio apps (Calm, Headspace, Brain.fm, Endel) all use pre-recorded or AI-generated audio loops. **Real Audio delivers genuinely live, unedited sound from real physical places.** This is a fundamentally different proposition: unpredictable, authentic, and connected to a living geography.

### Development stage

| Stage | Status |
|-------|--------|
| Core streaming pipeline | ✅ Complete |
| Location selection UI | ✅ Complete |
| Web Media Session API | ✅ Complete |
| Live clock display | ✅ Complete |
| User accounts / auth | ❌ Not started |
| Database | ❌ Not started |
| Favourites / history | ❌ Not started |
| Mobile app (React Native / PWA manifest) | ❌ Not started |
| Monitoring / error tracking | ❌ Not started |
| CI/CD pipeline | ❌ Not started |
| Tests | ❌ Not started |
| Revenue / subscriptions | ❌ Not started |

The project is a **functional, deployable MVP** suitable for early user testing and investor demonstrations. It has zero backend state, zero user data, and zero operational costs beyond server compute.

### Features already implemented

1. **Live audio streaming** — FFmpeg on the Node.js server proxies Icecast/HLS feeds to the browser as MP3 at 128 kbps
2. **18 curated global locations** — 11 nature + 7 urban, each probe-verified live
3. **Two-category UX** — Nature (indigo) vs Urban (amber) with distinct visual themes
4. **Seamless location switching** — instant stream swap without page reload
5. **Live clock per location** — `Intl.DateTimeFormat` with correct IANA timezone, minute-aligned
6. **Web Media Session API** — lock-screen metadata (title, artist, album, SVG artwork), hardware controls (play/pause/prev/next), steering wheel / car display support
7. **Safe audio teardown** — `removeAttribute('src') + load()` pattern prevents EMPTY_SRC browser errors
8. **Stale-closure-safe action handlers** — ref-based pattern for Media Session without re-registration flicker
9. **Category-shifting visuals** — background glow and pulsing rings change colour based on active category
10. **Accessibility** — `aria-label`, `aria-pressed`, `focus-visible` rings throughout
11. **SSR-safe hydration** — clock initialised client-side only with `suppressHydrationWarning`
12. **Git repository** — initialised with correct `.gitignore`, committed to GitHub at `jankovojtech-png/real-audio`

### Features that are unfinished / missing

- No user accounts, favourites, listening history
- No PWA manifest (`manifest.json`, service worker)
- No offline support
- No error monitoring (Sentry, etc.)
- No analytics (Posthog, Plausible, etc.)
- No README or onboarding docs for contributors
- No environment variable management (`.env` files, secrets)
- No tests (unit, integration, E2E)
- No CI/CD pipeline
- No rate limiting on the streaming endpoint
- No stream health monitoring / automatic failover
- Duplicate source URLs (Lisbon→Brussels stream, Bangkok→Seoul stream — UI labels differ but audio is identical)
- `fluent-ffmpeg` package is deprecated upstream

---

## 2. Product Overview

### Main value proposition

> *"Hear the world, live. No loops. No AI. No studio. Just an open microphone, somewhere on Earth, right now."*

Real Audio is the only ambient audio app that streams genuinely live soundscapes. Every other major player in the wellness/focus audio space uses pre-recorded or procedurally generated audio. Real Audio's content is inherently:

- **Unpredictable** — weather, time of day, wildlife all change the sound
- **Time-contextual** — the app displays the local time of each location, reinforcing the "you are really there" feeling
- **Globally diverse** — 18 locations across 4 continents, 2 categories

### Target users

| Segment | Use case |
|---------|----------|
| Remote workers / focus seekers | Background ambient sound during deep work |
| Meditation / mindfulness users | Grounding through real environmental audio |
| Travellers & explorers | Virtual acoustic travel |
| Sleep / relaxation seekers | Natural soundscapes at night |
| Car commuters | Ambient background while driving (Media Session / car display integration) |

### Main user journeys

1. **First visit** → See the dark ambient UI → Pick a location (or use default: Provence) → Tap Play → Hear live audio
2. **Location browsing** → Scroll the grouped list → See local time for each → Tap to switch (if playing, switches instantly)
3. **Mobile / lock screen** → Play starts → Lock phone → See track info + controls on lock screen → Skip to next location with hardware button
4. **Car use** → Connect phone to Bluetooth / CarPlay → See location name on car display → Control with steering wheel buttons

### Key differentiators

| Feature | Real Audio | Calm | Brain.fm | Endel |
|---------|-----------|------|---------|-------|
| Live audio | ✅ | ❌ | ❌ | ❌ |
| Geographic authenticity | ✅ | ❌ | ❌ | ❌ |
| Free to use | ✅ | ❌ | ❌ | ❌ |
| Car display support | ✅ | ❌ | ❌ | ❌ |
| No account needed | ✅ | ❌ | ❌ | ❌ |

### Current limitations

1. **Zero resilience** — if Locus Sonus server goes down, all streams fail simultaneously
2. **FFmpeg binary dependency** — must be installed on the host OS; not containerised
3. **No PWA** — cannot be installed to home screen; no offline mode
4. **No volume control** — relies entirely on system volume
5. **Duplicate streams** — Lisbon and Brussels play the same audio; Bangkok and Seoul play the same audio
6. **No search or filtering** — 18 locations in a flat scrollable list
7. **Single concurrent stream per session** — designed for personal ambient use
8. **Server-coupled streaming** — every client listener spawns a dedicated FFmpeg process on the server; no CDN, no shared stream, no caching
