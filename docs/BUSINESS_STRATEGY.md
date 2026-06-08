# Real Audio — Business Strategy

> Perspectives: Product Manager · Startup Founder · Growth Expert · UX Designer
> Based on full codebase audit, June 2026.

---

## Top 20 Features Ranked by ROI

ROI score = (User Impact × Revenue Potential × Strategic Value) ÷ Engineering Effort.
Scale: 1–10 per dimension.

| Rank | Feature | User Impact | Revenue | Strategic | Effort | **ROI Score** | Rationale |
|------|---------|------------|---------|----------|--------|--------------|-----------|
| 1 | **PWA install + home screen** | 9 | 8 | 10 | 2 | **36.0** | Converts one-time visitors to daily habit users. Zero extra server cost. One afternoon of work. |
| 2 | **Fix duplicate streams** (Lisbon/Bangkok) | 8 | 7 | 9 | 1 | **50.4** | Trivial fix. Immediate credibility gain. Users who notice identical audio lose trust permanently. |
| 3 | **Stream health badge** (live / offline indicator per location) | 9 | 7 | 9 | 3 | **18.9** | Prevents the worst UX failure: playing a silent or dead stream. Also enables user trust in product reliability. |
| 4 | **User accounts** (email or Google) | 8 | 10 | 10 | 5 | **16.0** | Unlocks retention data, favourites, sync across devices, and all monetisation paths. |
| 5 | **Favourites** | 8 | 8 | 9 | 3 | **17.1** | Simple feature with enormous retention impact — gives users a reason to return. |
| 6 | **Sleep timer** (30 / 60 / 90 min auto-stop) | 9 | 8 | 8 | 1 | **57.6** | Highest-requested feature in comparable apps. Unlocks the sleep-use-case. Trivial to implement. |
| 7 | **Volume control** | 8 | 5 | 6 | 1 | **24.0** | Basic UX gap. Expected by every user. Currently impossible without system volume. |
| 8 | **Share a location** (deep link + OG preview) | 7 | 8 | 10 | 2 | **28.0** | Every share is a free acquisition event. OG card shows ambient photo + live clock. |
| 9 | **Mood / Use-case playlists** ("Focus", "Sleep", "Relax", "City energy") | 9 | 9 | 9 | 3 | **24.3** | Reframes the product from "choose a place" to "choose a feeling" — dramatically widens appeal. |
| 10 | **Premium tier** ($4.99/month) | 5 | 10 | 10 | 7 | **7.1** | Required for revenue. Lower priority than growth features because you need users first. |
| 11 | **Audio visualizer** (frequency bars / waveform) | 8 | 6 | 8 | 4 | **9.6** | Emotional differentiation — watching the waveform of a live Kenyan swamp is mesmerising. |
| 12 | **Stream blend** (crossfade two live locations) | 9 | 9 | 10 | 6 | **13.5** | Unique feature no competitor has. Creates infinite combinations from 18 sources. |
| 13 | **Listening history** (where have you been) | 7 | 6 | 8 | 2 | **16.8** | Drives re-engagement and FOMO for unvisited locations. |
| 14 | **Rate limiting + stream multiplexing** | 1 | 8 | 9 | 6 | **1.2** | Critical for survival at scale — but invisible to users. Pure technical prerequisite. |
| 15 | **Sentry + analytics** | 1 | 7 | 9 | 1 | **6.3** | Essential for product decisions. Invisible to users. But 1 day of work. |
| 16 | **"Now playing" embeddable widget** | 6 | 7 | 9 | 4 | **9.5** | Distribution moat — if embedded in Notion, Figma, productivity blogs, every embed is acquisition. |
| 17 | **Mobile app** (Expo / React Native) | 9 | 9 | 9 | 40 | **1.8** | Massive reach unlock but high cost. Background audio and widgets require native. Phase 3. |
| 18 | **AI location recommendation** | 8 | 8 | 9 | 8 | **7.2** | Smart "play something for me now" button. High delight, medium effort. Phase 3. |
| 19 | **Community submissions** (user-submitted mics) | 8 | 7 | 10 | 12 | **4.7** | Content network effect — unlocks 100s of locations. Defensible moat. Phase 3. |
| 20 | **B2B API / embed licencing** | 5 | 10 | 9 | 8 | **5.6** | Wellness apps, spa brands, co-working spaces, Calm-competitor white-label. Phase 4. |

---

## Technical Implementation Order

Ordered by: unblock dependencies first, then ROI, then revenue readiness.

### Phase 0 — Stabilise (this week, ~3 days)
```
1. Fix duplicate stream URLs (Lisbon, Bangkok)         [1h]
2. Add README.md with setup + FFmpeg requirement        [2h]
3. Add rate limiting on /api/stream                    [4h]
4. Add Sentry + Plausible analytics                    [3h]
5. Deploy to Render.com with ffmpeg buildpack           [4h]
6. Add GET /api/stream/health endpoint                  [3h]
```

### Phase 1 — Retention hooks (weeks 1–2)
```
7.  PWA manifest + icons + install prompt               [4h]
8.  Sleep timer (client-side countdown → stopStream)    [2h]
9.  Volume slider (input[type=range] → audio.volume)    [1h]
10. Share button (navigator.share + OG meta tags)       [3h]
11. Stream health badge in UI (poll /api/stream/health) [4h]
12. Audio frequency visualizer (Web Audio API)          [2d]
```

### Phase 2 — User accounts (weeks 3–5)
```
13. Database: Neon Postgres + Drizzle ORM               [2d]
14. Auth: Clerk (email + Google OAuth)                  [2d]
15. Favourites (DB-backed, synced across devices)       [2d]
16. Listening history (anonymous + authenticated)       [1d]
17. Mood playlists ("Focus", "Sleep", "Relax")          [1d]
18. Stream multiplexing (one FFmpeg per unique ID)      [3d]
```

### Phase 3 — Monetisation (weeks 6–8)
```
19. Premium tier definition (content, features)        [1d design]
20. Stripe integration + subscription management       [3d]
21. Paywall enforcement middleware                     [1d]
22. Stream blend feature (premium)                     [3d]
23. AI recommendation engine (premium)                 [1w]
```

### Phase 4 — Scale (months 3–6)
```
24. CDN relay layer (Icecast relay / Cloudflare Stream) [3w]
25. Mobile app (Expo)                                  [6–8w]
26. Community submissions platform                     [4w]
27. B2B API / embed widget                             [2w]
28. AI soundscape generation (fallback + premium)      [4w]
```

---

## UX Design Principles

Real Audio's design language must communicate **presence**, **authenticity**, and **calm authority**. It is not a wellness brand — it is a geographic radio station.

### Core UX axioms
1. **One action to audio** — from landing to playing in ≤ 2 taps. Never increase this.
2. **The sound IS the UI** — when audio is active, the interface should fade. Visualiser and glow replace text.
3. **Trust through transparency** — show the real source mic name in the footer. Show the real local time. Show when a stream is offline.
4. **Texture over decoration** — no gradients for aesthetic reasons alone. Every gradient represents something (nature = deep forest green, urban = warm tungsten amber).
5. **Mobile-first dark** — designed for night use, sleep preparation, and car dashboards. No white mode.

### UX debt to address immediately
| Issue | Current | Fix |
|-------|---------|-----|
| No feedback on dead stream | Silent error | Health badge per location row |
| No volume control | Must use system volume | Persistent slider at top of player |
| No "what is this app" context | Empty footer | One-line mission statement on first visit |
| No onboarding for new users | None | Tooltip on first play: "You're listening to a live microphone in southern France." |
| Location list too long at 18 items | Full scroll | Collapse to 5 featured + "Show all" expand |

---

## Competitive Positioning

```
              HIGH AUTHENTICITY
                    │
    Real Audio ────►│
                    │
  ──────────────────┼────────────────── RECORDED ◄─── LIVE
        Calm        │       YouTube Streams
        Headspace   │       (no ambient focus)
        Brain.fm    │
        Endel       │
                    │
              LOW AUTHENTICITY
```

Real Audio occupies a **completely uncontested quadrant**: live + high authenticity. This is the moat. Every strategic decision should deepen it.

- **Calm** = curated beauty, premium brand, recorded loops → different audience segment
- **Brain.fm** = neuroscience-focused, functional audio → overlapping (focus) but different mechanism
- **Endel** = AI-generated adaptive audio → direct alternative in "smart ambient" space
- **Real Audio** = the only product where the audio is genuinely happening right now

**Tagline options:**
- *"Listen to the world, live."*
- *"Real places. Real sound. Right now."*
- *"The Earth is always on."*
