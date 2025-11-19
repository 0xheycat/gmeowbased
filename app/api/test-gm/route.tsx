import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  const gmCount = '50'
  const streak = '7'
  const rank = '10'
  
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#2d1b4e',
          color: '#f5f7ff',
          padding: '64px',
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 900 }}>GM!</div>
        <div style={{ fontSize: 32 }}>Test User</div>
        <div style={{ display: 'flex', gap: 48, marginTop: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 72, fontWeight: 800, color: '#ffd25a' }}>{gmCount}</div>
            <div style={{ fontSize: 28 }}>Total GMs</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 72, fontWeight: 800, color: '#7c5cff' }}>{streak}</div>
            <div style={{ fontSize: 28 }}>Streak</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 72, fontWeight: 800, color: '#5fb3ff' }}>{rank}</div>
            <div style={{ fontSize: 28 }}>Rank</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
