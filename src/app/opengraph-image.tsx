import { ImageResponse } from 'next/og'

// Social share preview (Open Graph / Twitter). Rendered at build time from
// the brand tokens: charcoal background, amber mark, display headline.

export const alt = 'BobMasterBillie Command Center'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #131313 0%, #1d1c1a 100%)',
          padding: 64,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
          <div
            style={{
              width: 136,
              height: 136,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#eab308',
              borderRadius: 26,
              fontSize: 92,
              color: '#181818',
              fontWeight: 700,
            }}
          >
            B
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 66,
                color: '#f4f4f2',
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              BobMasterBillie
            </div>
            <div style={{ fontSize: 34, color: '#a1a1aa', marginTop: 10 }}>Command Center</div>
            <div style={{ fontSize: 24, color: '#eab308', marginTop: 22, letterSpacing: 3 }}>
              COMMANDS · PREDICTIONS · MOVIE NIGHTS
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
