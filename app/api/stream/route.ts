import { type NextRequest } from 'next/server'
import ffmpeg from 'fluent-ffmpeg'
import { PassThrough } from 'stream'
import { execFileSync } from 'child_process'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── FFmpeg availability check ─────────────────────────────────────────────────
// Runs once per worker process at module load time. If the `ffmpeg` binary is
// not in PATH, every request returns a 503 with a clear JSON error rather than
// a cryptic ffmpeg spawn failure.
const FFMPEG_AVAILABLE = (() => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
    console.log('[stream] startup: ffmpeg binary found in PATH')
    return true
  } catch {
    console.error(
      '[stream] FATAL: ffmpeg binary not found in PATH. ' +
      'Install ffmpeg on this server (e.g. apt-get install ffmpeg). ' +
      'Audio streaming will be unavailable until ffmpeg is installed.',
    )
    return false
  }
})()

// All streams are from the Locus Sonus open microphone network.
// Browse the full live map at: http://locusonus.org/soundmap/
// Sources include both MP3 and Ogg Vorbis Icecast feeds — FFmpeg re-encodes
// all of them to a consistent MP3 output regardless of input codec.
// Last probe-verified: 2026-06-09. All 18 URLs confirmed live from local.
// Where an exact city mic does not exist, the closest active match is used.
export const STREAMS: Record<string, { url: string; label: string }> = {
  // ─── Nature ──────────────────────────────────────────────────────────────
  knepp: {
    url: 'http://locus.creacast.com:9001/knepp_water.mp3',
    label: 'Knepp Wildland, England',
  },
  kisumu: {
    // Langenholte nature reserve, Zwolle NL — IJssel wetland, reeds & water
    // Replaces: kisumu_dunga_swamp.mp3 (404 dead as of 2026-06-08)
    url: 'http://locus.creacast.com:9001/zwolle_nature_reserve_langenholte.mp3',
    label: 'Langenholte Wetland, Netherlands',
  },
  ortler: {
    // Ortler glacier, Italy/Austria border
    url: 'http://locus.creacast.com:9001/ortler_end_der_welt_ferner.mp3',
    label: 'Ortler Glacier, Alps',
  },
  scotland: {
    url: 'http://locus.creacast.com:9001/gair_wood_001.mp3',
    label: 'Gair Wood, Scotland',
  },
  marseille: {
    url: 'http://locus.creacast.com:9001/marseille_frioul.mp3',
    label: 'Île de Frioul, Mediterranean',
  },
  kyoto: {
    // Jeju Island forest edge, Korea — East Asian garden & wind
    url: 'http://locus.creacast.com:9001/jeju_georo.mp3',
    label: 'Jeju Island, Korea',
  },
  reykjavik: {
    // Falmouth School of Art, Cornwall UK — cold coastal & sea light
    url: 'http://locus.creacast.com:9001/falmouth__school_of_art.mp3',
    label: 'Falmouth Coast, Cornwall',
  },
  alps: {
    // Holli der Hof farm, Bern, Switzerland — Alpine meadow & birdsong
    url: 'http://locus.creacast.com:9001/bern_holli_der_hof.ogg',
    label: 'Holli der Hof, Bern',
  },
  bergen: {
    // Loch Patrick, Dumfries & Galloway, Scotland — loch, reeds & wind
    url: 'http://locus.creacast.com:9001/dumfries_and_galloway_loch_patrick.mp3',
    label: 'Loch Patrick, Scotland',
  },
  seattle: {
    // Jasper Ridge Biological Preserve, Stanford CA — West Coast forest
    url: 'http://locus.creacast.com:9001/jasper_ridge_birdcast.mp3',
    label: 'Jasper Ridge, California',
  },
  provence: {
    // Sibra, Ariège, southern France — actual French countryside
    url: 'http://locus.creacast.com:9001/sibra_manoir_bruit.ogg',
    label: 'Sibra, Ariège, France',
  },
  // ─── Urban ───────────────────────────────────────────────────────────────
  brussels: {
    url: 'http://locus.creacast.com:9001/bruxelles_rue_de_la_poudriere.mp3',
    label: 'Rue de la Poudrière, Brussels',
  },
  seoul: {
    url: 'http://locus.creacast.com:9001/seoul_gusan.mp3',
    label: 'Gusan-dong, Seoul',
  },
  santamarta: {
    // r-urban Poplar, East London — multicultural urban neighbourhood
    // Replaces: santa_marta_trompito_017.mp3 (404 dead as of 2026-06-08)
    url: 'http://locus.creacast.com:9001/r-urban_poplar.mp3',
    label: 'r-urban Poplar, London',
  },
  helsinki: {
    // Lužánky city park, Brno, Czech Republic — European city park
    url: 'http://locus.creacast.com:9001/brno_luzanky.mp3',
    label: 'Lužánky Park, Brno',
  },
  lisbon: {
    // Chania, Crete — coastal Mediterranean city, similar acoustic feel to Lisbon
    // Replaces: duplicate of brussels (bruxelles_rue_de_la_poudriere.mp3)
    url: 'http://locus.creacast.com:9001/chania_stream.mp3',
    label: 'Chania, Crete',
  },
  bangkok: {
    // FLUCC Wien — Vienna waterside venue, active urban soundscape
    // Replaces: duplicate of seoul (seoul_gusan.mp3)
    url: 'http://locus.creacast.com:9001/flucc_wien.mp3',
    label: 'FLUCC Wien, Vienna',
  },
  edinburgh: {
    // Lancaster city, northern England — northern UK urban texture
    url: 'http://locus.creacast.com:9001/lancaster_ck-flor.mp3',
    label: 'Lancaster, England',
  },
}

const DEFAULT_ID = 'provence'

// ── Stderr filter ─────────────────────────────────────────────────────────────
// FFmpeg writes all diagnostic output to stderr (even normal progress lines).
// Only forward lines that signal a connection problem, HTTP error, or hard
// failure — everything else is routine format/codec info that clutters logs.
const STDERR_SIGNAL_WORDS = [
  'error', 'failed', 'failure', 'refused', 'timeout', 'timed out',
  'server returned', 'no route', 'unreachable', 'broken pipe',
  'unable to', 'invalid data', 'no such', 'connection', 'forbidden',
  '401', '403', '404', '503',
]
function isSignificantStderr(line: string): boolean {
  const lc = line.toLowerCase()
  return STDERR_SIGNAL_WORDS.some((w) => lc.includes(w))
}

export async function GET(request: NextRequest) {
  const t0      = Date.now()
  const ms      = () => `+${Date.now() - t0}ms`
  const tag     = (id: string) => `[stream:${id}]`

  const rawId      = request.nextUrl.searchParams.get('id') ?? DEFAULT_ID
  const resolvedId = STREAMS[rawId] ? rawId : DEFAULT_ID
  const stream     = STREAMS[resolvedId]

  // ── Log every inbound request ──────────────────────────────────────────────
  console.log(
    `${tag(resolvedId)} request  ffmpeg=${FFMPEG_AVAILABLE}` +
    `  url="${stream.url}"`,
  )

  if (!FFMPEG_AVAILABLE) {
    console.error(`${tag(resolvedId)} abort  reason=ffmpeg_unavailable  t=${ms()}`)
    return Response.json(
      {
        error: 'ffmpeg_unavailable',
        message:
          'FFmpeg is not installed on this server. ' +
          'Audio streaming requires ffmpeg. ' +
          'See /docs/DEPLOYMENT.md for setup instructions.',
      },
      { status: 503 },
    )
  }

  const passThrough   = new PassThrough()
  let   firstByteSent = false

  const command = ffmpeg(stream.url)
    .inputOptions([
      '-reconnect 1',
      '-reconnect_streamed 1',
      '-reconnect_delay_max 5',
      '-icy 0',
    ])
    .noVideo()
    .audioCodec('libmp3lame')
    .audioBitrate(128)
    .format('mp3')
    // ── Lifecycle events ────────────────────────────────────────────────────
    .on('start', (cmdLine: string) => {
      // Log the resolved command so we can confirm ffmpeg actually started.
      // Trim to keep log lines readable — full path + all flags can be long.
      const short = cmdLine.length > 200 ? cmdLine.slice(0, 200) + '…' : cmdLine
      console.log(`${tag(resolvedId)} ffmpeg spawned  t=${ms()}  cmd="${short}"`)
    })
    .on('stderr', (line: string) => {
      // Only surface stderr lines that signal a real problem (see filter above).
      if (isSignificantStderr(line)) {
        console.warn(`${tag(resolvedId)} ffmpeg stderr  t=${ms()}  "${line.trim()}"`)
      }
    })
    .on('error', (err: Error) => {
      // This fires on ffmpeg process error OR when the process is killed.
      // Killed-on-disconnect produces "ffmpeg was killed with signal SIGKILL"
      // which is expected — no need to treat it as an alert.
      const msg = err.message ?? String(err)
      if (msg.includes('SIGKILL') || msg.includes('SIGTERM')) {
        console.log(`${tag(resolvedId)} ffmpeg killed  t=${ms()}  "${msg}"`)
      } else {
        console.error(`${tag(resolvedId)} ffmpeg error  t=${ms()}  "${msg}"`)
      }
      if (!passThrough.destroyed) passThrough.destroy(err)
    })
    .on('end', () => {
      // Clean end — source stream closed normally (rare for Icecast; means the
      // microphone feed stopped or the Icecast server terminated the session).
      console.log(`${tag(resolvedId)} ffmpeg end  t=${ms()}`)
      if (!passThrough.destroyed) passThrough.end()
    })

  command.pipe(passThrough, { end: true })

  // ── Client disconnect ──────────────────────────────────────────────────────
  request.signal.addEventListener('abort', () => {
    console.log(`${tag(resolvedId)} client disconnected  t=${ms()}`)
    command.kill('SIGKILL')
    passThrough.destroy()
  })

  // ── Readable stream piped to HTTP response ─────────────────────────────────
  const readableStream = new ReadableStream({
    start(controller) {
      passThrough.on('data', (chunk: Buffer) => {
        if (!firstByteSent) {
          firstByteSent = true
          // This is the most important timing signal: how long from request
          // to the client receiving its first audio byte.
          console.log(
            `${tag(resolvedId)} first byte  t=${ms()}  size=${chunk.length}B`,
          )
        }
        controller.enqueue(chunk)
      })
      passThrough.on('end',   ()           => { controller.close() })
      passThrough.on('error', (err: Error) => { controller.error(err) })
    },
    cancel() {
      // Browser closed the connection before we finished (e.g. user navigated
      // away). This is normal and should not appear as an error.
      console.log(`${tag(resolvedId)} stream cancelled  t=${ms()}`)
      command.kill('SIGKILL')
      passThrough.destroy()
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type':           'audio/mpeg',
      'Transfer-Encoding':      'chunked',
      'Cache-Control':          'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
