import { type NextRequest } from 'next/server'
import ffmpeg from 'fluent-ffmpeg'
import { PassThrough } from 'stream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// All streams are from the Locus Sonus open microphone network.
// Browse the full live map at: http://locusonus.org/soundmap/
// Sources include both MP3 and Ogg Vorbis Icecast feeds — FFmpeg re-encodes
// all of them to a consistent MP3 output regardless of input codec.
export const STREAMS: Record<string, { url: string; label: string }> = {
  // ─── Nature ──────────────────────────────────────────────────────────────
  knepp: {
    url: 'http://locus.creacast.com:9001/knepp_water.mp3',
    label: 'Knepp Wildland, England',
  },
  kisumu: {
    url: 'http://locus.creacast.com:9001/kisumu_dunga_swamp.mp3',
    label: 'Dunga Swamp, Kenya',
  },
  alps: {
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
    url: 'http://locus.creacast.com:9001/santa_marta_trompito_017.mp3',
    label: 'El Trompito, Santa Marta',
  },
}

const DEFAULT_ID = 'knepp'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') ?? DEFAULT_ID
  const stream = STREAMS[id] ?? STREAMS[DEFAULT_ID]

  console.log(`[stream] Starting: ${stream.label} (${stream.url})`)

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
