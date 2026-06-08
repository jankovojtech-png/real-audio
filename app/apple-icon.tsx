import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

// Apple touch icon — concentric rings on dark background.
// Used for iOS home screen shortcut when added from Safari.
export default function AppleIcon() {
  const s = 180
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
          borderRadius:   '22%',
        }}
      >
        <div style={{ position: 'absolute', width: s * 0.76, height: s * 0.76, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.15)' }} />
        <div style={{ position: 'absolute', width: s * 0.56, height: s * 0.56, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.30)' }} />
        <div style={{ position: 'absolute', width: s * 0.36, height: s * 0.36, borderRadius: '50%', border: '1.2px solid rgba(99,102,241,0.55)' }} />
        <div style={{ width: s * 0.10, height: s * 0.10, borderRadius: '50%', background: 'rgba(99,102,241,0.85)' }} />
      </div>
    ),
    { ...size }
  )
}
