import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { loadFrameFonts, loadBackgroundImage } from '@/lib/frame-fonts'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  const referralCode = searchParams.get('code') || 'GMBASE'
  const referralCount = parseInt(searchParams.get('count') || '0')
  const totalRewards = parseInt(searchParams.get('rewards') || '0')
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
          background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '60px',
        }}
      >
        {/* Referral Icon */}
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
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
          }}
        >
          🎁
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#2d3748',
            marginBottom: '20px',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          Referral Program
        </div>

        {/* Referral Code */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '25px 60px',
            borderRadius: '20px',
            marginBottom: '40px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '64px',
              fontWeight: 'bold',
              color: '#4f46e5',
              fontFamily: 'monospace',
              letterSpacing: '4px',
            }}
          >
            {referralCode}
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '40px',
            marginTop: '20px',
          }}
        >
          {/* Referral Count */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.8)',
              padding: '30px 50px',
              borderRadius: '20px',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
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
                fontSize: '52px',
                fontWeight: 'bold',
                color: '#4f46e5',
              }}
            >
              {referralCount}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '24px',
                color: '#64748b',
              }}
            >
              Referrals
            </div>
          </div>

          {/* Total Rewards */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.8)',
              padding: '30px 50px',
              borderRadius: '20px',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '48px',
                marginBottom: '10px',
              }}
            >
              💰
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '52px',
                fontWeight: 'bold',
                color: '#10b981',
              }}
            >
              {totalRewards}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '24px',
                color: '#64748b',
              }}
            >
              XP Earned
            </div>
          </div>
        </div>

        {/* User Info */}
        <div
          style={{
            display: 'flex',
            fontSize: '32px',
            color: '#475569',
            marginTop: '50px',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          Shared by <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{username}</span>
        </div>

        {/* Call to Action */}
        <div
          style={{
            display: 'flex',
            fontSize: '28px',
            color: '#64748b',
            marginTop: '30px',
            textAlign: 'center',
          }}
        >
          🚀 Share your code and earn 50 XP per referral
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: '30px',
            fontSize: '24px',
            color: '#94a3b8',
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
