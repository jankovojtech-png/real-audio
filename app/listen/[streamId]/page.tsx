import type { Metadata } from 'next'
import { LOCATIONS } from '@/app/lib/locations'
import AudioPlayer from '@/app/components/AudioPlayer'

type Props = { params: Promise<{ streamId: string }> }

// ─── Open Graph + Twitter metadata ────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { streamId } = await params
  const loc = LOCATIONS.find((l) => l.id === streamId)

  if (!loc) {
    return {
      title: 'Stream not found — Real Audio',
      description: 'The requested stream was not found. Browse all live ambient locations.',
    }
  }

  const title       = `Listen live from ${loc.label} — Real Audio`
  const description = `Real ambient sound from ${loc.label}, ${loc.region}, live right now.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type:     'website',
      siteName: 'Real Audio',
    },
    twitter: {
      card:        'summary',
      title,
      description,
    },
  }
}

// ─── Not-found fallback ────────────────────────────────────────────────────────
function NotFoundStream({ streamId }: { streamId: string }) {
  return (
    <main className="min-h-screen bg-[#080c10] flex flex-col items-center justify-center px-6 py-16">
      <div className="flex flex-col items-center gap-6 max-w-[280px] text-center">
        <h1 className="text-2xl font-light tracking-[0.35em] text-slate-100/90 uppercase">
          Real Audio
        </h1>
        <p className="text-[11px] text-slate-600 tracking-wider">
          &ldquo;{streamId}&rdquo; is not a known location.
        </p>
        <div className="w-full flex flex-col gap-1">
          <p className="text-[9px] tracking-[0.2em] uppercase text-slate-800 mb-1">
            Available locations
          </p>
          {LOCATIONS.map((loc) => (
            <a
              key={loc.id}
              href={`/listen/${loc.id}`}
              className="text-[12px] text-slate-600 hover:text-slate-300 transition-colors tracking-wide py-0.5"
            >
              {loc.label}{' '}
              <span className="text-[10px] text-slate-800">{loc.region}</span>
            </a>
          ))}
        </div>
        <a
          href="/"
          className="text-[10px] text-slate-600 hover:text-slate-400 uppercase tracking-widest underline underline-offset-4 transition-colors mt-2"
        >
          Browse all
        </a>
      </div>
    </main>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function ListenPage({ params }: Props) {
  const { streamId } = await params
  const loc = LOCATIONS.find((l) => l.id === streamId)

  if (!loc) {
    return <NotFoundStream streamId={streamId} />
  }

  return <AudioPlayer initialId={streamId} />
}
