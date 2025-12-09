/**
 * Dynamic Badge Image Generation API
 * Generates badge images on-the-fly based on guild name or badge type
 */

import { NextRequest, NextResponse } from 'next/server'
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

// Helper functions must be defined before ImageResponse JSX
function getBorderColor(badgeType: string, subType?: string): string {
  if (badgeType === 'guild') {
    return subType === 'leader' ? '#FFD700' : '#C0C0C0' // Gold for leader, silver for member
  }
  if (badgeType === 'quest') {
    return '#00D4FF' // Cyan for quests
  }
  if (badgeType === 'achievement') {
    return '#FF6B35' // Orange for achievements
  }
  return '#888888' // Default gray
}

function getIcon(badgeType: string, subType?: string): string {
  if (badgeType === 'guild') {
    return subType === 'leader' ? '👑' : '🛡️'
  }
  if (badgeType === 'quest') {
    return '⚔️'
  }
  if (badgeType === 'achievement') {
    return '🏆'
  }
  return '⭐'
}

function formatBadgeType(badgeType: string, subType?: string): string {
  if (badgeType === 'guild' && subType === 'leader') {
    return 'Guild Leader'
  }
  if (badgeType === 'guild' && subType === 'member') {
    return 'Guild Member'
  }
  if (badgeType === 'quest') {
    return 'Quest Complete'
  }
  if (badgeType === 'achievement') {
    return 'Achievement'
  }
  return 'Badge'
}

function formatName(name: string): string {
  // Capitalize each word
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ imageId: string }> }
) {
  try {
    const params = await context.params
    const { imageId } = params

    // Parse imageId: "guild-leader-{guildName}" or "quest-{questName}"
    const parts = imageId.split('-')
    const badgeType = parts[0] // "guild", "quest", "achievement"
    const subType = parts[1] // "leader", "member", quest name
    const name = parts.slice(2).join(' ') // Remaining parts as display name

    // Generate badge image using Next.js ImageResponse (Vercel OG)
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
            backgroundColor: '#1a1a1a',
            backgroundImage: 'radial-gradient(circle at 25% 25%, #2a2a2a 0%, #1a1a1a 50%)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {/* Badge Border */}
          <div
            style={{
              display: 'flex',
              width: '80%',
              height: '80%',
              borderRadius: '20px',
              border: '4px solid',
              borderColor: getBorderColor(badgeType, subType),
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Badge Content */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '40px',
              }}
            >
              {/* Icon */}
              <div
                style={{
                  fontSize: '120px',
                  marginBottom: '20px',
                }}
              >
                {getIcon(badgeType, subType)}
              </div>

              {/* Badge Type */}
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: getBorderColor(badgeType, subType),
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  marginBottom: '10px',
                }}
              >
                {formatBadgeType(badgeType, subType)}
              </div>

              {/* Guild/Quest Name */}
              {name && (
                <div
                  style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    textAlign: 'center',
                    marginBottom: '10px',
                    maxWidth: '90%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatName(name)}
                </div>
              )}

              {/* Soulbound Badge */}
              <div
                style={{
                  marginTop: '20px',
                  padding: '10px 20px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: '20px',
                  color: '#888888',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                🔒 Soulbound
              </div>

              {/* Gmeow Logo */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '30px',
                  fontSize: '24px',
                  color: '#666666',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                Gmeowbased Adventure
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 1200,
      }
    )
  } catch (error) {
    console.error('Badge image generation error:', error)
    return new NextResponse('Error generating image', { status: 500 })
  }
}
