'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type PlayState = 'idle' | 'loading' | 'playing' | 'error'

interface Location {
  id: string
  label: string
  region: string
  description: string
  category: 'nature' | 'urban'
  timezone: string
}

const LOCATIONS: Location[] = [
  // ── Nature (11) ───────────────────────────────────────────────────────────
  {
    id: 'knepp',
    label: 'Knepp Wildland',
    region: 'England',
    description: 'Chalk stream & birdsong',
    category: 'nature',
    timezone: 'Europe/London',
  },
  {
    id: 'kisumu',
    label: 'Dunga Swamp',
    region: 'Kenya',
    description: 'Wetland birds & frogs',
    category: 'nature',
    timezone: 'Africa/Nairobi',
  },
  {
    id: 'ortler',
    label: 'Ortler Glacier',
    region: 'Alps',
    description: 'Wind, ice & silence',
    category: 'nature',
    timezone: 'Europe/Rome',
  },
  {
    id: 'scotland',
    label: 'Gair Wood',
    region: 'Scotland',
    description: 'Ancient forest floor',
    category: 'nature',
    timezone: 'Europe/London',
  },
  {
    id: 'marseille',
    label: 'Île de Frioul',
    region: 'Mediterranean',
    description: 'Sea & coastal wind',
    category: 'nature',
    timezone: 'Europe/Paris',
  },
  {
    id: 'kyoto',
    label: 'Kyoto',
    region: 'Japan',
    description: 'Garden wind & forest edge',
    category: 'nature',
    timezone: 'Asia/Tokyo',
  },
  {
    id: 'reykjavik',
    label: 'Reykjavík',
    region: 'Iceland',
    description: 'Cold coast & sea light',
    category: 'nature',
    timezone: 'Atlantic/Reykjavik',
  },
  {
    id: 'alps',
    label: 'Alps',
    region: 'Switzerland',
    description: 'Alpine meadow & birdsong',
    category: 'nature',
    timezone: 'Europe/Zurich',
  },
  {
    id: 'bergen',
    label: 'Bergen',
    region: 'Norway',
    description: 'Loch, reeds & grey sky',
    category: 'nature',
    timezone: 'Europe/Oslo',
  },
  {
    id: 'seattle',
    label: 'Seattle',
    region: 'USA',
    description: 'West Coast forest & birdsong',
    category: 'nature',
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'provence',
    label: 'Provence',
    region: 'France',
    description: 'South French countryside',
    category: 'nature',
    timezone: 'Europe/Paris',
  },
  // ── Urban (7) ─────────────────────────────────────────────────────────────
  {
    id: 'brussels',
    label: 'Rue de la Poudrière',
    region: 'Brussels',
    description: 'City street & traffic',
    category: 'urban',
    timezone: 'Europe/Brussels',
  },
  {
    id: 'seoul',
    label: 'Gusan-dong',
    region: 'Seoul',
    description: 'Korean neighbourhood',
    category: 'urban',
    timezone: 'Asia/Seoul',
  },
  {
    id: 'santamarta',
    label: 'El Trompito',
    region: 'Santa Marta',
    description: 'Colombian city hum',
    category: 'urban',
    timezone: 'America/Bogota',
  },
  {
    id: 'helsinki',
    label: 'Helsinki',
    region: 'Finland',
    description: 'City park & street noise',
    category: 'urban',
    timezone: 'Europe/Helsinki',
  },
  {
    id: 'lisbon',
    label: 'Lisbon',
    region: 'Portugal',
    description: 'European street & footsteps',
    category: 'urban',
    timezone: 'Europe/Lisbon',
  },
  {
    id: 'bangkok',
    label: 'Bangkok',
    region: 'Thailand',
    description: 'East Asian city & traffic',
    category: 'urban',
    timezone: 'Asia/Bangkok',
  },
  {
    id: 'edinburgh',
    label: 'Edinburgh',
    region: 'Scotland',
    description: 'Northern city & stone streets',
    category: 'urban',
    timezone: 'Europe/London',
  },
]

const CATEGORY_META = {
  nature: { label: 'Nature', color: 'text-emerald-700', dot: 'bg-emerald-600' },
  urban: { label: 'Urban', color: 'text-amber-700', dot: 'bg-amber-500' },
} as const

// ─── Artwork ──────────────────────────────────────────────────────────────────
// SVG data-URI artwork for the OS lock screen / car display.
// Two variants, one per category, using concentric rings that mirror the UI.
function makeSvgArtwork(bgInner: string, bgOuter: string, ring: string): string {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">',
    '<defs>',
    `<radialGradient id="g" cx="50%" cy="50%" r="70%">`,
    `<stop offset="0%" stop-color="${bgInner}"/>`,
    `<stop offset="100%" stop-color="${bgOuter}"/>`,
    '</radialGradient>',
    '</defs>',
    '<rect width="512" height="512" fill="url(#g)"/>',
    `<circle cx="256" cy="256" r="112" fill="none" stroke="${ring}" stroke-width="1" opacity="0.35"/>`,
    `<circle cx="256" cy="256" r="152" fill="none" stroke="${ring}" stroke-width="1" opacity="0.2"/>`,
    `<circle cx="256" cy="256" r="196" fill="none" stroke="${ring}" stroke-width="1" opacity="0.1"/>`,
    `<text x="256" y="268" text-anchor="middle" font-family="system-ui,sans-serif"`,
    ` font-size="30" font-weight="300" letter-spacing="10" fill="${ring}" opacity="0.55">REAL AUDIO</text>`,
    '</svg>',
  ].join('')
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const ARTWORK: Record<Location['category'], string> = {
  nature: makeSvgArtwork('#122418', '#040a06', '#4ade80'),
  urban:  makeSvgArtwork('#1f1100', '#060400', '#fbbf24'),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatLocalTime(timezone: string, date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(date)
}

// Resets an HTMLAudioElement without triggering MEDIA_ELEMENT_ERROR: EMPTY SRC.
// removeAttribute('src') + load() fires 'emptied' but never 'error'.
function destroyAudio(audio: HTMLAudioElement) {
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const audioRef      = useRef<HTMLAudioElement | null>(null)
  const [playState, setPlayState]       = useState<PlayState>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [visualizerActive, setVisualizerActive] = useState(false)
  const [activeId, setActiveId]         = useState<string>('provence')
  const [now, setNow]                   = useState<Date | null>(null)

  // Refs that keep action-handler closures honest without re-registering them.
  // We register handlers only once (on mount) to avoid flicker on car displays.
  const activeIdRef   = useRef(activeId)
  const playStateRef  = useRef(playState)
  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  useEffect(() => { playStateRef.current = playState }, [playState])

  // ─── Clock ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const msToNextMinute = 60_000 - (Date.now() % 60_000)
    let intervalId: ReturnType<typeof setInterval>
    const timeoutId = setTimeout(() => {
      tick()
      intervalId = setInterval(tick, 60_000)
    }, msToNextMinute)
    return () => { clearTimeout(timeoutId); clearInterval(intervalId) }
  }, [])

  // ─── Audio control ──────────────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    if (audioRef.current) {
      destroyAudio(audioRef.current)
      audioRef.current = null
    }
    setPlayState('idle')
    setVisualizerActive(false)
  }, [])

  const startStream = useCallback((locationId: string) => {
    if (audioRef.current) {
      destroyAudio(audioRef.current)
      audioRef.current = null
    }
    setPlayState('loading')
    setErrorMessage('')

    const audio = new Audio(`/api/stream?id=${locationId}`)
    audio.preload = 'none'

    const onPlaying = () => { setPlayState('playing'); setVisualizerActive(true) }
    const onWaiting = () => { setVisualizerActive(false) }
    const onError   = () => {
      if (audioRef.current !== audio) return
      setErrorMessage(audio.error?.message ?? 'Stream failed to load.')
      setPlayState('error')
      setVisualizerActive(false)
      destroyAudio(audio)
      audioRef.current = null
    }
    const onStalled = () => {
      if (audioRef.current !== audio) return
      setPlayState('error')
      setErrorMessage('Stream stalled. Try again.')
      setVisualizerActive(false)
    }

    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('error',   onError)
    audio.addEventListener('stalled', onStalled)

    audioRef.current = audio
    audio.play().catch((err: Error) => {
      if (audioRef.current !== audio) return
      setErrorMessage(err.message)
      setPlayState('error')
    })
  }, [])

  // ─── Media Session — metadata ────────────────────────────────────────────────
  // Re-runs whenever the active location or play state changes.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const loc = LOCATIONS.find((l) => l.id === activeId)!

    if (playState === 'playing' || playState === 'loading') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title:  loc.label,
        artist: `${CATEGORY_META[loc.category].label} · Real Audio`,
        album:  'Live Ambient Stream',
        artwork: [
          { src: ARTWORK[loc.category], sizes: '512x512', type: 'image/svg+xml' },
        ],
      })
      navigator.mediaSession.playbackState =
        playState === 'playing' ? 'playing' : 'none'
    } else {
      navigator.mediaSession.playbackState = 'none'
    }
  }, [playState, activeId])

  // ─── Media Session — action handlers ────────────────────────────────────────
  // Registered once on mount. Read refs instead of closed-over state so they
  // are always current without needing to be re-registered on every render.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const switchTo = (id: string) => {
      activeIdRef.current = id
      setActiveId(id)
      // Start streaming immediately if audio was already active
      if (
        playStateRef.current === 'playing' ||
        playStateRef.current === 'loading'
      ) {
        startStream(id)
      }
    }

    navigator.mediaSession.setActionHandler('play', () => {
      startStream(activeIdRef.current)
    })

    navigator.mediaSession.setActionHandler('pause', () => {
      stopStream()
    })

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      const idx  = LOCATIONS.findIndex((l) => l.id === activeIdRef.current)
      const prev = LOCATIONS[(idx - 1 + LOCATIONS.length) % LOCATIONS.length]
      switchTo(prev.id)
    })

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      const idx  = LOCATIONS.findIndex((l) => l.id === activeIdRef.current)
      const next = LOCATIONS[(idx + 1) % LOCATIONS.length]
      switchTo(next.id)
    })

    return () => {
      // Clear all handlers on unmount so they don't linger in a dead component
      ;(['play', 'pause', 'previoustrack', 'nexttrack'] as const).forEach(
        (action) => navigator.mediaSession.setActionHandler(action, null),
      )
    }
  }, [startStream, stopStream]) // startStream/stopStream are stable useCallbacks

  // ─── UI handlers ────────────────────────────────────────────────────────────
  const handleToggle = () => {
    if (playState === 'playing' || playState === 'loading') stopStream()
    else startStream(activeId)
  }

  const handleLocationSelect = (id: string) => {
    setActiveId(id)
    if (playState === 'playing' || playState === 'loading') startStream(id)
  }

  // Unmount cleanup
  useEffect(() => () => { stopStream() }, [stopStream])

  // ─── Derived ────────────────────────────────────────────────────────────────
  const isActive       = playState === 'playing' || playState === 'loading'
  const activeLocation = LOCATIONS.find((l) => l.id === activeId)!
  const grouped = (['nature', 'urban'] as Array<Location['category']>).map(
    (cat) => ({
      category: cat,
      meta: CATEGORY_META[cat],
      locations: LOCATIONS.filter((l) => l.category === cat),
    }),
  )

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#080c10] flex flex-col items-center justify-center px-6 py-16 overflow-hidden relative">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{ opacity: visualizerActive ? 1 : 0 }}
      >
        <div
          className="absolute inset-0 transition-all duration-1000"
          style={{
            background:
              activeLocation.category === 'urban'
                ? 'radial-gradient(ellipse 70% 55% at 50% 52%, rgba(245,158,11,0.07) 0%, transparent 70%)'
                : 'radial-gradient(ellipse 70% 55% at 50% 52%, rgba(99,102,241,0.10) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Pulsing rings */}
      {visualizerActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className={`absolute rounded-full border animate-ping ${
                activeLocation.category === 'urban'
                  ? 'border-amber-500/10'
                  : 'border-indigo-500/15'
              }`}
              style={{
                width: `${180 + i * 90}px`,
                height: `${180 + i * 90}px`,
                animationDelay: `${i * 0.45}s`,
                animationDuration: '2.6s',
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center gap-7 w-full max-w-[280px]">
        {/* Title */}
        <div className="flex flex-col items-center gap-1.5">
          <h1 className="text-2xl font-light tracking-[0.35em] text-slate-100/90 uppercase">
            Real Audio
          </h1>
          <p className="text-[10px] tracking-[0.25em] text-slate-600 uppercase">
            Live ambient stream
          </p>
        </div>

        {/* Play / Pause */}
        <button
          onClick={handleToggle}
          disabled={playState === 'loading'}
          aria-label={isActive ? 'Stop stream' : `Play ${activeLocation.label}`}
          className={[
            'relative w-16 h-16 rounded-full flex items-center justify-center',
            'transition-all duration-300 focus:outline-none',
            'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080c10]',
            'disabled:opacity-40 disabled:cursor-wait',
            isActive
              ? activeLocation.category === 'urban'
                ? 'bg-amber-600/80 hover:bg-amber-500/80 shadow-lg shadow-amber-900/40 cursor-pointer focus-visible:ring-amber-500'
                : 'bg-indigo-600/90 hover:bg-indigo-500 shadow-lg shadow-indigo-900/50 cursor-pointer focus-visible:ring-indigo-500'
              : 'bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 hover:border-slate-500/60 cursor-pointer focus-visible:ring-slate-500',
          ].join(' ')}
        >
          {playState === 'loading' ? (
            <svg className="w-5 h-5 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : isActive ? (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-slate-300 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5.14v14l11-7-11-7z" />
            </svg>
          )}
        </button>

        {/* Status */}
        <div className="flex flex-col items-center gap-1.5 min-h-[32px]">
          <p
            className={[
              'text-[10px] tracking-widest uppercase transition-colors duration-300',
              playState === 'error'
                ? 'text-red-400/80'
                : playState === 'playing'
                  ? activeLocation.category === 'urban'
                    ? 'text-amber-500'
                    : 'text-indigo-400'
                  : playState === 'loading'
                    ? 'text-slate-600'
                    : 'text-slate-700',
            ].join(' ')}
          >
            {playState === 'idle'    && 'Ready'}
            {playState === 'loading' && 'Connecting…'}
            {playState === 'playing' && 'Streaming live'}
            {playState === 'error'   && (errorMessage || 'Stream error')}
          </p>
          {playState === 'error' && (
            <button
              onClick={() => startStream(activeId)}
              className="text-[10px] text-slate-600 hover:text-slate-400 underline underline-offset-4 transition-colors tracking-wider"
            >
              Retry
            </button>
          )}
        </div>

        {/* Location selector */}
        <div className="w-full flex flex-col gap-3">
          {grouped.map(({ category, meta, locations }) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className={`text-[9px] font-medium tracking-[0.2em] uppercase ${meta.color}`}>
                  {meta.label}
                </span>
                <span className="flex-1 h-px bg-slate-800" />
              </div>

              <div className="flex flex-col gap-0.5">
                {locations.map((loc) => {
                  const isSelected      = loc.id === activeId
                  const isStreamingThis = isSelected && isActive
                  const locMeta         = CATEGORY_META[loc.category]

                  return (
                    <button
                      key={loc.id}
                      onClick={() => handleLocationSelect(loc.id)}
                      aria-pressed={isSelected}
                      className={[
                        'group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
                        'transition-all duration-200 focus:outline-none',
                        'focus-visible:ring-1 focus-visible:ring-slate-600',
                        isSelected
                          ? 'bg-slate-800/60 border border-slate-700/40'
                          : 'border border-transparent hover:bg-slate-800/30 hover:border-slate-700/20',
                      ].join(' ')}
                    >
                      {/* Live dot */}
                      <span
                        className={[
                          'flex-none w-1.5 h-1.5 rounded-full transition-all duration-300',
                          isStreamingThis
                            ? `${locMeta.dot} shadow-[0_0_5px_1px] shadow-current`
                            : isSelected
                              ? 'bg-slate-600'
                              : 'bg-slate-800 group-hover:bg-slate-700',
                        ].join(' ')}
                      />

                      {/* Name + description */}
                      <span className="flex-1 min-w-0">
                        <span
                          className={[
                            'block text-[13px] leading-snug transition-colors duration-150',
                            isSelected
                              ? 'text-slate-200'
                              : 'text-slate-500 group-hover:text-slate-400',
                          ].join(' ')}
                        >
                          {loc.label}
                        </span>
                        <span className="block text-[10px] text-slate-700 leading-snug mt-0.5">
                          {loc.description}
                        </span>
                      </span>

                      {/* Region + local time */}
                      <span className="flex-none flex flex-col items-end gap-0.5">
                        <span
                          className={[
                            'text-[9px] tracking-widest uppercase transition-colors duration-150',
                            isSelected
                              ? 'text-slate-600'
                              : 'text-slate-800 group-hover:text-slate-700',
                          ].join(' ')}
                        >
                          {loc.region}
                        </span>
                        <span
                          className={[
                            'text-[10px] tabular-nums transition-colors duration-150',
                            isSelected
                              ? 'text-slate-500'
                              : 'text-slate-700 group-hover:text-slate-600',
                          ].join(' ')}
                          suppressHydrationWarning
                        >
                          {now ? formatLocalTime(loc.timezone, now) : '--:--'}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-5 text-[9px] tracking-widest text-slate-800 uppercase select-none">
        Locus Sonus open microphones
      </p>
    </main>
  )
}
