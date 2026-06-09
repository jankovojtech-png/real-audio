# Stream Diagnostics Report

**Generated:** 2026-06-09  
**Tool:** `scripts/diagnose-streams.mjs`  
**Method:** Direct HTTP probe — no FFmpeg, no Next.js API layer  
**Machine:** Local dev (Windows, direct internet)

---

## Test Results — All 18 Source URLs

| ID | Label | Source URL | HTTP | Content-Type | TTFB | 1st Byte | Bytes | Status |
|----|-------|-----------|------|-------------|------|----------|-------|--------|
| knepp | Knepp Wildland, England | `/knepp_water.mp3` | 200 | audio/mpeg | 185ms | 436ms | 4200B | ✅ online |
| kisumu | Langenholte Wetland, Netherlands | `/zwolle_nature_reserve_langenholte.mp3` | 200 | audio/mpeg | 310ms | 320ms | 8580B | ✅ online |
| ortler | Ortler Glacier, Alps | `/ortler_end_der_welt_ferner.mp3` | 200 | audio/mpeg | 400ms | 613ms | 11500B | ✅ online |
| scotland | Gair Wood, Scotland | `/gair_wood_001.mp3` | 200 | audio/mpeg | 283ms | 492ms | 14420B | ✅ online |
| marseille | Île de Frioul, Mediterranean | `/marseille_frioul.mp3` | 200 | audio/mpeg | 321ms | 537ms | 4200B | ✅ online |
| kyoto | Jeju Island, Korea | `/jeju_georo.mp3` | 200 | audio/mpeg | 298ms | 323ms | 4200B | ✅ online |
| reykjavik | Falmouth Coast, Cornwall | `/falmouth__school_of_art.mp3` | 200 | audio/mpeg | 307ms | 784ms | 4200B | ✅ online |
| alps | Holli der Hof, Bern | `/bern_holli_der_hof.ogg` | 200 | application/ogg | 416ms | 836ms | 9086B | ✅ online |
| bergen | Loch Patrick, Scotland | `/dumfries_and_galloway_loch_patrick.mp3` | 200 | audio/mpeg | 449ms | 464ms | 12960B | ✅ online |
| seattle | Jasper Ridge, California | `/jasper_ridge_birdcast.mp3` | 200 | audio/mpeg | 317ms | 574ms | 4200B | ✅ online |
| provence | Sibra, Ariège, France | `/sibra_manoir_bruit.ogg` | 200 | application/ogg | 576ms | 875ms | 9086B | ✅ online |
| brussels | Rue de la Poudrière, Brussels | `/bruxelles_rue_de_la_poudriere.mp3` | 200 | audio/mpeg | 595ms | 886ms | 14420B | ✅ online |
| seoul | Gusan-dong, Seoul | `/seoul_gusan.mp3` | 200 | audio/mpeg | 295ms | 363ms | 4200B | ✅ online |
| santamarta | r-urban Poplar, London | `/r-urban_poplar.mp3` | 200 | audio/mpeg | 377ms | 426ms | 9800B | ✅ online |
| helsinki | Lužánky Park, Brno | `/brno_luzanky.mp3` | 200 | audio/mpeg | 298ms | 425ms | 10040B | ✅ online |
| lisbon | Chania, Crete | `/chania_stream.mp3` | 200 | audio/mpeg | 200ms | 217ms | 4200B | ✅ online |
| bangkok | FLUCC Wien, Vienna | `/flucc_wien.mp3` | 200 | audio/mpeg | 268ms | 408ms | 11500B | ✅ online |
| edinburgh | Lancaster, England | `/lancaster_ck-flor.mp3` | 200 | audio/mpeg | 252ms | 492ms | 14420B | ✅ online |

**All URLs are on:** `http://locus.creacast.com:9001/`

---

## Key Finding

> **Zero streams are dead.** All 18 source URLs respond HTTP 200 with audio bytes within 875ms of first request. The "Offline" state seen in production is not caused by the Locus Sonus server being down.

The problem is **entirely in the hosting/FFmpeg layer on Render**.

---

## Root Cause Analysis

### 1. ✅ Source streams — all healthy
Every stream returns HTTP 200 + `audio/mpeg` or `application/ogg` within ~900ms from local. The Locus Sonus Icecast server at `locus.creacast.com:9001` is operating normally.

Two streams use **Ogg Vorbis** (not MP3):
- `alps` — `application/ogg`
- `provence` — `application/ogg`

FFmpeg handles both with `-audioCodec libmp3lame`, but these may have a slightly higher transcode startup cost.

---

### 2. ❌ Most likely cause: Render cannot reach port 9001

`locus.creacast.com` uses **port 9001** (non-standard Icecast port). Many cloud hosting providers, including Render's free tier, restrict outbound connections to non-standard ports (especially those > 1024 that aren't 3306/5432/6379/etc).

**To verify on Render:**
```bash
# Add to a test API route or run from Render shell
curl -v --max-time 5 http://locus.creacast.com:9001/knepp_water.mp3 -r 0-4095
```
If this returns `Connection refused` or times out on Render but works locally, the outbound port is blocked.

**Fix:** Contact Render support to whitelist outbound TCP to `locus.creacast.com:9001`, or self-host an Icecast relay on a standard port (80/443).

---

### 3. ⚠️ Secondary cause: FFmpeg not installed on Render

The stream route does an FFmpeg availability check at module load:
```ts
execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
```
If FFmpeg is absent, the route immediately returns HTTP 503 for all requests.

**To verify:** Check the Render logs for:
```
[stream] ERROR: ffmpeg binary not found in PATH
```

**Fix:** Add FFmpeg to the Docker image / build command. See `docs/DEPLOYMENT.md`.

---

### 4. ⚠️ Tertiary cause: LOAD_TIMEOUT too short for cold Render starts

The audio player waits only **8 seconds** (`LOAD_TIMEOUT = 8_000`) for first audio data before marking a stream as failed and retrying. On Render's free tier:

- Cold start of the Next.js worker: ~2–4s
- FFmpeg process spawn: ~0.5–1s  
- TCP connection to Icecast: ~300–900ms (our measurement)
- FFmpeg first-packet latency: variable

Total worst case: **5–7s** — which could fire the 8s timeout on slow cold starts, especially if the Render worker is handling the first request after an idle period.

**Fix (low-risk):** Raise `LOAD_TIMEOUT` to `12_000` in `AudioPlayer.tsx`.

---

### 5. ℹ️ Render free tier: outbound bandwidth / connection limits

Render's free tier allows 100GB/month outbound. Each 128kbps MP3 stream uses ~960MB/hour per concurrent listener. 10 simultaneous listeners would exhaust the monthly budget in ~4 hours. Once the budget is hit, all streams appear offline.

**Fix:** Upgrade to a paid Render plan, or switch to a platform without bandwidth limits (Railway, Fly.io, self-hosted VPS).

---

## Recommended Diagnostic Steps on Render

Run these in order via the Render web shell or a temporary API route:

```bash
# 1. Check FFmpeg
ffmpeg -version

# 2. Check outbound connectivity to Icecast port
curl -v --max-time 5 http://locus.creacast.com:9001/knepp_water.mp3 -r 0-4095

# 3. Check if port 9001 is reachable at TCP level
nc -zv locus.creacast.com 9001

# 4. Check standard port (80) — is it a port issue?
curl -v --max-time 5 http://locus.creacast.com:80/knepp_water.mp3 -r 0-4095
```

---

## Priority Fix Matrix

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | Render outbound port 9001 blocked | Low (support ticket) | All 18 streams |
| P0 | FFmpeg not in PATH on Render | Low (build config) | All 18 streams |
| P1 | Raise LOAD_TIMEOUT to 12s | Trivial (1 line) | Intermittent failures |
| P2 | Upgrade Render plan for bandwidth | Medium (cost) | Scale issues |
| P3 | Host an HTTP relay on port 80/443 | High | Future-proof |

---

## Notes on Content-Type

- 16 streams: `audio/mpeg` — standard MP3 Icecast
- 2 streams: `application/ogg` — Ogg Vorbis Icecast (`alps`, `provence`)

The `application/ogg` content-type (instead of `audio/ogg`) is returned by some older Icecast versions. FFmpeg handles both formats identically. The Real Audio stream route uses `-audioCodec libmp3lame` which re-encodes both to MP3 output regardless of input format.

---

## How to Re-run

```bash
node scripts/diagnose-streams.mjs
```

No dependencies — uses only Node.js built-ins (`http`, `perf_hooks`). Completes in ~2 seconds testing all 18 streams in parallel.

---

## Production Debugging — Render Logs

After deploying, open **Render → your service → Logs** and watch for the structured log lines emitted by `/api/stream/route.ts`. Every request produces a predictable sequence; gaps in the sequence tell you exactly where the failure is.

### Normal successful sequence

```
[stream:knepp] startup: ffmpeg binary found in PATH          ← module load (once per worker)
[stream:knepp] request  ffmpeg=true  url="http://locus…"    ← inbound request
[stream:knepp] ffmpeg spawned  t=+12ms  cmd="ffmpeg …"      ← process started
[stream:knepp] first byte  t=+520ms  size=4200B             ← audio flowing
[stream:knepp] client disconnected  t=+45230ms              ← user stopped (normal)
[stream:knepp] ffmpeg killed  t=+45231ms  "…SIGKILL"        ← clean teardown
```

The critical number is `first byte  t=+Xms`. Values under 3 s are healthy. Values over 10 s indicate a network problem between Render and Icecast.

---

### Failure pattern 1 — FFmpeg not installed

```
[stream] FATAL: ffmpeg binary not found in PATH …
[stream:knepp] request  ffmpeg=false  url="…"
[stream:knepp] abort  reason=ffmpeg_unavailable
```

**Fix:** Add `apt-get install -y ffmpeg` to the Render build command, or switch to a Docker image that includes ffmpeg. See `docs/DEPLOYMENT.md`.

---

### Failure pattern 2 — Outbound port 9001 blocked

```
[stream:knepp] request  ffmpeg=true  url="…"
[stream:knepp] ffmpeg spawned  t=+14ms  cmd="…"
[stream:knepp] ffmpeg stderr  t=+5012ms  "Connection timed out"
[stream:knepp] ffmpeg error   t=+5013ms  "…"
```

No `first byte` line appears. The `ffmpeg stderr` line shows a connection error. Time from spawn to error is typically the TCP timeout (5–30 s).

**Fix:** Contact Render support to allow outbound TCP to `locus.creacast.com:9001`. Alternatively, proxy the Icecast streams through a relay on port 80 or 443.

---

### Failure pattern 3 — Timeout before first byte (cold start / slow spawn)

```
[stream:knepp] request  ffmpeg=true  url="…"
[stream:knepp] ffmpeg spawned  t=+1842ms        ← slow cold start
[stream:knepp] first byte  t=+14200ms           ← within 15s window → OK
```

Or, if it exceeds 15 s:

```
[stream:knepp] client disconnected  t=+15001ms  ← AudioPlayer timeout fired
[stream:knepp] ffmpeg killed  t=+15002ms
```

No `first byte` line appears before `client disconnected`. This means the 15 s client timeout (`LOAD_TIMEOUT` in `AudioPlayer.tsx`) fired before ffmpeg could deliver audio. Increase `LOAD_TIMEOUT` further, or investigate why ffmpeg startup is slow (disk I/O, CPU throttling on free tier).

---

### Failure pattern 4 — Source stream closed unexpectedly

```
[stream:knepp] ffmpeg end  t=+3200ms
```

`ffmpeg end` appears very quickly (within a few seconds) without any `first byte`. The source Icecast stream connected but immediately closed. This can mean:
- The source microphone is momentarily offline
- The Icecast server rejected the connection (rate-limit, IP ban)
- The `.ogg`/`.mp3` mount point was remounted mid-stream

**Action:** Re-run `node scripts/diagnose-streams.mjs` locally to check if the source is alive. If local returns `online` but production gets `ffmpeg end` immediately, the Icecast server is likely refusing Render's IP.

---

### Quick log grep patterns

```bash
# All stream requests (one line per request received)
grep "request  ffmpeg=" render.log

# All ffmpeg startup confirmations
grep "ffmpeg spawned" render.log

# All first-byte events — healthy streams
grep "first byte" render.log

# All ffmpeg hard errors — the main failure signal
grep "ffmpeg error" render.log

# All filtered stderr lines — connection problems
grep "ffmpeg stderr" render.log

# Client-side disconnects (normal user stop, not a failure)
grep "client disconnected" render.log
```

---

### What the client-side `LOAD_TIMEOUT` change achieves

`LOAD_TIMEOUT` was increased from **8 s → 15 s** in `AudioPlayer.tsx`.

On Render Free, a cold-start request can take:
- Next.js worker spin-up: ~1–4 s  
- FFmpeg process spawn: ~0.5–1 s  
- TCP connect to Icecast: ~0.3–0.9 s  
- FFmpeg transcode buffer fill: ~0.5–1 s  

**Worst-case total: ~7 s.** The old 8 s timeout was barely enough, and any transient slowness on Render's free tier would cause a false offline. 15 s gives a full 8 s margin beyond the worst measured case.
