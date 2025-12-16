import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { loadFrameFonts, loadBackgroundImage } from '@/lib/frame-fonts'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  const guildId = searchParams.get('id') || '1'
  const guildName = searchParams.get('name') || 'Unknown Guild'
  const memberCount = parseInt(searchParams.get('members') || '0')
  const totalPoints = parseInt(searchParams.get('points') || '0')
  const ownerName = searchParams.get('owner') || 'Unknown'

  const [fonts, bgImage] = await Promise.all([
    loadFrameFonts(),
    loadBackgroundImage(),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '60px',
        }}
      >
        {/* Guild Logo/Badge */}
        <div
          style={{
            display: 'flex',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.95)',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '120px',
            marginBottom: '40px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}
        >
          🏰
        </div>

        {/* Guild Name */}
        <div
          style={{
            display: 'flex',
            fontSize: '64px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '20px',
            textAlign: 'center',
            textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          {guildName}
        </div>

        {/* Guild ID */}
        <div
          style={{
            display: 'flex',
            fontSize: '32px',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '40px',
          }}
        >
          Guild #{guildId}
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '60px',
            marginTop: '20px',
          }}
        >
          {/* Members */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '30px 50px',
              borderRadius: '20px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '48px',
                marginBottom: '10px',
              }}
            >
              👥
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '42px',
                fontWeight: 'bold',
                color: 'white',
              }}
            >
              {memberCount}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '24px',
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              Members
            </div>
          </div>

          {/* Total Points */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '30px 50px',
              borderRadius: '20px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '48px',
                marginBottom: '10px',
              }}
            >
              ⭐
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '42px',
                fontWeight: 'bold',
                color: 'white',
              }}
            >
              {totalPoints.toLocaleString()}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '24px',
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              Points
            </div>
          </div>
        </div>

        {/* Owner */}
        <div
          style={{
            display: 'flex',
            fontSize: '28px',
            color: 'rgba(255, 255, 255, 0.9)',
            marginTop: '40px',
          }}
        >
          Led by <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>{ownerName}</span>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: '30px',
            fontSize: '24px',
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          gmeowhq.art
        </div>
      </div>
    ),
    {
      width: 600,
      height: 400,
      fonts,
    }
  )
}
