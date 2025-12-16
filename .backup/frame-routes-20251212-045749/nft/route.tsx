/**
 * NFT Frame Image Generator
 * Dynamic image showing NFT collection
 * Uses hybrid calculator logic: nftPoints = nftMints.length * 100
 */

import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { loadFrameFonts, loadBackgroundImage } from '@/lib/frame-fonts'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    
    const nftCount = parseInt(searchParams.get('nftCount') || '0')
    const nftPoints = parseInt(searchParams.get('nftPoints') || '0')
    const username = searchParams.get('username') || 'Pilot'
    const totalValue = searchParams.get('totalValue') || '0'
    const nftIds = searchParams.get('nftIds')?.split(',').filter(Boolean).slice(0, 9) || []

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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px',
            position: 'relative',
          }}
        >
          {/* Card Container */}
          <div
            style={{
              width: '520px',
              height: '320px',
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(15, 15, 17, 0.85)',
              border: '4px solid #667eea',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
              padding: '24px',
              position: 'relative',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  border: '2px solid #667eea',
                  borderRadius: '999px',
                  fontSize: '16px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: 'white',
                }}
              >
                NFT COLLECTION
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                GMEOW
              </div>
            </div>

            {/* NFT Grid */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '100%',
                  minHeight: '140px',
                  borderRadius: '10px',
                  background: 'rgba(15, 15, 17, 0.5)',
                  border: '2px solid rgba(102, 126, 234, 0.3)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px',
                }}
              >
                {nftIds.length > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {nftIds.map((nftId, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          width: '60px',
                          height: '60px',
                          border: '2px solid #667eea',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '32px',
                        }}
                      >
                        🖼️
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '70px', opacity: 0.3 }}>🖼️</div>
                )}
              </div>
            </div>

            {/* Stats Section */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
              }}
            >
              {/* User Info */}
              <div
                style={{
                  width: '160px',
                  display: 'flex',
                  padding: '12px',
                  background: 'rgba(30, 30, 32, 0.6)',
                  border: '1px solid #667eea',
                  borderRadius: '8px',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'white',
                    textAlign: 'center',
                  }}
                >
                  @{username}
                </div>
              </div>

              {/* Stats Grid */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  gap: '12px',
                }}
              >
                {/* NFT Count */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px',
                    background: 'rgba(30, 30, 32, 0.6)',
                    border: '1px solid #667eea',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div style={{ display: 'flex', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.7)' }}>
                    NFTs
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: '28px',
                      fontWeight: 900,
                      color: '#667eea',
                    }}
                  >
                    {nftCount}
                  </div>
                </div>

                {/* NFT Points */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px',
                    background: 'rgba(30, 30, 32, 0.6)',
                    border: '1px solid #667eea',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div style={{ display: 'flex', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.7)' }}>
                    POINTS
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: '28px',
                      fontWeight: 900,
                      color: '#667eea',
                    }}
                  >
                    {nftPoints}
                  </div>
                </div>

                {/* Total Value */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px',
                    background: 'rgba(30, 30, 32, 0.6)',
                    border: '1px solid #667eea',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div style={{ display: 'flex', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.7)' }}>
                    VALUE
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#667eea',
                    }}
                  >
                    {totalValue}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '16px',
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              NFT Points: {nftCount} × 100 = {nftPoints} pts
            </div>
          </div>

          {/* Branding */}
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              fontSize: '18px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.8)',
            }}
          >
            GMEOW
          </div>
        </div>
      ),
      {
        width: 600,
        height: 400,
        fonts,
      }
    )
  } catch (error) {
    console.error('NFT frame error:', error)
    return new Response('Error generating NFT frame', { status: 500 })
  }
}
