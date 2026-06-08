# Real Audio — Technical Debt Report

---

## 13. Technical Debt Report

All debt items have been identified by full source audit of the repository as of June 2026.

---

### Severity: CRITICAL

| # | Issue | File(s) | Description | Risk |
|---|-------|---------|-------------|------|
| TD-01 | **No rate limiting on `/api/stream`** | `app/api/stream/route.ts` | Any client can open unlimited concurrent FFmpeg processes. A single attacker or viral traffic spike can exhaust server memory and CPU, crashing the application for all users. | Service outage, cost explosion |
| TD-02 | **FFmpeg binary is an invisible host dependency** | `next.config.ts`, `package.json` | `ffmpeg` must be installed on the host OS. There is no check, no error message, and no documentation. A fresh deployment to any PaaS will silently fail. | Silent deployment failure |
| TD-03 | **Single point of failure: Locus Sonus server** | `app/api/stream/route.ts` | All 18 streams depend on `locus.creacast.com:9001`. If this volunteer-maintained art server goes offline, the entire product stops working with no fallback. No health checks. No alerts. | Total service unavailability |
| TD-04 | **`fluent-ffmpeg` is deprecated** | `package.json` | npm warns: *"Package no longer supported."* Security vulnerabilities will not be patched. | Security risk, no support |

---

### Severity: HIGH

| # | Issue | File(s) | Description | Risk |
|---|-------|---------|-------------|------|
| TD-05 | **Duplicate stream URLs in STREAMS dict** | `app/api/stream/route.ts` | `lisbon` and `brussels` both resolve to `bruxelles_rue_de_la_poudriere.mp3`. `bangkok` and `seoul` both resolve to `seoul_gusan.mp3`. Users selecting "Lisbon" and "Brussels" hear identical audio — a trust/quality issue. | User confusion, credibility damage |
| TD-06 | **No error handling for FFmpeg startup failure** | `app/api/stream/route.ts` | If `ffmpeg` is not installed or the binary path is wrong, the error surfaces as a closed stream rather than a clear 500 response. No `try/catch` around `ffmpeg()` constructor. | Silent failures |
| TD-07 | **No tests of any kind** | entire repo | Zero unit tests, integration tests, or E2E tests. The streaming pipeline, stream switching logic, Media Session handlers, and clock logic are all untested. | Regression risk on every change |
| TD-08 | **No `.env` file / secret management** | entire repo | No environment variables defined anywhere. Stream URLs, future API keys, and database credentials would be committed to source if added naively. | Security risk at product growth |
| TD-09 | **All location data hardcoded in TSX** | `app/page.tsx` | Adding a new location requires a code change + redeploy. No admin panel, no CMS, no database. | Operational inflexibility |
| TD-10 | **One FFmpeg process per client (no stream sharing)** | `app/api/stream/route.ts` | If 100 users listen to "Provence" simultaneously, 100 separate FFmpeg processes connect to the same upstream source. This wastes bandwidth, CPU, and memory. | Does not scale past ~50 concurrent users |

---

### Severity: MEDIUM

| # | Issue | File(s) | Description | Risk |
|---|-------|---------|-------------|------|
| TD-11 | **No PWA manifest** | entire repo | No `manifest.json`, no service worker, no app icons. Cannot be installed to home screen. No offline fallback. | Poor mobile experience |
| TD-12 | **No README.md** | root | The repository has zero documentation for new developers. No setup instructions. No deployment guide. | Onboarding friction |
| TD-13 | **No monitoring or logging beyond `console.log`** | `app/api/stream/route.ts` | Only `console.log` and `console.error` exist. No structured logging, no Sentry, no uptime monitoring. Silent failures are invisible. | Operational blindness |
| TD-14 | **No analytics** | entire repo | No way to know which streams are most popular, how long users listen, where they are, or whether they return. | No product insights |
| TD-15 | **`page.tsx` is 607 lines as a single file** | `app/page.tsx` | All logic, constants, helpers, and UI are in one file. As the product grows, this becomes unmaintainable. No separation into components. | Maintainability |
| TD-16 | **No CI/CD pipeline** | entire repo | Code is committed to GitHub but there is no automated build, test, or deploy pipeline. Deploys are manual. | Deployment risk |
| TD-17 | **`author` field empty in `package.json`** | `package.json` | `"author": ""` — minor but signals incomplete project setup. | Minor |
| TD-18 | **`description` field empty in `package.json`** | `package.json` | `"description": ""` | Minor |
| TD-19 | **`main` field irrelevant in `package.json`** | `package.json` | `"main": "index.js"` is a Node.js library convention, meaningless for a Next.js app. | Minor |

---

### Severity: LOW

| # | Issue | File(s) | Description | Risk |
|---|-------|---------|-------------|------|
| TD-20 | **`type: commonjs` removed but `"main"` kept** | `package.json` | During manual scaffolding, `"type": "commonjs"` was removed but `"main": "index.js"` was not cleaned up. | Cosmetic |
| TD-21 | **No volume control** | `app/page.tsx` | No slider for audio volume. User must use system volume. | UX gap |
| TD-22 | **No skip-to-next on stream error** | `app/page.tsx` | When a stream errors, it shows "Stream error" and a Retry button. It does not automatically try the next stream. | UX gap |
| TD-23 | **Ortler Glacier stream described as "wind, ice & silence"** | `app/page.tsx` | The original Ortler stream was flagged by the product owner as "too silent." The description does not warn users. | User expectation mismatch |
| TD-24 | **`tsconfig.tsbuildinfo` in `.gitignore` but sometimes generated** | `.gitignore` | The file is correctly gitignored but its presence in the root can confuse some editors. | Cosmetic |
| TD-25 | **No Content Security Policy headers** | `app/api/stream/route.ts`, `app/layout.tsx` | No CSP header, no `next.config.ts` headers block. | Security hardening gap |

---

### Debt summary

| Severity | Count | Top priority action |
|----------|-------|-------------------|
| Critical | 4 | Add rate limiting; document FFmpeg dep; add upstream health check |
| High | 6 | Replace `fluent-ffmpeg`; deduplicate streams; add basic tests |
| Medium | 9 | Add README; add monitoring; split `page.tsx` into components |
| Low | 6 | Polish and cleanup |
