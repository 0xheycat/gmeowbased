/**
 * Test Badge Image - No Supabase, Hardcoded Data
 */
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const WIDTH = 1200
const HEIGHT = 628

export async function GET(request: NextRequest) {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #000000, #1a0033)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 60, fontWeight: 900, color: '#00FFFF' }}>
            Signal Luminary
          </div>
          <div style={{ fontSize: 30, color: '#888', marginTop: 16 }}>
            Epic Badge
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    }
  )
}
