/**
 * Points Frame Image Generator
 * Shows points breakdown visualization
 */

import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { loadFrameFonts, loadBackgroundImage } from '@/lib/frame-fonts'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    const totalXP = searchParams.get('totalXP') || '0'
    const username = searchParams.get('username') || 'Pilot'
    const gmXP = parseInt(searchParams.get('gmXP') || '0')
    const questXP = parseInt(searchParams.get('questXP') || '0')
    const viralXP = parseInt(searchParams.get('viralXP') || '0')

    const total = gmXP + questXP + viralXP || 1
    const gmPercent = Math.round((gmXP / total) * 100)
    const questPercent = Math.round((questXP / total) * 100)
    const viralPercent = Math.round((viralXP / total) * 100)

    const [fonts, bgImage] = await Promise.all([
      loadFrameFonts(),
      loadBackgroundImage(),
    ])

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: '60px',
          }}
        >
          {bgImage && (
            <img
              src={bgImage}
              alt="background"
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.8,
              }}
            />
          )}
          {/* Title */}
          <div
            style={{
              display: 'flex',
              fontSize: 56,
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '20px',
            }}
          >
            📊 Points Breakdown
          </div>

          {/* Username */}
          <div
            style={{
              display: 'flex',
              fontSize: 40,
              color: 'rgba(255,255,255,0.9)',
              marginBottom: '40px',
            }}
          >
            {username}
          </div>

          {/* Total XP Circle */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: '6px solid rgba(255,255,255,0.4)',
              marginBottom: '50px',
            }}
          >
            <div style={{ display: 'flex', fontSize: 70, fontWeight: 'bold', color: 'white' }}>
              {totalXP}
            </div>
            <div style={{ display: 'flex', fontSize: 28, color: 'rgba(255,255,255,0.9)' }}>
              Total XP
            </div>
          </div>

          {/* Breakdown Bars */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              width: '80%',
            }}
          >
            {/* GM XP */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 24, color: 'white', marginBottom: '8px' }}>
                ☀️ GM Streak: {gmXP} XP ({gmPercent}%)
              </div>
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  height: '40px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: `${gmPercent}%`,
                    height: '100%',
                    backgroundColor: '#ffd700',
                  }}
                ></div>
              </div>
            </div>

            {/* Quest XP */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 24, color: 'white', marginBottom: '8px' }}>
                🎯 Quests: {questXP} XP ({questPercent}%)
              </div>
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  height: '40px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: `${questPercent}%`,
                    height: '100%',
                    backgroundColor: '#00ff88',
                  }}
                ></div>
              </div>
            </div>

            {/* Viral XP */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 24, color: 'white', marginBottom: '8px' }}>
                🌟 Viral: {viralXP} XP ({viralPercent}%)
              </div>
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  height: '40px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: `${viralPercent}%`,
                    height: '100%',
                    backgroundColor: '#ff6b9d',
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              bottom: '20px',
              fontSize: 22,
              color: 'rgba(255,255,255,0.6)',
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
  } catch (e: any) {
    console.error('Points image error:', e)
    return new Response(`Failed to generate image: ${e.message}`, {
      status: 500,
    })
  }
}
