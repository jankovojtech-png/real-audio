import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 32, height: 32 }
export const contentType = 'image/png'

// Favicon — concentric rings on dark background, matching the app's pulse animation.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background:     '#080c10',
          width:          32,
          height:         32,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          position:       'relative',
        }}
      >
        <div style={{ position: 'absolute', width: 26, height: 26, borderRadius: '50%', border: '0.7px solid rgba(99,102,241,0.18)' }} />
        <div style={{ position: 'absolute', width: 19, height: 19, borderRadius: '50%', border: '0.7px solid rgba(99,102,241,0.32)' }} />
        <div style={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.55)' }} />
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(99,102,241,0.85)' }} />
      </div>
    ),
    { ...size }
  )
}
