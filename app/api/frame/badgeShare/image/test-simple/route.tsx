/**
 * MINIMAL TEST - Badge Share OG Image
 * Ultra-simple design to test Satori compatibility
 */
import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)',
          color: '#ffffff',
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 700 }}>
          Signal Luminary
        </div>
        <div style={{ fontSize: 40, marginTop: 20, color: '#00FFFF' }}>
          Epic Tier Badge
        </div>
        <div style={{ fontSize: 24, marginTop: 40, opacity: 0.7 }}>
          @gmeowbased
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 628,
    }
  )
}
