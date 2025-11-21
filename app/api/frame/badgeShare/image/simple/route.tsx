/**
 * Simple Badge Image Test - Minimal Version
 */
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const WIDTH = 1200
const HEIGHT = 628

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const badgeId = searchParams.get('badgeId') || 'test'

    return new ImageResponse(
      (
        <div
          style={{
            width: WIDTH,
            height: HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <div style={{ fontSize: 72, fontWeight: 'bold', color: 'white' }}>
            Badge: {badgeId}
          </div>
          <div style={{ fontSize: 32, color: 'rgba(255,255,255,0.8)' }}>
            Simple Test - Working ✓
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
      }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
