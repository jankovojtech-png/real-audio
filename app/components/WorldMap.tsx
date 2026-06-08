'use client'

import { useState } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from 'react-simple-maps'
import type { Location } from '@/app/lib/locations'

// World-atlas 110m countries TopoJSON served from jsDelivr CDN.
const GEO_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

type StreamHealth = 'unknown' | 'connecting' | 'live' | 'reconnecting' | 'offline'

export interface WorldMapProps {
  locations:    Location[]
  activeId:     string
  streamHealth: Record<string, StreamHealth>
  isStreaming:  boolean
  onSelect:     (id: string) => void
}

// ─── Projection presets ────────────────────────────────────────────────────────
const VIEWS = {
  europe: { scale: 580, center: [15, 53] as [number, number] },
  world:  { scale: 140, center: [10, 15] as [number, number] },
} as const

type ViewKey = keyof typeof VIEWS

// ─── Colour helpers ────────────────────────────────────────────────────────────
const CATEGORY_COLOR: Record<Location['category'], string> = {
  nature: '#4ade80',
  urban:  '#fbbf24',
}

function dotFill(
  loc: Location,
  isActive: boolean,
  health: StreamHealth,
): string {
  if (health === 'offline') return '#7f1d1d'
  if (isActive)             return CATEGORY_COLOR[loc.category]
  return '#1e3050'
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorldMap({
  locations,
  activeId,
  streamHealth,
  isStreaming,
  onSelect,
}: WorldMapProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [view, setView] = useState<ViewKey>('europe')

  const { scale, center } = VIEWS[view]

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden select-none"
      style={{ background: '#030810' }}
    >
      {/* View toggle */}
      <div className="absolute top-2.5 left-3 z-10 flex items-center gap-1">
        {(['europe', 'world'] as ViewKey[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={[
              'px-2.5 py-1 rounded text-[9px] tracking-widest uppercase transition-colors duration-150',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-500',
              view === v
                ? 'bg-slate-700/70 text-slate-300'
                : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800/50',
            ].join(' ')}
          >
            {v === 'europe' ? 'Europe' : 'World'}
          </button>
        ))}
      </div>

      <ComposableMap
        projectionConfig={{ scale, center }}
        width={800}
        height={500}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* SVG defs — glow filters */}
        <defs>
          <filter id="ra-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="ra-glow-soft" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Country outlines — higher contrast land fill and stroke */}
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#0d1e2e"
                stroke="#1f3a5c"
                strokeWidth={0.5}
                style={{
                  default: { outline: 'none' },
                  hover:   { outline: 'none' },
                  pressed: { outline: 'none' },
                }}
                tabIndex={-1}
              />
            ))
          }
        </Geographies>

        {/* Location markers */}
        {locations.map((loc) => {
          const isActive       = loc.id === activeId
          const health         = streamHealth[loc.id] ?? 'unknown'
          const isLive         = isActive && isStreaming && health === 'live'
          const isReconnecting = health === 'reconnecting'
          const isOffline      = health === 'offline'
          const isFocused      = focusedId === loc.id
          const fill           = dotFill(loc, isActive, health)
          // ~40% larger markers vs previous (was 7/4)
          const r              = isActive ? 10 : 6

          return (
            <Marker key={loc.id} coordinates={[loc.lng, loc.lat]}>
              {/* Two staggered pulse rings — only while live */}
              {isLive && (
                <>
                  <circle
                    r={18}
                    fill="none"
                    stroke={CATEGORY_COLOR[loc.category]}
                    strokeWidth={1.5}
                    style={{
                      pointerEvents:   'none',
                      animation:       'ra-pulse 2.2s ease-out infinite',
                      transformOrigin: 'center',
                      transformBox:    'fill-box',
                    }}
                  />
                  <circle
                    r={18}
                    fill="none"
                    stroke={CATEGORY_COLOR[loc.category]}
                    strokeWidth={1.5}
                    style={{
                      pointerEvents:   'none',
                      animation:       'ra-pulse 2.2s ease-out 1.1s infinite',
                      transformOrigin: 'center',
                      transformBox:    'fill-box',
                    }}
                  />
                </>
              )}

              {/* Ambient glow halo — live only */}
              {isLive && (
                <circle
                  r={30}
                  fill={CATEGORY_COLOR[loc.category]}
                  opacity={0.12}
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Active selection ring */}
              {isActive && !isOffline && (
                <circle
                  r={17}
                  fill="none"
                  stroke={fill}
                  strokeWidth={1}
                  opacity={0.5}
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Reconnecting pulse ring */}
              {isActive && isReconnecting && (
                <circle
                  r={14}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth={1.2}
                  opacity={0.5}
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Keyboard focus ring */}
              {isFocused && (
                <circle
                  r={20}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  opacity={0.7}
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Enlarged touch / click target (~44 CSS-px equivalent) */}
              <circle
                r={22}
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-label={`Listen live from ${loc.label}, ${loc.region}`}
                aria-pressed={isActive}
                style={{ cursor: 'pointer', outline: 'none' }}
                onClick={() => onSelect(loc.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(loc.id)
                  }
                }}
                onFocus={() => setFocusedId(loc.id)}
                onBlur={()  => setFocusedId(null)}
              />

              {/* Visible dot */}
              <circle
                r={r}
                fill={fill}
                filter={isLive ? 'url(#ra-glow)' : isActive ? 'url(#ra-glow-soft)' : undefined}
                style={{ pointerEvents: 'none' }}
              />

              {/* Offline cross */}
              {isOffline && (
                <>
                  <line x1={-4} y1={-4} x2={4}  y2={4}  stroke="#991b1b" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
                  <line x1={4}  y1={-4} x2={-4} y2={4}  stroke="#991b1b" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
                </>
              )}
            </Marker>
          )
        })}
      </ComposableMap>

      {/* Map legend */}
      <div className="absolute bottom-2.5 right-3 flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 opacity-90" />
          <span className="text-[9px] tracking-widest uppercase text-slate-500">Nature</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 opacity-90" />
          <span className="text-[9px] tracking-widest uppercase text-slate-500">Urban</span>
        </span>
      </div>
    </div>
  )
}
