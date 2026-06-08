import { ImageResponse } from 'next/og'
import { LOCATIONS } from '@/app/lib/locations'

export const runtime     = 'edge'
export const alt         = 'Real Audio — Live Ambient Sound'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ streamId: string }> }

export default async function OGImage({ params }: Props) {
  const { streamId } = await params
  const loc = LOCATIONS.find((l) => l.id === streamId)

  const isNature  = !loc || loc.category === 'nature'
  const glowColor = isNature ? 'rgba(99,102,241,0.14)' : 'rgba(245,158,11,0.12)'
  const accentRgb = isNature ? '99,102,241'            : '245,158,11'
  const label     = loc?.label   ?? 'Real Audio'
  const region    = loc?.region  ?? 'Live ambient stream'

  return new ImageResponse(
    (
      <div
        style={{
          background:     '#080c10',
          width:          '100%',
          height:         '100%',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          position:       'relative',
          overflow:       'hidden',
          fontFamily:     'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position:   'absolute',
            inset:      0,
            background: `radial-gradient(ellipse 75% 60% at 50% 52%, ${glowColor} 0%, transparent 70%)`,
          }}
        />

        {/* Top label */}
        <p
          style={{
            position:      'absolute',
            top:           52,
            left:          0,
            right:         0,
            textAlign:     'center',
            color:         '#334155',
            fontSize:      18,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            margin:        0,
          }}
        >
          REAL AUDIO
        </p>

        {/* City name */}
        <p
          style={{
            color:         '#e2e8f0',
            fontSize:      loc ? 96 : 72,
            fontWeight:    300,
            letterSpacing: '-0.02em',
            margin:        0,
            marginBottom:  20,
            lineHeight:    1,
            textAlign:     'center',
            maxWidth:      1000,
          }}
        >
          {label}
        </p>

        {/* Region / country */}
        <p
          style={{
            color:         '#475569',
            fontSize:      32,
            letterSpacing: '0.06em',
            margin:        0,
            textAlign:     'center',
          }}
        >
          {region}
        </p>

        {/* Divider */}
        <div
          style={{
            width:           120,
            height:          1,
            background:      `rgba(${accentRgb},0.25)`,
            marginTop:       52,
            marginBottom:    28,
          }}
        />

        {/* Bottom label */}
        <p
          style={{
            color:         '#1e293b',
            fontSize:      15,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            margin:        0,
          }}
        >
          LIVE AMBIENT SOUND
        </p>
      </div>
    ),
    { ...size },
  )
}
