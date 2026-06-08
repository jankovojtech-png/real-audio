# Real Audio — API Reference

---

## 8. API Documentation

The application exposes exactly **one HTTP endpoint**.

---

### `GET /api/stream`

**File:** `app/api/stream/route.ts`
**Runtime:** `nodejs` (explicitly set — edge runtime would not support `fluent-ffmpeg`)
**Cache:** `force-dynamic` — never cached

#### Purpose

Spawns a server-side FFmpeg process that connects to the specified Locus Sonus Icecast stream, transcodes the audio to MP3 at 128 kbps, and streams it back to the client as an infinite chunked HTTP response. The browser `HTMLAudioElement` consumes this as a live radio-style stream.

#### Request

| Property | Value |
|----------|-------|
| Method | `GET` |
| Path | `/api/stream` |
| Authentication | None |
| Rate limiting | None |

#### Query parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `id` | string | No | `"provence"` | Location ID. Must match a key in `STREAMS`. Unknown IDs silently fall back to default. |

#### Valid `id` values

| id | Source stream | Label |
|----|--------------|-------|
| `knepp` | `knepp_water.mp3` | Knepp Wildland, England |
| `kisumu` | `kisumu_dunga_swamp.mp3` | Dunga Swamp, Kenya |
| `ortler` | `ortler_end_der_welt_ferner.mp3` | Ortler Glacier, Alps |
| `scotland` | `gair_wood_001.mp3` | Gair Wood, Scotland |
| `marseille` | `marseille_frioul.mp3` | Île de Frioul, Mediterranean |
| `kyoto` | `jeju_georo.mp3` | Jeju Island, Korea |
| `reykjavik` | `falmouth__school_of_art.mp3` | Falmouth Coast, Cornwall |
| `alps` | `bern_holli_der_hof.ogg` | Holli der Hof, Bern |
| `bergen` | `dumfries_and_galloway_loch_patrick.mp3` | Loch Patrick, Scotland |
| `seattle` | `jasper_ridge_birdcast.mp3` | Jasper Ridge, California |
| `provence` | `sibra_manoir_bruit.ogg` | Sibra, Ariège, France |
| `brussels` | `bruxelles_rue_de_la_poudriere.mp3` | Rue de la Poudrière, Brussels |
| `seoul` | `seoul_gusan.mp3` | Gusan-dong, Seoul |
| `santamarta` | `santa_marta_trompito_017.mp3` | El Trompito, Santa Marta |
| `helsinki` | `brno_luzanky.mp3` | Lužánky Park, Brno |
| `lisbon` | `bruxelles_rue_de_la_poudriere.mp3` | Rue de la Poudrière, Brussels ⚠️ duplicate |
| `bangkok` | `seoul_gusan.mp3` | Gusan-dong, Seoul ⚠️ duplicate |
| `edinburgh` | `lancaster_ck-flor.mp3` | Lancaster, England |

⚠️ **Three duplicate URL pairs:** `lisbon`=`brussels`, `bangkok`=`seoul`. Different UI labels, same audio.

#### Response (success)

```
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Transfer-Encoding: chunked
Cache-Control: no-cache, no-store, must-revalidate
X-Content-Type-Options: nosniff
Access-Control-Allow-Origin: *

[infinite MP3 bitstream]
```

The response body never terminates under normal operation. The browser treats it as a live radio stream. The connection closes when:
- The client disconnects (triggers `request.signal` abort → `SIGKILL` on FFmpeg process)
- The upstream Icecast source ends (triggers FFmpeg `end` event → `PassThrough.end()`)
- FFmpeg encounters a fatal error

#### Response (FFmpeg / upstream error)

The server does not return a distinct HTTP error status. Instead, the chunked response stream closes prematurely. The browser `HTMLAudioElement` fires an `error` event which the UI catches and displays as `"Stream error"` or the browser's error message.

#### FFmpeg pipeline detail

```
ffmpeg \
  -reconnect 1 \
  -reconnect_streamed 1 \
  -reconnect_delay_max 5 \
  -icy 0 \
  -i <upstream_url> \
  -vn \
  -c:a libmp3lame \
  -b:a 128k \
  -f mp3 \
  pipe:1
```

| Flag | Purpose |
|------|---------|
| `-reconnect 1` | Auto-reconnect on TCP drop |
| `-reconnect_streamed 1` | Reconnect even on streaming sources |
| `-reconnect_delay_max 5` | Wait max 5s between reconnect attempts |
| `-icy 0` | Suppress Icecast in-stream metadata injection (prevents audio data corruption) |
| `-vn` | Drop video track if present (for HLS sources) |
| `-c:a libmp3lame` | Re-encode to MP3 regardless of input codec |
| `-b:a 128k` | 128 kbps output |
| `-f mp3` | Force MP3 container format |

#### Client-side consumption (from `page.tsx`)

```typescript
const audio = new Audio(`/api/stream?id=${locationId}`)
audio.preload = 'none'
audio.play()
// → browser sends GET /api/stream?id=locationId
// → receives infinite chunked MP3 response
// → fires 'playing' when audio buffer fills
```

#### Security notes

- No authentication required
- No rate limiting — any IP can spawn unlimited FFmpeg processes
- `Access-Control-Allow-Origin: *` — CORS fully open
- Source Icecast URLs are hardcoded server-side and never exposed to the client

#### Scalability notes

Every concurrent listener spawns one FFmpeg process on the server. At 100 concurrent users, the server runs 100 FFmpeg processes. Each process consumes:
- ~10–30 MB RAM
- ~5–15% of one CPU core
- ~128 kbps upstream bandwidth to Locus Sonus + 128 kbps downstream to client

This model does **not scale horizontally without shared stream relay infrastructure**.

---

### Planned / missing endpoints

These endpoints do not exist yet but would be needed for a full product:

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/locations` | List all locations (server-side, DB-backed) |
| `GET` | `/api/stream/health` | Check which streams are currently live |
| `POST` | `/api/favourites` | Save a favourite |
| `GET` | `/api/favourites` | Get user's favourites |
| `DELETE` | `/api/favourites/:id` | Remove a favourite |
| `GET` | `/api/history` | Get listening history |
| `GET` | `/api/user/me` | Get current user profile |
| `PATCH` | `/api/user/me` | Update user profile |
| `POST` | `/api/subscriptions/checkout` | Create Stripe checkout session |
| `POST` | `/api/webhooks/stripe` | Handle Stripe billing events |
