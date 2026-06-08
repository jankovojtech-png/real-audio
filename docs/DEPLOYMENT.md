# Deployment Guide — Real Audio

## Critical Dependency: FFmpeg

Real Audio streams live audio by running **FFmpeg on the server** for every connected listener. The `/api/stream` route is a Node.js route that shells out to the `ffmpeg` binary. **FFmpeg must be installed on any server that runs this app.**

If FFmpeg is missing, the API returns:
```json
{ "error": "ffmpeg_unavailable", "message": "FFmpeg is not installed..." }
```
with HTTP status `503`.

---

## ⚠️ Vercel — NOT RECOMMENDED for audio streaming

Vercel is the standard deployment target for Next.js apps, but it is **not suitable** for Real Audio for two reasons:

1. **No FFmpeg binary**: Vercel's serverless runtime does not include `ffmpeg`. All stream requests will return 503.
2. **Function timeout limit**: Vercel Serverless Functions time out after 10–60 seconds (plan-dependent). Audio streaming is a long-running connection that must stay alive for minutes or hours. Even if FFmpeg were available, the stream would be cut after the function timeout.

> Vercel could work only with a custom Docker-based Fluid Compute setup with a self-compiled ffmpeg layer. This is complex and not officially supported for open-source free tiers.

---

## ✅ Recommended Platforms

### Render (recommended)
Render supports long-running Node.js web services with full control over the OS environment.

**Setup:**
1. Create a new **Web Service** in Render.
2. Set **Runtime** to `Node`.
3. In the **Build Command** field:
   ```bash
   apt-get install -y ffmpeg && npm ci && npm run build
   ```
4. In the **Start Command** field:
   ```bash
   npm start
   ```
5. Verify ffmpeg is available by hitting `/api/health` after deploy.

Render's free tier has spin-down on inactivity. Use the Starter plan ($7/month) for always-on streaming.

---

### Railway
Railway supports Dockerfiles and Nixpacks, both of which can install system packages.

**Option A — Nixpacks (auto-detected):**
Create `nixpacks.toml` in the project root:
```toml
[phases.setup]
nixPkgs = ["ffmpeg"]
```

**Option B — Dockerfile:**
```dockerfile
FROM node:20-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY . .
RUN npm ci && npm run build
CMD ["npm", "start"]
```

---

### DigitalOcean App Platform
Use a **Web Service** with a Dockerfile (same as Railway Option B above).

---

### VPS / Dedicated Server (Ubuntu / Debian)
```bash
# Install ffmpeg
sudo apt-get update && sudo apt-get install -y ffmpeg

# Verify
ffmpeg -version

# Clone and run
git clone https://github.com/jankovojtech-png/real-audio.git
cd real-audio
npm ci
npm run build
npm start
```

Use `pm2` to keep the process alive:
```bash
npm install -g pm2
pm2 start "npm start" --name real-audio
pm2 save && pm2 startup
```

---

### Fly.io
Use the Dockerfile approach (same as Railway Option B), then:
```bash
fly launch
fly deploy
```

---

## Health Check Endpoint

Once deployed, verify FFmpeg is working:

```
GET /api/stream?id=knepp
```

A successful response streams `audio/mpeg` data. A missing FFmpeg returns:
```json
{ "error": "ffmpeg_unavailable", ... }
```

---

## Environment Variables

No environment variables are required for basic operation. All stream URLs are hardcoded in `app/api/stream/route.ts`.

Optional:
| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (default: 3000) |
| `NODE_ENV` | Set to `production` for production builds |

---

## Local Development

```bash
# 1. Install ffmpeg (Windows — via Chocolatey or winget)
choco install ffmpeg
# or
winget install ffmpeg

# 2. Install ffmpeg (macOS)
brew install ffmpeg

# 3. Install ffmpeg (Ubuntu/Debian)
sudo apt-get install ffmpeg

# 4. Verify
ffmpeg -version

# 5. Run the dev server
npm run dev
```

---

## Build & Type Checking

```bash
# Type check (no emit)
npm run lint    # runs: tsc --noEmit

# Production build
npm run build   # runs: next build

# Start production server
npm start       # runs: next start
```

---

## Architecture Note on Scaling

The current architecture spawns **one FFmpeg process per connected listener**. For a small audience (< 100 concurrent listeners) on a dedicated server with sufficient CPU, this works well. For larger audiences, consider:

- Transcoding once to a shared HLS/Icecast feed and serving that static stream.
- Using an audio CDN (e.g. Icecast → CDN edge → listeners).
- Caching the transcoded stream with a shared `PassThrough` bus per stream ID.
