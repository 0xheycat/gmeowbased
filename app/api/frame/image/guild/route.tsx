import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { loadFrameFonts, loadBackgroundImage } from '@/lib/frame-fonts'
import {
  FRAME_FONT_FAMILY,
  FRAME_FONTS_V2,
  FRAME_SPACING,
  FRAME_COLORS,
  buildBackgroundGradient,
  buildBorderEffect,
} from '@/lib/frame-design-system'
import { withFrameImageCache, getStringParam, getNumericParam } from '@/lib/frames/image-cache-helper'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  return withFrameImageCache({
    req,
    frameType: 'guild',
    ttl: 300,
    generator: async ({ searchParams }) => {
      const guildId = getStringParam(searchParams, 'id', '1')
      const guildName = getStringParam(searchParams, 'name', 'Unknown Guild')
      const memberCount = getNumericParam(searchParams, 'members', 0)
      const totalPoints = getNumericParam(searchParams, 'points', 0)
      const ownerName = getStringParam(searchParams, 'owner', 'Unknown')
      const guildLevel = getNumericParam(searchParams, 'level', 1)

  const [fonts, bgImage] = await Promise.all([
    loadFrameFonts(),
    loadBackgroundImage(),
  ])

  const guildPalette = FRAME_COLORS.guild
  const borderStyle = buildBorderEffect('guild', 'solid')

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
        {/* Background Layer */}
        {bgImage ? (
          <img
            src={bgImage}
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
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: buildBackgroundGradient('guild'),
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
            background: buildBackgroundGradient('guild', 'card'),
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
              marginBottom: FRAME_SPACING.section.large,
            }}
          >
            <div
              style={{ display: 'flex', fontSize: FRAME_FONTS_V2.h3,
                fontWeight: 600,
                color: guildPalette.primary,
              }}
            >
              {guildName}
            </div>
            <div
              style={{ display: 'flex', fontSize: FRAME_FONTS_V2.label,
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.6)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              Guild #{guildId}
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            {/* Guild Icon */}
            <div
              style={{
                display: 'flex',
                width: 100,
                height: 100,
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 60,
                background: `linear-gradient(135deg, ${guildPalette.primary}, ${guildPalette.secondary})`,
                borderRadius: 16,
                marginBottom: FRAME_SPACING.section.medium,
                boxShadow: `0 4px 16px ${guildPalette.primary}40`,
              }}
            >
              🏰
            </div>

            {/* Guild Level */}
            <div
              style={{
                display: 'flex',
                fontSize: FRAME_FONTS_V2.h2,
                fontWeight: 700,
                color: guildPalette.accent,
                marginBottom: FRAME_SPACING.section.small,
              }}
            >
              Level {guildLevel}
            </div>

            {/* Stats Row */}
            <div
              style={{
                display: 'flex',
                gap: FRAME_SPACING.section.medium,
                marginTop: FRAME_SPACING.section.medium,
              }}
            >
              {/* Members Stat */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: `${guildPalette.primary}15`,
                  padding: FRAME_SPACING.padding.stat,
                  borderRadius: 8,
                  border: `1px solid ${guildPalette.primary}30`,
                }}
              >
                <div style={{ display: 'flex', fontSize: 24, marginBottom: 4 }}>👥</div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: FRAME_FONTS_V2.h2,
                    fontWeight: 700,
                    color: 'white',
                  }}
                >
                  {memberCount}
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: FRAME_FONTS_V2.caption,
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginTop: 2,
                  }}
                >
                  MEMBERS
                </div>
              </div>

              {/* Points Stat */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: `${guildPalette.secondary}15`,
                  padding: FRAME_SPACING.padding.stat,
                  borderRadius: 8,
                  border: `1px solid ${guildPalette.secondary}30`,
                }}
              >
                <div style={{ display: 'flex', fontSize: 24, marginBottom: 4 }}>⭐</div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: FRAME_FONTS_V2.h2,
                    fontWeight: 700,
                    color: 'white',
                  }}
                >
                  {totalPoints.toLocaleString()}
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: FRAME_FONTS_V2.caption,
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginTop: 2,
                  }}
                >
                  POINTS
                </div>
              </div>
            </div>

            {/* Owner Info */}
            <div
              style={{
                display: 'flex',
                fontSize: FRAME_FONTS_V2.body,
                color: 'rgba(255, 255, 255, 0.7)',
                marginTop: FRAME_SPACING.section.large,
              }}
            >
              Led by{' '}
              <span
                style={{
                  fontWeight: 600,
                  color: guildPalette.accent,
                  marginLeft: 4,
                }}
              >
                {ownerName}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              fontSize: FRAME_FONTS_V2.caption,
              color: 'rgba(255, 255, 255, 0.4)',
              marginTop: FRAME_SPACING.section.small,
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
