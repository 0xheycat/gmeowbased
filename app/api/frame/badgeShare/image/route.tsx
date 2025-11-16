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

    // Fetch user badges and registry
    const badges = await getUserBadges(fid)
    const badgeRegistry = loadBadgeRegistry()

    // Find specific badge
    const targetBadge = badges.find((b) => b.badgeId === badgeIdParam)

    if (!targetBadge) {
      return new ImageResponse(
        <NotFoundImage badgeId={badgeIdParam} />,
        { width: WIDTH, height: HEIGHT }
      )
    }

    // Get badge definition and tier config
    const badgeDefinition = badgeRegistry.badges.find(
      (b) => b.badgeType === targetBadge.badgeType
    )

    const tierConfig = badgeRegistry.tiers[targetBadge.tier]
    const badgeName = (targetBadge.metadata as { name?: string })?.name || targetBadge.badgeType
    const badgeDescription = (targetBadge.metadata as { description?: string })?.description || tierConfig.name
    const badgeImageUrl = (targetBadge.metadata as { imageUrl?: string })?.imageUrl || badgeDefinition?.imageUrl

    const tierGradient = getTierGradient(targetBadge.tier)
    const assignedDate = formatBadgeDate(targetBadge.assignedAt)

    return new ImageResponse(
      (
        <div
          style={{
            width: WIDTH,
            height: HEIGHT,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: `radial-gradient(circle at 30% 30%, ${tierGradient.start}40, #0a0a0a), linear-gradient(135deg, #1a1a1a, #000000)`,
            color: '#ffffff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            position: 'relative',
          }}
        >
          {/* Background glow effect */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '600px',
              height: '600px',
              background: `radial-gradient(circle, ${tierGradient.start}30, transparent 70%)`,
              filter: 'blur(80px)',
              pointerEvents: 'none',
            }}
          />

          {/* Content container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 1,
              gap: 24,
            }}
          >
            {/* Badge image */}
            {badgeImageUrl ? (
              <div
                style={{
                  width: 280,
                  height: 280,
                  borderRadius: 24,
                  overflow: 'hidden',
                  border: `4px solid ${tierGradient.start}`,
                  boxShadow: `0 0 60px ${tierGradient.start}60`,
                  display: 'flex',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={badgeImageUrl}
                  alt={badgeName}
                  width={280}
                  height={280}
                  style={{ objectFit: 'cover' }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: 280,
                  height: 280,
                  borderRadius: 24,
                  background: `linear-gradient(135deg, ${tierGradient.start}40, ${tierGradient.end}40)`,
                  border: `4px solid ${tierGradient.start}`,
                  boxShadow: `0 0 60px ${tierGradient.start}60`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 80,
                }}
              >
                🎖️
              </div>
            )}

            {/* Badge info */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <h1
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  margin: 0,
                  textAlign: 'center',
                  maxWidth: 900,
                  lineHeight: 1.2,
                }}
              >
                {badgeName}
              </h1>

              {/* Tier pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '8px 24px',
                  borderRadius: 999,
                  background: `${tierGradient.start}30`,
                  border: `2px solid ${tierGradient.start}`,
                  fontSize: 24,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                }}
              >
                {tierConfig.name}
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: 24,
                  opacity: 0.8,
                  margin: 0,
                  textAlign: 'center',
                  maxWidth: 800,
                }}
              >
                {badgeDescription}
              </p>

              {/* Earned date + minted status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  fontSize: 20,
                  opacity: 0.7,
                }}
              >
                <span>Earned: {assignedDate}</span>
                {targetBadge.minted && (
                  <>
                    <span>•</span>
                    <span style={{ color: '#7CFF7A' }}>✓ Minted</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer branding */}
          <div
            style={{
              position: 'absolute',
              bottom: 32,
              right: 40,
              fontSize: 18,
              opacity: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>@gmeowbased</span>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
      }
    )
  } catch (error) {
    console.error('[Frame BadgeShare Image] Error:', error)
    return new ImageResponse(
      <ErrorImage message="Failed to generate image" />,
      { width: WIDTH, height: HEIGHT }
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
        }}
      >
        ⚠️
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
