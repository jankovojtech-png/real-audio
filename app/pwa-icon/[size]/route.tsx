import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const VALID_SIZES = new Set([192, 512])

// Generates the PWA manifest icon at the requested size.
// Referenced in public/manifest.json as /pwa-icon/192 and /pwa-icon/512.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: sizeStr } = await params
  const s = parseInt(sizeStr, 10)

  if (!VALID_SIZES.has(s)) {
    return new Response('Not found', { status: 404 })
  }

  return new ImageResponse(
    (
      <div
        style={{
          background:     '#080c10',
          width:          s,
          height:         s,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          position:       'relative',
        }}
      >
        {/* Outer ring */}
        <div
          style={{
            position:     'absolute',
            width:        s * 0.76,
            height:       s * 0.76,
            borderRadius: '50%',
            border:       '1px solid rgba(99,102,241,0.15)',
          }}
        />
        {/* Middle ring */}
        <div
          style={{
            position:     'absolute',
            width:        s * 0.56,
            height:       s * 0.56,
            borderRadius: '50%',
            border:       '1px solid rgba(99,102,241,0.30)',
          }}
        />
        {/* Inner ring */}
        <div
          style={{
            position:     'absolute',
            width:        s * 0.36,
            height:       s * 0.36,
            borderRadius: '50%',
            border:       '1.5px solid rgba(99,102,241,0.55)',
          }}
        />
        {/* Center dot */}
        <div
          style={{
            width:        s * 0.10,
            height:       s * 0.10,
            borderRadius: '50%',
            background:   'rgba(99,102,241,0.88)',
          }}
        />
      </div>
    ),
    { width: s, height: s },
  )
}
