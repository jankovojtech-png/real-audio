# Analytics — Real Audio

**Approach:** Anonymous, server-side, cookie-free, no third-party scripts.  
**Storage:** NDJSON append-only log (`data/events.ndjson`)  
**Dependencies added:** none — uses only Node.js built-ins (`fs`, `path`)

---

## Privacy Design

| What we collect | What we don't collect |
|---|---|
| Event name | IP address |
| Stream ID (e.g. `knepp`) | User agent |
| Numeric value (duration / sleep minutes) | Email, name, account |
| Ephemeral session ID (see below) | Persistent user ID |
| Unix timestamp | Browser fingerprint |
| — | Cookies |

### Session ID

Each browser session generates one `crypto.randomUUID()` stored in `sessionStorage` (NOT `localStorage`, NOT a cookie). It is:

- **Cleared automatically** when the browser tab closes
- **Not shared** across tabs or devices
- **Not linked** to any user identity across sessions
- Used only to count "distinct listening sessions per day"

**No cookie consent banner is required.** No PII is processed. This is compliant with GDPR Article 6(1)(f) (legitimate interest in anonymous aggregate statistics) and ePrivacy Directive exemption for analytics that are "strictly necessary" for service improvement when no PII is collected.

---

## Events Tracked

| Event | Trigger | Extra data |
|---|---|---|
| `pageview` | Component mounts | — |
| `location_select` | User clicks a location in list or map | `location` = stream ID |
| `play_start` | Audio `playing` event fires | `location` = stream ID |
| `play_stop` | User stops, switches stream, sleep timer fires, or final retry failure | `location` = stream ID · `value` = duration in seconds (capped at 3h) |
| `share_click` | User clicks the share button | `location` = stream ID |
| `sleep_timer_set` | User activates a sleep timer option | `location` = stream ID · `value` = minutes (15/30/60/90) |

---

## Architecture

```
Browser (AudioPlayer.tsx)
  └─ track(event, location, value)
       └─ navigator.sendBeacon('/api/analytics/collect', blob)
            └─ POST /api/analytics/collect
                 └─ appendEvent() → data/events.ndjson  (one JSON line per event)

GET /api/analytics/report
  └─ buildReport() → reads + parses events.ndjson → aggregates → JSON response
```

### Event log format (NDJSON)

One JSON object per line:

```json
{"event":"play_start","location":"knepp","value":null,"sid":"f47ac10b-…","ts":1718200000000}
{"event":"play_stop","location":"knepp","value":342,"sid":"f47ac10b-…","ts":1718200342000}
{"event":"share_click","location":"seoul","value":null,"sid":"a94c1234-…","ts":1718201000000}
```

---

## Dashboard — `/api/analytics/report`

The report endpoint is **always protected**. You must set `ANALYTICS_SECRET` in your environment and pass `?key=VALUE` on every request.

| Condition | Response |
|---|---|
| `ANALYTICS_SECRET` not set | `404` — endpoint appears non-existent |
| `?key=` wrong or missing | `403 { "error": "forbidden" }` |
| `?key=` correct | `200` JSON report |

```bash
# Set the secret (add to your host's environment variables)
ANALYTICS_SECRET=change-me-to-something-long-and-random

# Query the report
curl "https://your-app.onrender.com/api/analytics/report?key=change-me-to-something-long-and-random"
```

### Response shape

```json
{
  "total_events": 4821,
  "top_locations": [
    { "location": "knepp",    "plays": 312 },
    { "location": "scotland", "plays": 287 },
    { "location": "seoul",    "plays": 203 }
  ],
  "avg_listen_seconds": 847,
  "avg_listen_formatted": "14m 7s",
  "daily_active": [
    { "day": "2026-06-08", "listeners": 34 },
    { "day": "2026-06-07", "listeners": 28 }
  ],
  "event_totals": [
    { "event": "play_start",      "count": 891 },
    { "event": "pageview",        "count": 743 },
    { "event": "location_select", "count": 612 },
    { "event": "play_stop",       "count": 589 },
    { "event": "share_click",     "count": 47  },
    { "event": "sleep_timer_set", "count": 23  }
  ],
  "generated_at": "2026-06-08T20:00:00.000Z"
}
```

### Metrics explained

| Field | Meaning |
|---|---|
| `top_locations` | Streams ranked by `play_start` count — most played first |
| `avg_listen_seconds` | Mean `value` across all `play_stop` events with `value > 0` |
| `avg_listen_formatted` | Human-readable version of the above |
| `daily_active.listeners` | Count of unique session IDs that triggered `play_start` each day |
| `event_totals` | Total count per event type across all time |

---

## Optional: Quick dashboard query examples

If you download `data/events.ndjson` and parse it locally:

**Top locations (last 7 days):**
```bash
# On Linux/macOS
grep '"play_start"' data/events.ndjson \
  | jq -r '.location' \
  | sort | uniq -c | sort -rn | head -10
```

**Average listen time:**
```bash
grep '"play_stop"' data/events.ndjson \
  | jq '[.value // 0] | add' \
  | awk 'BEGIN{s=0;n=0} {s+=$1;n++} END{printf "%dm %ds\n", s/n/60, s/n%60}'
```

**Daily sessions (last 30 days):**
```bash
grep '"play_start"' data/events.ndjson \
  | jq -r '(.ts/1000 | todate | .[0:10]) + " " + (.sid // "x")' \
  | sort -u | awk '{print $1}' | uniq -c | sort -k2 -r | head -30
```

---

## Configuration

| Environment variable | Default | Purpose |
|---|---|---|
| `DATA_DIR` | `./data` (project root) | Directory where `events.ndjson` is stored |
| `ANALYTICS_SECRET` | _(required)_ | Must be set. `/api/analytics/report?key=VALUE` required. Without it the endpoint returns 404. |

### Persistent storage on Render

By default the log file lives in the container filesystem and is **lost on restart**. To persist data:

1. Create a **Disk** in your Render service settings (e.g. mount path `/data`, size 1 GB).
2. Set environment variable `DATA_DIR=/data`.
3. Redeploy. Events will now survive restarts and re-deploys.

### Persistent storage on Railway / Fly.io

Mount a persistent volume at `/data` and set `DATA_DIR=/data`.

---

## File locations

| File | Purpose |
|---|---|
| `app/lib/track.ts` | Client-side beacon utility (browser only) |
| `app/lib/analytics.ts` | Server-side NDJSON read/write + report aggregation |
| `app/api/analytics/collect/route.ts` | `POST /api/analytics/collect` — receives events |
| `app/api/analytics/report/route.ts` | `GET /api/analytics/report` — returns dashboard JSON |
| `data/events.ndjson` | Event log (gitignored, created at runtime) |
