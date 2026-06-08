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
// Loaded asynchronously by react-simple-maps when the component mounts.
const GEO_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

type StreamHealth = 'unknown' | 'connecting' | 'live' | 'reconnecting' | 'offline'

export interface WorldMapProps {
  locations:    Location[]
  activeId:     string
  streamHealth: Record<string, StreamHealth>
  isStreaming:  boolean   // true only when playState === 'playing'
  onSelect:     (id: string) => void
}

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
  // Track which dot is focused via keyboard (for focus-visible ring)
  const [focusedId, setFocusedId] = useState<string | null>(null)

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden select-none"
      style={{ background: '#05080d' }}
    >
      <ComposableMap
        projectionConfig={{ scale: 145, center: [15, 20] }}
        width={800}
        height={410}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* SVG defs — glow filter for active streaming dot */}
        <defs>
          <filter id="ra-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="ra-glow-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Country outlines */}
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#0b1623"
                stroke="#16243a"
                strokeWidth={0.4}
                style={{
                  default:  { outline: 'none' },
                  hover:    { outline: 'none' },
                  pressed:  { outline: 'none' },
                }}
                tabIndex={-1}
              />
            ))
          }
        </Geographies>

        {/* Location markers */}
        {locations.map((loc) => {
          const isActive      = loc.id === activeId
          const health        = streamHealth[loc.id] ?? 'unknown'
          const isLive        = isActive && isStreaming && health === 'live'
          const isReconnecting = health === 'reconnecting'
          const isOffline     = health === 'offline'
          const isFocused     = focusedId === loc.id
          const fill          = dotFill(loc, isActive, health)
          const r             = isActive ? 7 : 4

          return (
            <Marker key={loc.id} coordinates={[loc.lng, loc.lat]}>
              {/* Outer glow halo — only while live-streaming */}
              {isLive && (
                <circle
                  r={22}
                  fill={CATEGORY_COLOR[loc.category]}
                  opacity={0.08}
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Active selection ring */}
              {isActive && !isOffline && (
                <circle
                  r={13}
                  fill="none"
                  stroke={fill}
                  strokeWidth={0.8}
                  opacity={0.4}
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Reconnecting pulse ring */}
              {isActive && isReconnecting && (
                <circle
                  r={10}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth={1}
                  opacity={0.5}
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Keyboard focus ring */}
              {isFocused && (
                <circle
                  r={16}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  opacity={0.7}
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Invisible enlarged tap / click target (44 × 44 CSS-px equivalent) */}
              <circle
                r={18}
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
                  <line x1={-3} y1={-3} x2={3} y2={3} stroke="#991b1b" strokeWidth={1.2} style={{ pointerEvents: 'none' }} />
                  <line x1={3}  y1={-3} x2={-3} y2={3} stroke="#991b1b" strokeWidth={1.2} style={{ pointerEvents: 'none' }} />
                </>
              )}
            </Marker>
          )
        })}
      </ComposableMap>

      {/* Map legend */}
      <div className="absolute bottom-1.5 right-2 flex items-center gap-2.5">
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-80" />
          <span className="text-[8px] tracking-widest uppercase text-slate-800">Nature</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 opacity-80" />
          <span className="text-[8px] tracking-widest uppercase text-slate-800">Urban</span>
        </span>
      </div>
    </div>
  )
}
