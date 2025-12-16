import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { loadFrameFonts, loadBackgroundImage } from '@/lib/frame-fonts'
import {
  FRAME_FONT_FAMILY,
  FRAME_FONTS_V2,
  FRAME_SPACING,
  FRAME_COLORS,
  TIER_COLORS,
  buildBackgroundGradient,
  buildBorderEffect,
} from '@/lib/frame-design-system'
import { withFrameImageCache, getStringParam, getNumericParam } from '@/lib/frames/image-cache-helper'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  return withFrameImageCache({
    req,
    frameType: 'badge',
    ttl: 300,
    generator: async ({ searchParams }) => {
      const badgeId = getStringParam(searchParams, 'id', 'gm-master')
      const badgeName = getStringParam(searchParams, 'name', 'GM Master')
      const badgeCount = getNumericParam(searchParams, 'count', 0)
      const username = getStringParam(searchParams, 'username', 'Pilot')
      const earnedDate = getStringParam(searchParams, 'earned', new Date().toISOString().split('T')[0])

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

  const badgePalette = FRAME_COLORS.badge
  const borderStyle = buildBorderEffect('badge', 'solid')
  
  // Determine tier for color (mock - can be passed as param)
  const tier = 'legendary' // Could come from searchParams

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background */}
        {bgImage ? (
          <img
            src={bgImage}
            alt="background"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 1.0,
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: buildBackgroundGradient('badge'),
            }}
          />
        )}

        {/* Card Container */}
        <div
          style={{
            width: 540,
            height: 360,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: FRAME_FONT_FAMILY.body,
            background: buildBackgroundGradient('badge', 'card'),
            border: borderStyle.border,
            borderRadius: 12,
            boxShadow: borderStyle.boxShadow,
            padding: FRAME_SPACING.container,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: FRAME_SPACING.section.small,
            }}
          >
            <div
              style={{ display: 'flex', fontSize: FRAME_FONTS_V2.h3,
                color: badgePalette.primary,
                fontWeight: 600,
              }}
            >
              @{username}
            </div>
            <div
              style={{ display: 'flex', fontSize: FRAME_FONTS_V2.label,
                color: 'rgba(255, 255, 255, 0.6)',
                textTransform: 'uppercase',
              }}
            >
              {badgeCount} BADGES
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: FRAME_SPACING.section.medium,
            }}
          >
            {/* Badge Display */}
            <div
              style={{
                display: 'flex',
                width: 140,
                height: 140,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${TIER_COLORS.legendary}40, ${TIER_COLORS.legendary}20)`,
                border: `4px solid ${TIER_COLORS.legendary}`,
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 80,
                boxShadow: `0 0 30px ${TIER_COLORS.legendary}60`,
              }}
            >
              {badgeEmoji}
            </div>

            {/* Badge Name */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{ display: 'flex', fontSize: FRAME_FONTS_V2.h2,
                  fontWeight: 700,
                  color: badgePalette.primary,
                }}
              >
                {badgeName}
              </div>
              <div
                style={{ display: 'flex', fontSize: FRAME_FONTS_V2.caption,
                  color: 'rgba(255, 255, 255, 0.6)',
                  textTransform: 'uppercase',
                }}
              >
                #{badgeId}
              </div>
            </div>

            {/* Earned Info */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: FRAME_SPACING.padding.medium,
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                gap: 4,
              }}
            >
              <div
                style={{ display: 'flex', fontSize: FRAME_FONTS_V2.caption,
                  color: 'rgba(255, 255, 255, 0.6)',
                  textTransform: 'uppercase',
                }}
              >
                Earned
              </div>
              <div
                style={{ display: 'flex', fontSize: FRAME_FONTS_V2.body,
                  color: 'white',
                  fontWeight: 600,
                }}
              >
                {earnedDate}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: FRAME_SPACING.margin.footer,
              fontSize: FRAME_FONTS_V2.caption,
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            gmeowhq.art
          </div>
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
  })
}
