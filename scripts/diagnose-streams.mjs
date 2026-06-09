/**
 * Real Audio — Stream Source Diagnostics
 *
 * Tests all 18 Icecast source URLs *directly*, bypassing FFmpeg and the Next.js
 * API layer.  Runs entirely in Node.js using only built-in modules.
 *
 * Usage:  node scripts/diagnose-streams.mjs
 *
 * For each stream the script reports:
 *   id · label · url · httpStatus · contentType · ttfb (ms) ·
 *   ttFirstByte (ms) · bytesReceived · status
 *
 * Status values:
 *   online    — 200, audio content-type, ≥4 KB received, first-byte ≤5 s
 *   slow      — 200, audio content-type, ≥4 KB received, first-byte >5 s
 *   no-audio  — 200 but non-audio content-type, or timed-out before 4 KB
 *   dead      — connection refused / timeout / HTTP ≥400
 */

import http from 'node:http'
import { performance } from 'node:perf_hooks'

// ─── Source URLs (mirrors app/api/stream/route.ts) ────────────────────────────
const STREAMS = {
  // Nature
  knepp:      { url: 'http://locus.creacast.com:9001/knepp_water.mp3',                              label: 'Knepp Wildland, England'           },
  kisumu:     { url: 'http://locus.creacast.com:9001/zwolle_nature_reserve_langenholte.mp3',        label: 'Langenholte Wetland, Netherlands'   },
  ortler:     { url: 'http://locus.creacast.com:9001/ortler_end_der_welt_ferner.mp3',               label: 'Ortler Glacier, Alps'              },
  scotland:   { url: 'http://locus.creacast.com:9001/gair_wood_001.mp3',                            label: 'Gair Wood, Scotland'               },
  marseille:  { url: 'http://locus.creacast.com:9001/marseille_frioul.mp3',                         label: 'Île de Frioul, Mediterranean'      },
  kyoto:      { url: 'http://locus.creacast.com:9001/jeju_georo.mp3',                               label: 'Jeju Island, Korea'                },
  reykjavik:  { url: 'http://locus.creacast.com:9001/falmouth__school_of_art.mp3',                  label: 'Falmouth Coast, Cornwall'          },
  alps:       { url: 'http://locus.creacast.com:9001/bern_holli_der_hof.ogg',                       label: 'Holli der Hof, Bern'               },
  bergen:     { url: 'http://locus.creacast.com:9001/dumfries_and_galloway_loch_patrick.mp3',       label: 'Loch Patrick, Scotland'            },
  seattle:    { url: 'http://locus.creacast.com:9001/jasper_ridge_birdcast.mp3',                    label: 'Jasper Ridge, California'          },
  provence:   { url: 'http://locus.creacast.com:9001/sibra_manoir_bruit.ogg',                       label: 'Sibra, Ariège, France'             },
  // Urban
  brussels:   { url: 'http://locus.creacast.com:9001/bruxelles_rue_de_la_poudriere.mp3',            label: 'Rue de la Poudrière, Brussels'     },
  seoul:      { url: 'http://locus.creacast.com:9001/seoul_gusan.mp3',                              label: 'Gusan-dong, Seoul'                 },
  santamarta: { url: 'http://locus.creacast.com:9001/r-urban_poplar.mp3',                           label: 'r-urban Poplar, London'            },
  helsinki:   { url: 'http://locus.creacast.com:9001/brno_luzanky.mp3',                             label: 'Lužánky Park, Brno'                },
  lisbon:     { url: 'http://locus.creacast.com:9001/chania_stream.mp3',                            label: 'Chania, Crete'                     },
  bangkok:    { url: 'http://locus.creacast.com:9001/flucc_wien.mp3',                               label: 'FLUCC Wien, Vienna'                },
  edinburgh:  { url: 'http://locus.creacast.com:9001/lancaster_ck-flor.mp3',                        label: 'Lancaster, England'                },
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const OVERALL_TIMEOUT_MS = 12_000   // hard cap per stream
const AUDIO_TARGET_BYTES = 4_096    // consider online once we have this much
const SLOW_THRESHOLD_MS  = 5_000    // first-byte > this = 'slow'

// ─── Classification ────────────────────────────────────────────────────────────
function classify({ httpStatus, contentType, ttFirstByte, bytesReceived, timedOut, error }) {
  if (error || !httpStatus || httpStatus >= 400) return 'dead'
  if (httpStatus !== 200)                        return 'dead'
  const isAudio = contentType &&
    (contentType.includes('audio') || contentType.includes('mpeg') || contentType.includes('ogg') || contentType.includes('vorbis'))
  if (!isAudio)                                  return 'no-audio'
  if (timedOut || bytesReceived < AUDIO_TARGET_BYTES) return 'no-audio'
  if (ttFirstByte > SLOW_THRESHOLD_MS)           return 'slow'
  return 'online'
}

// ─── Single-stream probe ────────────────────────────────────────────────────────
function probeStream(id, { url, label }) {
  return new Promise((resolve) => {
    const t0         = performance.now()
    let httpStatus   = null
    let contentType  = null
    let ttfb         = null   // time to response headers
    let ttFirstByte  = null   // time to first data chunk
    let bytesReceived = 0
    let done         = false
    let connectError = null

    function finish(timedOut = false) {
      if (done) return
      done = true
      clearTimeout(hardTimer)
      const elapsed = performance.now() - t0
      const result = {
        id,
        label,
        url,
        httpStatus,
        contentType: contentType ?? null,
        ttfb:        ttfb        != null ? Math.round(ttfb)        : null,
        ttFirstByte: ttFirstByte != null ? Math.round(ttFirstByte) : null,
        bytesReceived,
        elapsed:     Math.round(elapsed),
        timedOut,
        error:       connectError,
      }
      result.status = classify(result)
      resolve(result)
    }

    const hardTimer = setTimeout(() => {
      req.destroy()
      finish(true)
    }, OVERALL_TIMEOUT_MS)

    // Disable ICY metadata headers — we only want raw audio bytes
    const opts = {
      headers: { 'Icy-MetaData': '0', 'User-Agent': 'RealAudioDiag/1.0' },
    }

    const req = http.get(url, opts, (res) => {
      ttfb        = performance.now() - t0
      httpStatus  = res.statusCode
      contentType = res.headers['content-type'] ?? res.headers['Content-Type'] ?? null

      // Icecast sometimes sends 'icy-name' but no content-type for legacy clients;
      // treat any response with icy-name as audio
      if (!contentType && res.headers['icy-name']) {
        contentType = 'audio/mpeg'
      }

      res.on('data', (chunk) => {
        if (ttFirstByte === null) ttFirstByte = performance.now() - t0
        bytesReceived += chunk.length
        if (bytesReceived >= AUDIO_TARGET_BYTES) {
          req.destroy()
          finish(false)
        }
      })

      res.on('end',   () => finish(false))
      res.on('error', () => finish(false))
    })

    req.on('error', (err) => {
      connectError = err.message
      finish(false)
    })

    req.on('timeout', () => {
      req.destroy()
      finish(true)
    })
  })
}

// ─── Status emoji ─────────────────────────────────────────────────────────────
const STATUS_ICON = { online: '✅', slow: '🟡', 'no-audio': '⚠️ ', dead: '❌' }

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const ids = Object.keys(STREAMS)
  console.log(`\nReal Audio — Stream Diagnostics  (${new Date().toISOString()})`)
  console.log(`Testing ${ids.length} source URLs on locus.creacast.com:9001`)
  console.log(`Timeout per stream: ${OVERALL_TIMEOUT_MS / 1000}s  |  Audio target: ${AUDIO_TARGET_BYTES} bytes\n`)

  // Run all probes in parallel — 18 lightweight HTTP connections
  const results = await Promise.all(ids.map((id) => probeStream(id, STREAMS[id])))

  // ─── Print table ──────────────────────────────────────────────────────────
  const col = (s, n) => String(s ?? '—').padEnd(n)
  const rpad = (s, n) => String(s ?? '—').padStart(n)

  console.log(
    col('ID', 12) + col('Label', 38) + rpad('HTTP', 6) +
    col('  Content-Type', 26) + rpad('TTFB', 7) + rpad('1st byte', 10) +
    rpad('Bytes', 8) + '  Status'
  )
  console.log('─'.repeat(120))

  const summary = { online: [], slow: [], 'no-audio': [], dead: [] }

  for (const r of results) {
    const icon = STATUS_ICON[r.status] ?? '?'
    console.log(
      col(r.id, 12) +
      col(r.label, 38) +
      rpad(r.httpStatus, 6) +
      col('  ' + (r.contentType ?? '—').split(';')[0], 26) +
      rpad(r.ttfb  != null ? r.ttfb  + 'ms' : '—', 7) +
      rpad(r.ttFirstByte != null ? r.ttFirstByte + 'ms' : '—', 10) +
      rpad(r.bytesReceived > 0 ? r.bytesReceived + 'B' : '—', 8) +
      `  ${icon} ${r.status}` +
      (r.error ? `  (${r.error})` : '')
    )
    summary[r.status].push(r.id)
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(120))
  console.log('\nSummary')
  console.log(`  ✅  Online   (${summary.online.length}): ${summary.online.join(', ') || 'none'}`)
  console.log(`  🟡  Slow     (${summary.slow.length}): ${summary.slow.join(', ')   || 'none'}`)
  console.log(`  ⚠️   No-audio (${summary['no-audio'].length}): ${summary['no-audio'].join(', ') || 'none'}`)
  console.log(`  ❌  Dead     (${summary.dead.length}): ${summary.dead.join(', ')   || 'none'}`)

  const alive = summary.online.length + summary.slow.length
  console.log(`\n  ${alive} / ${ids.length} streams reachable from this machine`)

  if (summary.dead.length > 0 || summary['no-audio'].length > 0) {
    console.log('\nNote: dead/no-audio streams may work on the production server if')
    console.log('the Icecast host restricts connections by origin IP or region.')
  }

  console.log()
  return results
}

main().catch(console.error)
