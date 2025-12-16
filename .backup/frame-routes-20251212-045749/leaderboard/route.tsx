/**
 * Leaderboard Frame Image Generator
 * Dynamic OG image for leaderboard frames
 */

import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { loadFrameFonts, loadBackgroundImage } from '@/lib/frame-fonts'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    const season = searchParams.get('season') || 'weekly'
    const top1 = searchParams.get('top1') || 'Loading...'
    const top1Points = searchParams.get('top1Points') || '0'
    const top2 = searchParams.get('top2') || ''
    const top3 = searchParams.get('top3') || ''
    const total = searchParams.get('total') || '0'

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
            backgroundColor: '#0a0a0a',
            backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px',
          }}
        >
          {/* Title */}
          <div
            style={{
              display: 'flex',
              fontSize: 60,
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            🏆 {season.charAt(0).toUpperCase() + season.slice(1)} Leaderboard
          </div>

          {/* Top 3 Podium */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '30px',
              alignItems: 'flex-end',
              marginTop: '40px',
            }}
          >
            {/* #2 */}
            {top2 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  padding: '20px',
                  borderRadius: '16px',
                  minWidth: '200px',
                }}
              >
                <div style={{ display: 'flex', fontSize: 40, marginBottom: '10px' }}>🥈</div>
                <div style={{ display: 'flex', fontSize: 24, color: 'white', fontWeight: 'bold' }}>{top2}</div>
              </div>
            )}

            {/* #1 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: 'rgba(255,215,0,0.2)',
                padding: '30px',
                borderRadius: '16px',
                minWidth: '250px',
                border: '3px solid gold',
              }}
            >
              <div style={{ display: 'flex', fontSize: 60, marginBottom: '10px' }}>👑</div>
              <div style={{ display: 'flex', fontSize: 32, color: 'white', fontWeight: 'bold' }}>{top1}</div>
              <div style={{ display: 'flex', fontSize: 24, color: '#ffd700', marginTop: '10px' }}>
                {top1Points} XP
              </div>
            </div>

            {/* #3 */}
            {top3 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  padding: '20px',
                  borderRadius: '16px',
                  minWidth: '200px',
                }}
              >
                <div style={{ display: 'flex', fontSize: 40, marginBottom: '10px' }}>🥉</div>
                <div style={{ display: 'flex', fontSize: 24, color: 'white', fontWeight: 'bold' }}>{top3}</div>
              </div>
            )}
          </div>

          {/* Footer Stats */}
          <div
            style={{
              display: 'flex',
              marginTop: '40px',
              fontSize: 28,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            📊 {total} pilots competing
          </div>

          {/* Branding */}
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              fontSize: 20,
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
    console.error('Leaderboard image error:', e)
    return new Response(`Failed to generate image: ${e.message}`, {
      status: 500,
    })
  }
}
