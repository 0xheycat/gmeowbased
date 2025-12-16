import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { loadFrameFonts, loadBackgroundImage } from '@/lib/frame-fonts'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  const totalXP = parseInt(searchParams.get('xp') || '0')
  const gmStreak = parseInt(searchParams.get('streak') || '0')
  const lifetimeGMs = parseInt(searchParams.get('gms') || '0')
  const badges = parseInt(searchParams.get('badges') || '0')
  const guilds = parseInt(searchParams.get('guilds') || '0')
  const referrals = parseInt(searchParams.get('referrals') || '0')
  const username = searchParams.get('username') || 'Pilot'

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
          padding: '50px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '10px',
              textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
          >
            On-Chain Statistics
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '32px',
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            {username}
          </div>
        </div>

        {/* Total XP Circle */}
        <div
          style={{
            display: 'flex',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            marginBottom: '40px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: '6px solid rgba(255, 255, 255, 0.3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#7c3aed',
            }}
          >
            {totalXP.toLocaleString()}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '28px',
              color: '#7c3aed',
              fontWeight: '600',
            }}
          >
            Total XP
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            width: '100%',
            maxWidth: '1000px',
          }}
        >
          {/* Row 1 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '20px',
              justifyContent: 'center',
            }}
          >
            {/* GM Streak */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '25px 40px',
                borderRadius: '16px',
                backdropFilter: 'blur(10px)',
                minWidth: '180px',
              }}
            >
              <div style={{ display: 'flex', fontSize: '40px', marginBottom: '5px' }}>🔥</div>
              <div style={{ display: 'flex', fontSize: '42px', fontWeight: 'bold', color: 'white' }}>
                {gmStreak}
              </div>
              <div style={{ display: 'flex', fontSize: '20px', color: 'rgba(255, 255, 255, 0.8)' }}>
                GM Streak
              </div>
            </div>

            {/* Lifetime GMs */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '25px 40px',
                borderRadius: '16px',
                backdropFilter: 'blur(10px)',
                minWidth: '180px',
              }}
            >
              <div style={{ display: 'flex', fontSize: '40px', marginBottom: '5px' }}>☀️</div>
              <div style={{ display: 'flex', fontSize: '42px', fontWeight: 'bold', color: 'white' }}>
                {lifetimeGMs}
              </div>
              <div style={{ display: 'flex', fontSize: '20px', color: 'rgba(255, 255, 255, 0.8)' }}>
                Lifetime GMs
              </div>
            </div>

            {/* Badges */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '25px 40px',
                borderRadius: '16px',
                backdropFilter: 'blur(10px)',
                minWidth: '180px',
              }}
            >
              <div style={{ display: 'flex', fontSize: '40px', marginBottom: '5px' }}>🏅</div>
              <div style={{ display: 'flex', fontSize: '42px', fontWeight: 'bold', color: 'white' }}>
                {badges}
              </div>
              <div style={{ display: 'flex', fontSize: '20px', color: 'rgba(255, 255, 255, 0.8)' }}>
                Badges
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '20px',
              justifyContent: 'center',
            }}
          >
            {/* Guilds */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '25px 40px',
                borderRadius: '16px',
                backdropFilter: 'blur(10px)',
                minWidth: '180px',
              }}
            >
              <div style={{ display: 'flex', fontSize: '40px', marginBottom: '5px' }}>🏰</div>
              <div style={{ display: 'flex', fontSize: '42px', fontWeight: 'bold', color: 'white' }}>
                {guilds}
              </div>
              <div style={{ display: 'flex', fontSize: '20px', color: 'rgba(255, 255, 255, 0.8)' }}>
                Guilds
              </div>
            </div>

            {/* Referrals */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '25px 40px',
                borderRadius: '16px',
                backdropFilter: 'blur(10px)',
                minWidth: '180px',
              }}
            >
              <div style={{ display: 'flex', fontSize: '40px', marginBottom: '5px' }}>🎁</div>
              <div style={{ display: 'flex', fontSize: '42px', fontWeight: 'bold', color: 'white' }}>
                {referrals}
              </div>
              <div style={{ display: 'flex', fontSize: '20px', color: 'rgba(255, 255, 255, 0.8)' }}>
                Referrals
              </div>
            </div>

            {/* Performance Score */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '25px 40px',
                borderRadius: '16px',
                backdropFilter: 'blur(10px)',
                minWidth: '180px',
              }}
            >
              <div style={{ display: 'flex', fontSize: '40px', marginBottom: '5px' }}>📊</div>
              <div style={{ display: 'flex', fontSize: '42px', fontWeight: 'bold', color: 'white' }}>
                {Math.min(100, Math.floor((totalXP / 1000) * 100))}%
              </div>
              <div style={{ display: 'flex', fontSize: '20px', color: 'rgba(255, 255, 255, 0.8)' }}>
                Performance
              </div>
            </div>
          </div>
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
          gmeowhq.art • Real-time Blockchain Data
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
