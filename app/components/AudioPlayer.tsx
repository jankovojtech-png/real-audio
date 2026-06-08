'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { LOCATIONS } from '@/app/lib/locations'
import type { Location } from '@/app/lib/locations'
import { track } from '@/app/lib/track'

// Lazy-load the map so it doesn't affect initial page paint.
// ssr: false because react-simple-maps relies on browser SVG APIs.
const WorldMap = dynamic(() => import('./WorldMap'), {
  ssr:     false,
  loading: () => (
    <div
      className="w-full rounded-xl animate-pulse"
      style={{ background: '#030810', aspectRatio: '800 / 500' }}
    />
  ),
})

type PlayState    = 'idle' | 'loading' | 'playing' | 'error'
type StreamHealth = 'unknown' | 'connecting' | 'live' | 'reconnecting' | 'offline'

const CATEGORY_META = {
  nature: { label: 'Nature', color: 'text-emerald-700', dot: 'bg-emerald-600' },
  urban:  { label: 'Urban',  color: 'text-amber-700',   dot: 'bg-amber-500'   },
} as const

// ─── Stream health badge config ────────────────────────────────────────────────
const HEALTH_BADGE: Record<
  Exclude<StreamHealth, 'unknown' | 'live'>,
  { label: string; text: string }
> = {
  connecting:   { label: 'Connecting',   text: 'text-slate-600'     },
  reconnecting: { label: 'Reconnecting', text: 'text-amber-700/80'  },
  offline:      { label: 'Offline',      text: 'text-red-800/80'    },
}

// ─── Retry / timeout constants ────────────────────────────────────────────────
const MAX_RETRIES  = 3
const RETRY_DELAY  = 2_000   // ms between retry attempts
const LOAD_TIMEOUT = 8_000   // ms to wait for first audio data before retrying

// ─── Sleep timer constants ─────────────────────────────────────────────────────
const SLEEP_OPTIONS = [15, 30, 60, 90] as const
const FADE_SECONDS  = 10   // seconds before end to begin volume fade

// ─── Artwork ──────────────────────────────────────────────────────────────────
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
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false,
    timeZone: timezone,
  }).format(date)
}

// Resets an HTMLAudioElement without triggering MEDIA_ELEMENT_ERROR: EMPTY SRC.
function destroyAudio(audio: HTMLAudioElement) {
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
}

// Formats a duration in seconds as M:SS for the sleep timer countdown.
function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  /** Pre-selected stream ID from a share URL, e.g. /listen/knepp */
  initialId?: string
}

export default function AudioPlayer({ initialId }: Props) {
  const audioRef         = useRef<HTMLAudioElement | null>(null)
  const retryCountRef    = useRef(0)
  const lastAttemptedRef = useRef('')
  const retryTimerRef    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const loadTimerRef     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const startStreamRef   = useRef<((id: string) => void) | undefined>(undefined)
  const sleepEndsAtRef     = useRef<number | null>(null)
  const sleepIntervalRef   = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const shareFeedbackRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const playStartedAtRef   = useRef<number | null>(null)
  const playingLocationRef = useRef<string>('')

  const [playState,        setPlayState]        = useState<PlayState>('idle')
  const [errorMessage,     setErrorMessage]     = useState<string>('')
  const [visualizerActive, setVisualizerActive] = useState(false)
  // initialId (when present and valid) pre-selects the location from the share URL
  const resolvedInitialId = LOCATIONS.some(l => l.id === initialId) ? (initialId ?? 'provence') : 'provence'
  const [activeId,         setActiveId]         = useState<string>(resolvedInitialId)
  const [now,              setNow]              = useState<Date | null>(null)
  const [streamHealth,     setStreamHealth]     = useState<Record<string, StreamHealth>>({})
  const [sleepMinutes,     setSleepMinutes]     = useState<number | null>(null)
  const [sleepSecondsLeft, setSleepSecondsLeft] = useState<number | null>(null)
  const [shareFeedback,    setShareFeedback]    = useState(false)

  const activeIdRef  = useRef(activeId)
  const playStateRef = useRef(playState)
  useEffect(() => { activeIdRef.current  = activeId  }, [activeId])
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
    // Track play duration before tearing down
    if (playStartedAtRef.current !== null) {
      const dur = Math.round((Date.now() - playStartedAtRef.current) / 1_000)
      track('play_stop', playingLocationRef.current, Math.min(dur, 10_800))
      playStartedAtRef.current   = null
      playingLocationRef.current = ''
    }
    clearInterval(sleepIntervalRef.current)
    sleepIntervalRef.current = undefined
    sleepEndsAtRef.current   = null
    setSleepMinutes(null)
    setSleepSecondsLeft(null)
    if (audioRef.current) audioRef.current.volume = 1
    clearTimeout(retryTimerRef.current)
    clearTimeout(loadTimerRef.current)
    retryCountRef.current = 0
    if (audioRef.current) {
      destroyAudio(audioRef.current)
      audioRef.current = null
    }
    setPlayState('idle')
    setVisualizerActive(false)
  }, [])

  const startStream = useCallback((locationId: string) => {
    clearTimeout(retryTimerRef.current)
    clearTimeout(loadTimerRef.current)

    if (locationId !== lastAttemptedRef.current) {
      retryCountRef.current = 0
    }
    lastAttemptedRef.current = locationId

    if (audioRef.current) {
      // Track duration of the outgoing stream before replacing it
      if (playStartedAtRef.current !== null) {
        const dur = Math.round((Date.now() - playStartedAtRef.current) / 1_000)
        track('play_stop', playingLocationRef.current, Math.min(dur, 10_800))
        playStartedAtRef.current   = null
        playingLocationRef.current = ''
      }
      destroyAudio(audioRef.current)
      audioRef.current = null
    }

    setPlayState('loading')
    setErrorMessage('')

    const isRetry = retryCountRef.current > 0
    setStreamHealth((prev) => ({
      ...prev,
      [locationId]: isRetry ? 'reconnecting' : 'connecting',
    }))

    const audio = new Audio(`/api/stream?id=${locationId}`)
    audio.preload = 'none'

    function onFailure() {
      clearTimeout(loadTimerRef.current)
      if (audioRef.current === audio) {
        destroyAudio(audio)
        audioRef.current = null
      }

      const attempt = retryCountRef.current + 1
      retryCountRef.current = attempt

      if (attempt < MAX_RETRIES) {
        setStreamHealth((prev) => ({ ...prev, [locationId]: 'reconnecting' }))
        retryTimerRef.current = setTimeout(() => {
          startStreamRef.current?.(locationId)
        }, RETRY_DELAY)
      } else {
        retryCountRef.current = 0
        setStreamHealth((prev) => ({ ...prev, [locationId]: 'offline' }))
        setPlayState('error')
        setErrorMessage(
          'This live microphone is temporarily offline. Try another location.',
        )
        setVisualizerActive(false)
        // Track any listening time that occurred before the final failure
        if (playStartedAtRef.current !== null) {
          const dur = Math.round((Date.now() - playStartedAtRef.current) / 1_000)
          track('play_stop', locationId, Math.min(dur, 10_800))
          playStartedAtRef.current   = null
          playingLocationRef.current = ''
        }
      }
    }

    loadTimerRef.current = setTimeout(() => {
      if (audioRef.current !== audio) return
      onFailure()
    }, LOAD_TIMEOUT)

    const onPlaying = () => {
      clearTimeout(loadTimerRef.current)
      retryCountRef.current      = 0
      playStartedAtRef.current   = Date.now()
      playingLocationRef.current = locationId
      setStreamHealth((prev) => ({ ...prev, [locationId]: 'live' }))
      setPlayState('playing')
      setVisualizerActive(true)
      track('play_start', locationId)
    }

    const onWaiting = () => { setVisualizerActive(false) }
    const onError   = () => { if (audioRef.current !== audio) return; onFailure() }
    const onStalled = () => { if (audioRef.current !== audio) return; onFailure() }

    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('error',   onError)
    audio.addEventListener('stalled', onStalled)

    audioRef.current = audio
    audio.play().catch(() => {
      if (audioRef.current !== audio) return
      onFailure()
    })
  }, [])

  useEffect(() => { startStreamRef.current = startStream }, [startStream])

  // ─── Media Session — metadata ────────────────────────────────────────────────
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
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const switchTo = (id: string) => {
      activeIdRef.current = id
      setActiveId(id)
      if (playStateRef.current === 'playing' || playStateRef.current === 'loading') {
        startStream(id)
      }
    }

    navigator.mediaSession.setActionHandler('play',          () => { startStream(activeIdRef.current) })
    navigator.mediaSession.setActionHandler('pause',         () => { stopStream() })
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
      ;(['play', 'pause', 'previoustrack', 'nexttrack'] as const).forEach(
        (action) => navigator.mediaSession.setActionHandler(action, null),
      )
    }
  }, [startStream, stopStream])

  // ─── Sleep timer ─────────────────────────────────────────────────────────────
  const handleSleepTimer = useCallback((minutes: number | null) => {
    clearInterval(sleepIntervalRef.current)
    sleepIntervalRef.current = undefined
    if (audioRef.current) audioRef.current.volume = 1

    if (minutes === null) {
      sleepEndsAtRef.current = null
      setSleepMinutes(null)
      setSleepSecondsLeft(null)
      return
    }

    const endsAt = Date.now() + minutes * 60 * 1_000
    sleepEndsAtRef.current = endsAt
    setSleepMinutes(minutes)
    setSleepSecondsLeft(minutes * 60)
    track('sleep_timer_set', activeIdRef.current, minutes)

    sleepIntervalRef.current = setInterval(() => {
      if (sleepEndsAtRef.current === null) return
      const remaining = Math.ceil((sleepEndsAtRef.current - Date.now()) / 1_000)
      if (remaining <= 0) {
        clearInterval(sleepIntervalRef.current)
        sleepIntervalRef.current = undefined
        sleepEndsAtRef.current   = null
        setSleepMinutes(null)
        setSleepSecondsLeft(null)
        if (audioRef.current) audioRef.current.volume = 1
        stopStream()
      } else {
        setSleepSecondsLeft(remaining)
        if (audioRef.current) {
          audioRef.current.volume =
            remaining > FADE_SECONDS ? 1 : Math.max(0.01, remaining / FADE_SECONDS)
        }
      }
    }, 1_000)
  }, [stopStream])

  // ─── Share ───────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    track('share_click', activeIdRef.current)
    const loc  = LOCATIONS.find(l => l.id === activeIdRef.current)!
    const url  = `${window.location.origin}/listen/${loc.id}`
    const title = `Listen live from ${loc.label} — Real Audio`
    const text  = `Real ambient sound from ${loc.label}, ${loc.region}, live right now.`

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url })
        return
      } catch {
        // User cancelled or API unavailable — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      clearTimeout(shareFeedbackRef.current)
      setShareFeedback(true)
      shareFeedbackRef.current = setTimeout(() => setShareFeedback(false), 2_000)
    } catch {
      // Clipboard not available — silently ignore
    }
  }, [])

  // ─── UI handlers ────────────────────────────────────────────────────────────
  const handleToggle = () => {
    if (playState === 'playing' || playState === 'loading') {
      stopStream()
    } else {
      lastAttemptedRef.current = ''
      retryCountRef.current    = 0
      startStream(activeId)
    }
  }

  const handleLocationSelect = (id: string) => {
    track('location_select', id)
    setActiveId(id)
    if (playState === 'playing' || playState === 'loading') startStream(id)
  }

  const handleRetryManual = () => {
    lastAttemptedRef.current = ''
    retryCountRef.current    = 0
    startStream(activeId)
  }

  // ─── Analytics — page view ───────────────────────────────────────────────
  useEffect(() => { track('pageview') }, [])

  // Unmount cleanup
  useEffect(() => () => {
    stopStream()
    clearTimeout(shareFeedbackRef.current)
  }, [stopStream])

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

  const statusLine = (() => {
    if (playState === 'idle')    return 'Ready'
    if (playState === 'playing') return 'Streaming live'
    if (playState === 'error')   return errorMessage || 'Stream error'
    return streamHealth[activeId] === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'
  })()

  // Show share-URL CTA only when arriving via a share link and not yet playing
  const showCta = !!initialId && playState === 'idle'

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
                width:             `${180 + i * 90}px`,
                height:            `${180 + i * 90}px`,
                animationDelay:    `${i * 0.45}s`,
                animationDuration: '2.6s',
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-2xl">
        {/* Controls — kept narrow and centered */}
        <div className="w-full max-w-[280px] flex flex-col items-center gap-7">
        {/* Title + share button */}
        <div className="relative w-full flex flex-col items-center gap-1.5">
          <h1 className="text-2xl font-light tracking-[0.35em] text-slate-100/90 uppercase">
            Real Audio
          </h1>
          <p className="text-[10px] tracking-[0.25em] text-slate-600 uppercase">
            Live ambient stream
          </p>

          {/* Share button — top-right of title area */}
          <button
            onClick={handleShare}
            aria-label={`Share ${activeLocation.label}`}
            title={`Share ${activeLocation.label}`}
            className="absolute right-0 top-0 p-1 text-slate-700 hover:text-slate-400 transition-colors duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-600 rounded"
          >
            {shareFeedback ? (
              <span className="text-[9px] tracking-widest uppercase text-slate-500">
                Copied
              </span>
            ) : (
              <svg
                className="w-[14px] h-[14px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 6l-4-4-4 4M12 2v13"
                />
              </svg>
            )}
          </button>
        </div>

        {/* CTA — only shown when arriving via a share URL, before pressing play */}
        {showCta && (
          <p className="text-[10px] tracking-[0.2em] text-slate-600 uppercase text-center -mt-3">
            Start listening to {activeLocation.label}
          </p>
        )}

        {/* Play / Pause / Cancel */}
        <button
          onClick={handleToggle}
          aria-label={
            playState === 'loading'
              ? 'Cancel connection'
              : isActive
              ? 'Stop stream'
              : `Play ${activeLocation.label}`
          }
          className={[
            'relative w-16 h-16 rounded-full flex items-center justify-center',
            'transition-all duration-300 focus:outline-none cursor-pointer',
            'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080c10]',
            isActive
              ? activeLocation.category === 'urban'
                ? 'bg-amber-600/80 hover:bg-amber-500/80 shadow-lg shadow-amber-900/40 cursor-pointer focus-visible:ring-amber-500'
                : 'bg-indigo-600/90 hover:bg-indigo-500 shadow-lg shadow-indigo-900/50 cursor-pointer focus-visible:ring-indigo-500'
              : 'bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 hover:border-slate-500/60 cursor-pointer focus-visible:ring-slate-500',
          ].join(' ')}
        >
          {playState === 'loading' ? (
            /* Spinner with a centred stop-square: tap to cancel */
            <span className="relative flex items-center justify-center w-5 h-5">
              <svg className="absolute inset-0 w-5 h-5 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="w-2 h-2 rounded-sm bg-slate-400 opacity-70" />
            </span>
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
                    ? streamHealth[activeId] === 'reconnecting'
                      ? 'text-amber-700/80'
                      : 'text-slate-600'
                    : 'text-slate-700',
            ].join(' ')}
          >
            {statusLine}
          </p>
          {playState === 'error' && (
            <button
              onClick={handleRetryManual}
              className="text-[10px] text-slate-600 hover:text-slate-400 underline underline-offset-4 transition-colors tracking-wider"
            >
              Try again
            </button>
          )}
        </div>

        {/* Sleep timer */}
        <div className="w-full flex flex-col items-center gap-1">
          <div className="flex items-center gap-0.5 w-full px-1">
            <span className="text-[9px] tracking-[0.2em] uppercase text-slate-800 mr-2 select-none">
              Sleep
            </span>
            {SLEEP_OPTIONS.map((m) => {
              const isSelected = sleepMinutes === m
              return (
                <button
                  key={m}
                  onClick={() => handleSleepTimer(isSelected ? null : m)}
                  aria-pressed={isSelected}
                  className={[
                    'flex-1 py-1 rounded text-[9px] tracking-wider uppercase transition-colors duration-150',
                    'focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-600',
                    isSelected
                      ? 'text-slate-300 bg-slate-700/60'
                      : 'text-slate-700 hover:text-slate-500 hover:bg-slate-800/40',
                  ].join(' ')}
                >
                  {m}m
                </button>
              )
            })}
            <button
              onClick={() => handleSleepTimer(null)}
              aria-pressed={sleepMinutes === null}
              className={[
                'flex-1 py-1 rounded text-[9px] tracking-wider uppercase transition-colors duration-150',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-600',
                sleepMinutes === null
                  ? 'text-slate-300 bg-slate-700/60'
                  : 'text-slate-700 hover:text-slate-500 hover:bg-slate-800/40',
              ].join(' ')}
            >
              Off
            </button>
          </div>

          {sleepSecondsLeft !== null && sleepSecondsLeft > 0 && (
            <p
              className={[
                'text-[10px] tabular-nums tracking-wider transition-colors duration-500',
                sleepSecondsLeft <= FADE_SECONDS ? 'text-slate-500' : 'text-slate-700',
              ].join(' ')}
            >
              {sleepSecondsLeft <= FADE_SECONDS
                ? `Fading out… ${sleepSecondsLeft}s`
                : `Stops in ${formatCountdown(sleepSecondsLeft)}`}
            </p>
          )}
        </div>

        </div>

        {/* World map — full card width */}
        <WorldMap
          locations={LOCATIONS}
          activeId={activeId}
          streamHealth={streamHealth}
          isStreaming={playState === 'playing'}
          onSelect={handleLocationSelect}
        />

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
                  const health          = (streamHealth[loc.id] ?? 'unknown') as StreamHealth
                  const isOffline       = health === 'offline'
                  const isReconnecting  = health === 'reconnecting'

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
                      {/* Status dot */}
                      <span
                        className={[
                          'flex-none w-1.5 h-1.5 rounded-full transition-all duration-300',
                          isStreamingThis
                            ? `${locMeta.dot} shadow-[0_0_5px_1px] shadow-current`
                            : isSelected && isReconnecting
                              ? 'bg-amber-600/60 animate-pulse'
                              : isSelected && isOffline
                                ? 'bg-red-900/80'
                                : isSelected
                                  ? 'bg-slate-600'
                                  : isOffline
                                    ? 'bg-red-900/40'
                                    : 'bg-slate-800 group-hover:bg-slate-700',
                        ].join(' ')}
                      />

                      {/* Label + description + health badge */}
                      <span className="flex-1 min-w-0">
                        <span
                          className={[
                            'block text-[13px] leading-snug transition-colors duration-150',
                            isSelected
                              ? 'text-slate-200'
                              : isOffline
                                ? 'text-slate-600'
                                : 'text-slate-500 group-hover:text-slate-400',
                          ].join(' ')}
                        >
                          {loc.label}
                        </span>
                        <span className="block text-[10px] text-slate-700 leading-snug mt-0.5">
                          {loc.description}
                        </span>
                        {(isSelected
                          ? health === 'connecting' || health === 'reconnecting' || health === 'offline'
                          : health === 'offline'
                        ) && (
                          <span
                            className={[
                              'block text-[9px] uppercase tracking-widest mt-0.5',
                              HEALTH_BADGE[health as keyof typeof HEALTH_BADGE].text,
                            ].join(' ')}
                          >
                            {HEALTH_BADGE[health as keyof typeof HEALTH_BADGE].label}
                          </span>
                        )}
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
