import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { loadFrameFonts, loadBackgroundImage } from '@/lib/frame-fonts'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  const badgeId = searchParams.get('id') || 'gm-master'
  const badgeName = searchParams.get('name') || 'GM Master'
  const badgeCount = parseInt(searchParams.get('count') || '0')
  const username = searchParams.get('username') || 'Pilot'
  const earnedDate = searchParams.get('earned') || new Date().toISOString().split('T')[0]

  // Badge emoji based on type
  const badgeEmojis: Record<string, string> = {
    'gm-master': '☀️',
    'guild-leader': '👑',
    'quest-champion': '🏆',
    'early-adopter': '🌟',
    'viral-legend': '🚀',
  }
  const badgeEmoji = badgeEmojis[badgeId] || '🏅'

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
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '60px',
        }}
      >
        {/* Total Badge Count */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: '40px',
            right: '40px',
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '15px 30px',
            borderRadius: '30px',
            fontSize: '32px',
            fontWeight: 'bold',
            color: 'white',
            backdropFilter: 'blur(10px)',
          }}
        >
          {badgeCount} Badge{badgeCount !== 1 ? 's' : ''}
        </div>

        {/* Badge Display */}
        <div
          style={{
            display: 'flex',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '160px',
            marginBottom: '40px',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.3)',
            border: '8px solid rgba(255, 255, 255, 0.5)',
          }}
        >
          {badgeEmoji}
        </div>

        {/* Badge Name */}
        <div
          style={{
            display: 'flex',
            fontSize: '56px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '20px',
            textAlign: 'center',
            textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          {badgeName}
        </div>

        {/* Badge ID */}
        <div
          style={{
            display: 'flex',
            fontSize: '28px',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '40px',
            fontFamily: 'monospace',
          }}
        >
          #{badgeId}
        </div>

        {/* Owner Info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '30px 60px',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)',
            gap: '15px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '32px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            Earned by
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '42px',
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            {username}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '24px',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            {earnedDate}
          </div>
        </div>

        {/* Achievement Note */}
        <div
          style={{
            display: 'flex',
            fontSize: '28px',
            color: 'rgba(255, 255, 255, 0.8)',
            marginTop: '40px',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          🎉 Special achievement unlocked
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
