import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { loadFrameFonts, loadBackgroundImage } from '@/lib/frame-fonts'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  const questId = searchParams.get('id') || '1'
  const title = searchParams.get('title') || 'Complete Quest'
  const reward = parseInt(searchParams.get('reward') || '100')
  const difficulty = searchParams.get('difficulty') || 'intermediate'
  const completed = searchParams.get('completed') === 'true'

  // Difficulty emoji mapping
  const difficultyEmoji = {
    beginner: '⭐',
    intermediate: '⭐⭐',
    advanced: '⭐⭐⭐',
  }[difficulty] || '⭐⭐'

  // Status emoji
  const statusEmoji = completed ? '✅' : '🎯'
  const statusText = completed ? 'COMPLETED' : 'IN PROGRESS'
  const statusColor = completed ? '#10b981' : '#f59e0b'

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
          background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '60px',
        }}
      >
        {/* Status Badge */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: '40px',
            right: '40px',
            background: statusColor,
            padding: '15px 30px',
            borderRadius: '30px',
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'white',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {statusEmoji} {statusText}
        </div>

        {/* Quest Icon */}
        <div
          style={{
            display: 'flex',
            width: '200px',
            height: '200px',
            borderRadius: '30px',
            background: 'rgba(255, 255, 255, 0.95)',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '100px',
            marginBottom: '40px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
          }}
        >
          🎯
        </div>

        {/* Quest Title */}
        <div
          style={{
            display: 'flex',
            fontSize: '48px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '20px',
            textAlign: 'center',
            maxWidth: '900px',
            textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            lineHeight: '1.2',
          }}
        >
          {title}
        </div>

        {/* Quest ID */}
        <div
          style={{
            display: 'flex',
            fontSize: '28px',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '40px',
          }}
        >
          Quest #{questId}
        </div>

        {/* Difficulty and Reward */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '40px',
            marginTop: '20px',
          }}
        >
          {/* Difficulty */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '25px 45px',
              borderRadius: '20px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '36px',
                marginBottom: '10px',
              }}
            >
              {difficultyEmoji}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '28px',
                fontWeight: 'bold',
                color: 'white',
                textTransform: 'capitalize',
              }}
            >
              {difficulty}
            </div>
          </div>

          {/* Reward */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '25px 45px',
              borderRadius: '20px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '36px',
                marginBottom: '10px',
              }}
            >
              🏆
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '36px',
                fontWeight: 'bold',
                color: 'white',
              }}
            >
              {reward} XP
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
            color: 'rgba(255, 255, 255, 0.7)',
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
