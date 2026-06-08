# Real Audio — Architecture

---

## 5. Technical Architecture

### Stack overview

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.7 |
| Language | TypeScript | 6.0.3 |
| Runtime | Node.js | ≥18 (Next.js requirement) |
| UI library | React | 19.2.7 |
| Styling | Tailwind CSS | 4.3.0 |
| CSS processor | PostCSS + @tailwindcss/postcss | 4.3.0 |
| Audio transcoding | FFmpeg (OS binary) + fluent-ffmpeg | 2.1.3 |
| Linter | ESLint (next/core-web-vitals + next/typescript) | 9.x |
| Package manager | npm | — |

**No database.** **No authentication.** **No state management library.** **No third-party UI component library.**

---

### System architecture diagram

```mermaid
flowchart TD
    subgraph Browser["Browser / Mobile Client"]
        UI["React SPA\napp/page.tsx"]
        AudioAPI["HTMLAudioElement\n(native browser)"]
        MediaSession["Web Media Session API\n(lock screen / car display)"]
        Clock["Intl.DateTimeFormat\n(live timezone clock)"]
        UI --> AudioAPI
        UI --> MediaSession
        UI --> Clock
    end

    subgraph Server["Next.js Server (Node.js)"]
        RouteHandler["GET /api/stream?id=:id\napp/api/stream/route.ts"]
        FFmpeg["FFmpeg process\n(fluent-ffmpeg)"]
        PassThrough["Node PassThrough stream\n(bridge: Node → Web ReadableStream)"]
        RouteHandler --> FFmpeg
        FFmpeg --> PassThrough
        PassThrough --> RouteHandler
    end

    subgraph External["External — Locus Sonus Network"]
        Icecast["Icecast Server\nlocus.creacast.com:9001"]
        Streams["18 open-mic streams\nMP3 / Ogg Vorbis\n(volunteer-maintained)"]
        Icecast --> Streams
    end

    AudioAPI -- "GET /api/stream?id=X\n(infinite HTTP response)" --> RouteHandler
    FFmpeg -- "HTTP pull\nwith reconnect" --> Icecast
    RouteHandler -- "MP3 chunks\nTransfer-Encoding: chunked" --> AudioAPI
```

---

### Request lifecycle (one stream play)

```mermaid
sequenceDiagram
    actor User
    participant UI as page.tsx (Browser)
    participant Audio as HTMLAudioElement
    participant Route as /api/stream (Server)
    participant FFmpeg as FFmpeg process
    participant Icecast as locus.creacast.com:9001

    User->>UI: Click Play (locationId = "provence")
    UI->>Audio: new Audio("/api/stream?id=provence")
    Audio->>Route: GET /api/stream?id=provence
    Route->>FFmpeg: spawn ffmpeg -i <url> -vn -c:a libmp3lame -b:a 128k -f mp3
    FFmpeg->>Icecast: HTTP GET /sibra_manoir_bruit.ogg
    Icecast-->>FFmpeg: Ogg Vorbis stream (continuous)
    FFmpeg-->>Route: MP3 chunks → PassThrough
    Route-->>Audio: Transfer-Encoding: chunked MP3 response (never ends)
    Audio-->>UI: fires 'playing' event
    UI-->>User: Visualizer + status = "Streaming live"

    User->>UI: Click location "Bergen"
    UI->>Audio: destroyAudio(old) → pause + removeAttribute(src) + load()
    UI->>Audio: new Audio("/api/stream?id=bergen")
    Note over Route,FFmpeg: Old FFmpeg killed via request abort signal
    Audio->>Route: GET /api/stream?id=bergen
    Route->>FFmpeg: new FFmpeg process
    FFmpeg->>Icecast: HTTP GET /dumfries_and_galloway_loch_patrick.mp3

    User->>UI: Click Pause
    UI->>Audio: destroyAudio()
    Note over Route: request.signal fires 'abort'
    Route->>FFmpeg: command.kill('SIGKILL')
```

---

### Frontend architecture

The entire frontend is a **single React client component** (`app/page.tsx`). There is no routing beyond the root `/` page.

```
app/page.tsx
├── LOCATIONS[]           — static array, 18 entries, all metadata
├── CATEGORY_META{}       — visual theme per category
├── ARTWORK{}             — SVG data-URI artwork for Media Session
├── formatLocalTime()     — Intl.DateTimeFormat helper
├── destroyAudio()        — safe HTMLAudioElement teardown
└── HomePage (component)
    ├── State
    │   ├── playState       — 'idle' | 'loading' | 'playing' | 'error'
    │   ├── errorMessage    — string
    │   ├── visualizerActive — boolean
    │   ├── activeId        — string (location ID)
    │   └── now             — Date | null (clock)
    ├── Refs
    │   ├── audioRef        — HTMLAudioElement
    │   ├── activeIdRef     — mirror of activeId for stale-closure safety
    │   └── playStateRef    — mirror of playState
    ├── Effects
    │   ├── clockEffect     — tick() aligned to minute boundary
    │   ├── mediaMetadata   — updates MediaSession.metadata on state/id change
    │   ├── mediaHandlers   — registers play/pause/prev/next once on mount
    │   └── unmountCleanup  — stopStream() on unmount
    ├── Callbacks
    │   ├── startStream(id) — creates Audio, attaches events, calls play()
    │   └── stopStream()    — destroyAudio() + reset state
    └── Render
        ├── Ambient glow (category-conditional radial gradient)
        ├── Pulsing rings (animate-ping, 3 layers)
        ├── Title block
        ├── Play/Pause button (3 visual states)
        ├── Status text + Retry button
        └── Location list (grouped: Nature / Urban)
            └── LocationRow × 18
                ├── Live dot (glowing when streaming)
                ├── Label + description
                └── Region + local time (HH:MM, tabular-nums)
```

### Backend architecture

The backend is a **single Next.js route handler** (`app/api/stream/route.ts`).

```
app/api/stream/route.ts
├── STREAMS{}        — 18 entries: id → { url, label }
├── DEFAULT_ID       — 'provence'
└── GET(request)
    ├── Read ?id param → resolve STREAMS[id]
    ├── Spawn FFmpeg
    │   ├── Input: Icecast URL
    │   ├── Options: -reconnect 1, -reconnect_streamed 1, -reconnect_delay_max 5, -icy 0
    │   ├── Output: libmp3lame, 128kbps, mp3
    │   └── Pipe → PassThrough
    ├── Wire request.signal → command.kill('SIGKILL') on client disconnect
    ├── Wrap PassThrough → Web ReadableStream
    └── Return Response(readableStream, { Content-Type: audio/mpeg, Transfer-Encoding: chunked })
```

### Infrastructure (current)

```mermaid
flowchart LR
    Dev["Developer machine\nnpm run dev"] --> GitHub["GitHub\njankovojtech-png/real-audio"]
    GitHub -.->|"Manual deploy\n(intended: Render)"| Render["Render.com\n(planned)"]
    Render --> Users["End users\n(browser / mobile)"]
    Render --> Icecast["locus.creacast.com:9001\n(Locus Sonus)"]
```

**Currently:** Deployed only to localhost. GitHub repo exists. Render deployment is planned but not yet configured.

**Critical dependency:** The host machine (dev or Render) must have `ffmpeg` binary installed at the system PATH.

### Third-party integrations

| Service | Purpose | Cost | SLA | Failure impact |
|---------|---------|------|-----|----------------|
| Locus Sonus / locus.creacast.com:9001 | All 18 audio streams | Free (art project) | None | All streams fail simultaneously |
| GitHub (jankovojtech-png/real-audio) | Source control | Free | GitHub SLA | Development blocked |
| Render.com | Planned hosting | TBD | TBD | Service unavailable |

### No integrations currently active for:

- Authentication (Auth0, Clerk, etc.)
- Database (Postgres, SQLite, etc.)
- Analytics (Posthog, Plausible, etc.)
- Error tracking (Sentry, etc.)
- CDN (Cloudflare, etc.)
- Email (Resend, SendGrid, etc.)
- Payments (Stripe, etc.)
- Monitoring (Datadog, etc.)

---

## Sound streaming architecture (dedicated)

```mermaid
flowchart TD
    subgraph LocusSonus["Locus Sonus Network (External)"]
        VolMic["Volunteer microphone\n(Raspberry Pi / smartphone / PD patch)"]
        IcecastServer["Icecast streaming server\nlocus.creacast.com:9001"]
        VolMic -->|"MP3 or Ogg Vorbis\nlow-bitrate Icecast"| IcecastServer
    end

    subgraph RealAudioServer["Real Audio Server (Next.js / Node.js)"]
        RouteHandler["GET /api/stream?id=X"]
        FFmpegProc["FFmpeg process\n(one per connected client)"]
        PipelineOpts["Input opts:\n-reconnect 1\n-reconnect_streamed 1\n-reconnect_delay_max 5\n-icy 0"]
        Transcoder["Transcode:\n-vn (no video)\n-c:a libmp3lame\n-b:a 128k\n-f mp3"]
        PassThroughBuf["PassThrough\n(Node stream bridge)"]
        WebStream["Web ReadableStream\n(chunked HTTP response)"]
        RouteHandler --> FFmpegProc
        PipelineOpts --> FFmpegProc
        FFmpegProc --> Transcoder
        Transcoder --> PassThroughBuf
        PassThroughBuf --> WebStream
    end

    subgraph ClientBrowser["Client Browser"]
        HTMLAudio["HTMLAudioElement\nnative browser decoder"]
        PCMOutput["PCM audio output\n(speakers / headphones)"]
        HTMLAudio --> PCMOutput
    end

    IcecastServer -->|"HTTP pull\n(continuous)"| FFmpegProc
    WebStream -->|"Transfer-Encoding: chunked\nContent-Type: audio/mpeg\n(infinite response)"| HTMLAudio

    AbortSignal["request.signal abort\n(client disconnect)"] -->|"command.kill(SIGKILL)"| FFmpegProc
```

**Key characteristics:**
- **One FFmpeg process per client** — not shared; does not scale
- **No caching** — every play request hits Locus Sonus
- **Transcoding on every request** — even if source is already MP3, re-encoding ensures consistent 128kbps output and strips Icecast metadata frames
- **Infinite HTTP response** — the browser `<audio>` element handles as a live stream; `preload="none"` prevents pre-buffering
- **Latency** — approximately 2–8 seconds from source mic to speaker (Icecast buffer + FFmpeg startup + network RTT)
- **Reconnect** — FFmpeg `-reconnect` flags handle brief Icecast dropouts automatically
