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
    return true
  } catch {
    console.error(
      '[stream] ERROR: ffmpeg binary not found in PATH. ' +
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
// Last probe-verified: 2026-06-08. All 18 URLs are unique and confirmed live.
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

export async function GET(request: NextRequest) {
  if (!FFMPEG_AVAILABLE) {
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

  const id = request.nextUrl.searchParams.get('id') ?? DEFAULT_ID
  const stream = STREAMS[id] ?? STREAMS[DEFAULT_ID]

  const passThrough = new PassThrough()

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
    .on('error', (err: Error) => {
      console.error(`[stream] FFmpeg error (${id}):`, err.message)
      if (!passThrough.destroyed) {
        passThrough.destroy(err)
      }
    })
    .on('end', () => {
      if (!passThrough.destroyed) {
        passThrough.end()
      }
    })

  command.pipe(passThrough, { end: true })

  request.signal.addEventListener('abort', () => {
    command.kill('SIGKILL')
    passThrough.destroy()
  })

  const readableStream = new ReadableStream({
    start(controller) {
      passThrough.on('data', (chunk: Buffer) => {
        controller.enqueue(chunk)
      })
      passThrough.on('end', () => {
        controller.close()
      })
      passThrough.on('error', (err: Error) => {
        controller.error(err)
      })
    },
    cancel() {
      command.kill('SIGKILL')
      passThrough.destroy()
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
