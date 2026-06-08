# Render Deployment Checklist — Real Audio

**Target:** [render.com](https://render.com) — Web Service (Node.js)  
**Estimated deploy time:** 4–7 minutes on first build, ~2 minutes on re-deploys

---

## Pre-flight: what you need

- [ ] GitHub repository pushed and up to date (`git push origin main`)
- [ ] Render account created (free tier is fine to start)
- [ ] `ANALYTICS_SECRET` value chosen (a random string, e.g. `openssl rand -hex 32`)

---

## Step 1 — Create a new Web Service on Render

1. Go to **render.com → New → Web Service**
2. Connect your GitHub account if not already connected
3. Select the **`real-audio`** repository
4. Click **Connect**

---

## Step 2 — Exact Render settings

Fill in each field exactly as shown:

| Setting | Value |
|---|---|
| **Name** | `real-audio` (or any name you like) |
| **Region** | Frankfurt (EU) — closest to most Locus Sonus mics · or Oregon (US West) |
| **Branch** | `main` |
| **Root Directory** | _(leave blank)_ |
| **Runtime** | `Node` |
| **Build Command** | `apt-get install -y ffmpeg && npm ci && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | **Starter ($7/mo)** ← required for always-on. Free tier spins down after 15 min inactivity and kills active audio streams. |

> **Why `apt-get install -y ffmpeg` in the build command?**  
> Render's Node images run on Debian. FFmpeg is not pre-installed. The `apt-get` call installs it during the build phase so it is available at runtime. This adds ~30 seconds to the first build.

---

## Step 3 — Environment Variables

Go to **Environment → Add Environment Variable** and add:

| Key | Value | Notes |
|---|---|---|
| `ANALYTICS_SECRET` | `your-long-random-secret` | Required. Without this, `/api/analytics/report` returns 404. Generate with `openssl rand -hex 32`. |
| `DATA_DIR` | `/data` | Only needed if you add a persistent disk (see Step 4). Leave unset otherwise. |
| `NODE_ENV` | `production` | Render sets this automatically but explicit is safer. |

> **Optional persistent analytics storage:**  
> Without a disk, `data/events.ndjson` is written inside the container and lost on each re-deploy. For persistent analytics, see Step 4.

---

## Step 4 (Optional) — Persistent disk for analytics

1. In your Web Service settings, go to **Disks → Add Disk**
2. Set **Mount Path** to `/data`
3. Set **Size** to `1 GB` (free for Starter plan)
4. Add environment variable `DATA_DIR=/data`
5. Redeploy

Analytics events now survive restarts and re-deploys.

---

## Step 5 — Health check

In **Settings → Health & Alerts**:

| Setting | Value |
|---|---|
| **Health Check Path** | `/api/stream?id=knepp` |
| **Health Check Timeout** | `30` seconds |

> The health check hits the stream endpoint. A successful response has `Content-Type: audio/mpeg`. If ffmpeg is missing, it returns `503` and Render marks the service as unhealthy.

---

## Step 6 — Deploy

1. Click **Create Web Service**
2. Watch the **Logs** tab — look for:
   - `Setting up 'ffmpeg'` — ffmpeg installing ✅
   - `✓ Compiled successfully` — Next.js build ✅
   - `Listening on 0.0.0.0:3000` (or similar) — server started ✅
3. Your app is live at `https://your-app.onrender.com`

---

## Post-deploy verification

### Test 1 — App loads

Open `https://your-app.onrender.com` in a browser.

- [ ] Page loads with dark background ✅
- [ ] World map renders (may take 1–2s to load country outlines from CDN) ✅
- [ ] All 18 locations are listed ✅
- [ ] Local times shown for each location ✅

---

### Test 2 — Audio stream works

```bash
# Test a single stream with curl (should stream audio/mpeg indefinitely)
curl -v "https://your-app.onrender.com/api/stream?id=knepp" \
  --max-time 10 \
  --output /dev/null

# Expected response headers:
#   Content-Type: audio/mpeg
#   Transfer-Encoding: chunked
#   Cache-Control: no-cache, no-store, must-revalidate
```

In the browser:
- [ ] Click **Play** on any stream → spinner appears → status changes to "Streaming live" ✅
- [ ] Click **Stop** → audio stops cleanly ✅
- [ ] Click a different stream while playing → switches without error ✅

---

### Test 3 — Analytics report

```bash
# Replace YOUR_SECRET with the value of ANALYTICS_SECRET
curl "https://your-app.onrender.com/api/analytics/report?key=YOUR_SECRET"

# Expected: JSON with total_events, top_locations, daily_active, etc.
# After a few plays you should see play_start events counted.
```

- [ ] Returns JSON (not 404 or 403) when correct key is used ✅
- [ ] Returns `403` when wrong key is used ✅
- [ ] Returns `404` when `ANALYTICS_SECRET` env var is not set ✅

Without the secret set, the endpoint simply does not exist. Set `ANALYTICS_SECRET` in Render → Environment, then redeploy.

---

### Test 4 — Share URLs

Open `https://your-app.onrender.com/listen/knepp` directly.

- [ ] Page loads with "Knepp Wildland" pre-selected ✅
- [ ] "Start listening to Knepp Wildland" CTA is shown ✅
- [ ] OG metadata visible when pasting URL into a social preview tool ✅

Check OG image at:  
`https://your-app.onrender.com/listen/-/opengraph-image?id=knepp`  
or use [opengraph.xyz](https://www.opengraph.xyz) / [metatags.io](https://metatags.io) to preview.

---

### Test 5 — PWA install

On an Android phone:
1. Open the app in Chrome
2. Look for the "Add to Home screen" banner or tap ⋮ → Add to Home Screen
3. [ ] App icon appears on home screen ✅
4. [ ] App opens in standalone mode (no browser UI) ✅
5. [ ] Theme colour is dark (`#080c10`) ✅

On iPhone (Safari):
1. Tap Share → Add to Home Screen
2. [ ] "Real Audio" appears as the app name ✅
3. [ ] Opens fullscreen with black status bar ✅

---

### Test 6 — Offline fallback

1. With the app open, enable Airplane mode
2. Refresh the page
3. [ ] Offline page appears: "Real Audio needs internet to stream live sound." ✅
4. [ ] Retry button reloads the page ✅

---

## Troubleshooting

### Streams return 503 JSON `{ "error": "ffmpeg_unavailable" }`

**Cause:** FFmpeg was not installed during the build.

**Fix:**
1. Check the **Deploy Logs** — search for `ffmpeg`. You should see `Setting up 'ffmpeg'`.
2. If not present, verify the Build Command is exactly:
   ```
   apt-get install -y ffmpeg && npm ci && npm run build
   ```
3. Trigger a manual redeploy from the Render dashboard.
4. After redeploy, hit `/api/stream?id=knepp` — should stream `audio/mpeg`.

---

### Streams 503 even though ffmpeg shows in build logs

**Cause:** Render may cache the build image without re-running `apt-get`.

**Fix:** In Render → Deploy → **Clear build cache & deploy**.

---

### Stream connects but audio cuts out every 30–60 seconds

**Cause:** You are on the **Free tier** — Render's free instances have a request timeout that terminates long-running responses.

**Fix:** Upgrade to **Starter ($7/mo)** which has no request timeout for long-lived streaming connections.

---

### `/api/analytics/report` returns 404

**Cause:** `ANALYTICS_SECRET` environment variable is not set.

**Fix:**
1. Render dashboard → your service → **Environment**
2. Add `ANALYTICS_SECRET` = `your-secret-value`
3. Click **Save Changes** — Render will automatically redeploy

---

### `/api/analytics/report` returns 403

**Cause:** Wrong `?key=` value in the URL.

**Fix:** Use exactly the value stored in `ANALYTICS_SECRET`. Keys are case-sensitive.

---

### Service worker behaves strangely after a new deploy

Symptoms: old UI served, new features not visible, cached offline page shows when online.

**Cause:** The browser is serving a cached service worker or cached assets from a previous deploy.

**Steps to fix:**

1. **Hard refresh** the page: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
2. If that does not work, **clear site data**:
   - Chrome: DevTools → Application → Storage → **Clear site data**
   - Safari: Develop → Empty Caches
3. If still stuck, **unregister the service worker manually**:
   - Chrome: DevTools → Application → Service Workers → **Unregister**
   - Refresh the page — a fresh SW will register automatically
4. After a deploy, Render's CDN may serve a stale page for up to 60 seconds. Wait and refresh.

**Prevention (future):** When making major UI changes, increment the SW cache name in `public/sw.js`:
```js
// Change:
const CACHE_NAME = 'real-audio-v1'
// To:
const CACHE_NAME = 'real-audio-v2'
```
This forces all browsers to discard the old cache on the next visit.

---

### Audio plays on desktop but not on iPhone/iOS

**Cause:** iOS requires a direct user gesture to start `AudioContext` / `HTMLAudioElement.play()`. The play button already handles this correctly. Common culprit: the stream is being started programmatically without a tap.

**Check:** Make sure the user taps the play button directly. Autoplay without interaction is blocked by iOS.

---

## Monitoring

Render provides basic metrics (CPU, memory, response time) in the **Metrics** tab of your service.

For audio-specific health, you can use [UptimeRobot](https://uptimerobot.com) (free) to monitor `https://your-app.onrender.com/` with an HTTP check every 5 minutes. This also keeps the Starter plan service warm.

---

## Quick reference

```
Service URL:    https://your-app.onrender.com
Stream test:    curl -v "https://your-app.onrender.com/api/stream?id=knepp" --max-time 10 -o /dev/null
Analytics:      curl "https://your-app.onrender.com/api/analytics/report?key=YOUR_SECRET"
Share example:  https://your-app.onrender.com/listen/knepp
```
