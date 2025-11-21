/**
 * Badge Share Frame - Dynamic OG Image Generator
 * Generates 1200x628 PNG images with Yu-Gi-Oh! card design
 */
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { getUserBadges, loadBadgeRegistry } from '@/lib/badges'
import {
  isValidBadgeId,
  isValidFid,
  formatBadgeDate,
  getTierGradient,
} from '@/lib/frame-badge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WIDTH = 1200
const HEIGHT = 628

/**
 * OG Image Generator: Badge Share
 * 
 * Generates a 1200x628 OG image for badge share frames.
 * Route: /api/frame/badgeShare/image?fid=xxx&badgeId=yyy
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const fidParam = searchParams.get('fid')
    const badgeIdParam = searchParams.get('badgeId')
    const stateParam = searchParams.get('state')

    // Validate FID
    if (!fidParam || !isValidFid(fidParam)) {
      return new ImageResponse(
        <ErrorImage message="Invalid FID" />,
        { width: WIDTH, height: HEIGHT }
      )
    }

    const fid = parseInt(fidParam, 10)

    // Validate badge ID
    if (!badgeIdParam || !isValidBadgeId(badgeIdParam)) {
      return new ImageResponse(
        <ErrorImage message="Invalid Badge ID" />,
        { width: WIDTH, height: HEIGHT }
      )
    }

    // Handle "not found" state
    if (stateParam === 'notfound') {
      return new ImageResponse(
        <NotFoundImage badgeId={badgeIdParam} />,
        { width: WIDTH, height: HEIGHT }
      )
    }

    // Fetch user badges and registry with error handling
    let badges: Awaited<ReturnType<typeof getUserBadges>> = []
    try {
      badges = await getUserBadges(fid)
    } catch (error) {
      console.error('Failed to fetch user badges:', error)
      // Return not found state if we can't fetch badges
      return new ImageResponse(
        <NotFoundImage badgeId={badgeIdParam} />,
        { width: WIDTH, height: HEIGHT }
      )
    }

    const badgeRegistry = loadBadgeRegistry()

    // Find specific badge
    const targetBadge = badges.find((b) => b.badgeId === badgeIdParam)

    if (!targetBadge) {
      return new ImageResponse(
        <NotFoundImage badgeId={badgeIdParam} />,
        { width: WIDTH, height: HEIGHT }
      )
    }

    // Get tier config
    const tierConfig = badgeRegistry.tiers[targetBadge.tier]
    const badgeName = (targetBadge.metadata as { name?: string })?.name || targetBadge.badgeType
    const badgeDescription = (targetBadge.metadata as { description?: string })?.description || tierConfig.name

    const tierGradient = getTierGradient(targetBadge.tier)
    const assignedDate = formatBadgeDate(targetBadge.assignedAt)

    return new ImageResponse(
      (
        <div
          style={{
            width: WIDTH,
            height: HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Animated mesh gradient background (simplified for Satori) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `radial-gradient(circle at 10% 20%, ${tierGradient.start}20, transparent 40%), radial-gradient(circle at 90% 80%, ${tierGradient.end}20, transparent 40%), radial-gradient(circle at 50% 50%, ${tierGradient.start}10, transparent 60%)`,
              opacity: 0.6,
            }}
          />

          {/* Grid pattern overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `linear-gradient(${tierGradient.start}10 1px, transparent 1px), linear-gradient(90deg, ${tierGradient.start}10 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
              opacity: 0.15,
            }}
          />

          {/* Yu-Gi-Oh! Card Structure */}
          <div
            style={{
              width: 1080,
              height: 560,
              display: 'flex',
              flexDirection: 'column',
              background: `linear-gradient(145deg, rgba(26, 26, 28, 0.95) 0%, rgba(18, 18, 20, 0.98) 100%)`,
              border: `3px solid ${tierGradient.start}`,
              borderRadius: 32,
              boxShadow: `0 0 0 1px rgba(255, 255, 255, 0.1), 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 100px ${tierGradient.start}40`,
              padding: 32,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Card shine effect (Yu-Gi-Oh! holographic) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '50%',
                background: `linear-gradient(180deg, ${tierGradient.start}08 0%, transparent 100%)`,
              }}
            />

            {/* Header with tier badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              {/* Tier badge (top-left like Yu-Gi-Oh! attribute) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 24px',
                  background: `linear-gradient(135deg, ${tierGradient.start}40, ${tierGradient.end}40)`,
                  border: `2px solid ${tierGradient.start}`,
                  borderRadius: 999,
                  fontSize: 20,
                  fontWeight: 700,
                  boxShadow: `0 0 30px ${tierGradient.start}60`,
                }}
              >
                {tierConfig.name.toUpperCase()}
              </div>

              {/* Minted status badge */}
              {targetBadge.minted ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 20px',
                    background: 'rgba(124, 255, 122, 0.15)',
                    border: '2px solid #7CFF7A',
                    borderRadius: 999,
                    fontSize: 18,
                    fontWeight: 600,
                    color: '#7CFF7A',
                    boxShadow: '0 0 20px rgba(124, 255, 122, 0.3)',
                  }}
                >
                  MINTED
                </div>
              ) : (
                <div style={{ display: 'none' }} />
              )}
            </div>

            {/* Main content area (horizontal layout like Yu-Gi-Oh!) */}
            <div
              style={{
                display: 'flex',
                flex: 1,
              }}
            >
              {/* Left: Badge artwork (gradient fallback - no external images) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    width: 360,
                    height: 360,
                    borderRadius: 20,
                    background: `linear-gradient(135deg, ${tierGradient.start}60, ${tierGradient.end}60)`,
                    border: `3px solid ${tierGradient.start}`,
                    boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px ${tierGradient.start}50`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 160,
                    fontWeight: 900,
                    color: '#ffffff',
                  }}
                >
                  {targetBadge.tier === 'legendary' ? 'L' :
                   targetBadge.tier === 'epic' ? 'E' :
                   targetBadge.tier === 'rare' ? 'R' : 'C'}
                </div>
              </div>

              {/* Right: Badge details (like Yu-Gi-Oh! card text) */}
              <div
                style={{
                  flex: 1,
                  marginLeft: 32,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: '#ffffff',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                }}
              >
                {/* Badge name (like Yu-Gi-Oh! monster name) */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      fontSize: 52,
                      fontWeight: 800,
                      margin: 0,
                      lineHeight: 1.1,
                      color: '#ffffff',
                      textShadow: `0 2px 20px ${tierGradient.start}80`,
                    }}
                  >
                    {badgeName}
                  </div>

                  {/* Description box (like Yu-Gi-Oh! effect text) */}
                  <div
                    style={{
                      marginTop: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: 20,
                      background: 'rgba(30, 30, 32, 0.6)',
                      border: `1px solid ${tierGradient.start}40`,
                      borderRadius: 16,
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        lineHeight: 1.6,
                        margin: 0,
                        color: 'rgba(255, 255, 255, 0.85)',
                      }}
                    >
                      {badgeDescription}
                    </div>
                  </div>

                  {/* Stats bar (like Yu-Gi-Oh! ATK/DEF) */}
                  <div
                    style={{
                      marginTop: 20,
                      display: 'flex',
                      fontSize: 18,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 16px',
                        background: 'rgba(30, 30, 32, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 12,
                      }}
                    >
                      <div style={{ opacity: 0.7 }}>Earned:</div>
                      <div style={{ fontWeight: 600, marginLeft: 8 }}>{assignedDate}</div>
                    </div>
                  </div>
                </div>

                {/* Footer: Branding (like Yu-Gi-Oh! set info) */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 16,
                    marginTop: 16,
                    background: 'rgba(20, 20, 22, 0.6)',
                    border: `1px solid ${tierGradient.start}30`,
                    borderRadius: 12,
                  }}
                >
                  <div style={{ fontSize: 18, opacity: 0.8, fontWeight: 600 }}>
                    @gmeowbased
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      opacity: 0.6,
                      fontFamily: 'monospace',
                    }}
                  >
                    {targetBadge.badgeId.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom accent line (Yu-Gi-Oh! foil effect) */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 4,
              background: `linear-gradient(90deg, transparent 0%, ${tierGradient.start} 20%, ${tierGradient.end} 50%, ${tierGradient.start} 80%, transparent 100%)`,
              boxShadow: `0 0 20px ${tierGradient.start}80`,
            }}
          />
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        headers: {
          'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
          'CDN-Cache-Control': 'public, max-age=31536000',
          'Vercel-CDN-Cache-Control': 'public, max-age=31536000',
        },
      }
    )
  } catch (error) {
    console.error('[Frame BadgeShare Image] Error:', error)
    // Return JSON error for debugging
    return new Response(
      JSON.stringify({ 
        error: 'Image generation failed', 
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Error state component
function ErrorImage({ message }: { message: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a, #000000)',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          fontSize: 80,
          marginBottom: 24,
          fontWeight: 700,
        }}
      >
        !
      </div>
      <h1
        style={{
          fontSize: 48,
          fontWeight: 700,
          margin: 0,
        }}
      >
        Error
      </h1>
      <p
        style={{
          fontSize: 24,
          opacity: 0.7,
          margin: 0,
          marginTop: 12,
        }}
      >
        {message}
      </p>
    </div>
  )
}

// Not found state component
function NotFoundImage({ badgeId }: { badgeId: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a, #000000)',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          fontSize: 80,
          marginBottom: 24,
        }}
      >
        🔍
      </div>
      <h1
        style={{
          fontSize: 48,
          fontWeight: 700,
          margin: 0,
        }}
      >
        Badge Not Found
      </h1>
      <p
        style={{
          fontSize: 24,
          opacity: 0.7,
          margin: 0,
          marginTop: 12,
        }}
      >
        {badgeId} could not be found
      </p>
      <p
        style={{
          fontSize: 20,
          opacity: 0.5,
          margin: 0,
          marginTop: 24,
        }}
      >
        This badge may have been removed or never existed
      </p>
    </div>
  )
}
