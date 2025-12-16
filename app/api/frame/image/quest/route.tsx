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
    frameType: 'quest',
    ttl: 300,
    generator: async ({ searchParams }) => {
      const questId = getStringParam(searchParams, 'id', '1')
      const title = getStringParam(searchParams, 'title', 'Complete Quest')
      const reward = getNumericParam(searchParams, 'reward', 100)
      const difficulty = getStringParam(searchParams, 'difficulty', 'intermediate')
      const completed = getStringParam(searchParams, 'completed', 'false') === 'true'

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

  const questPalette = FRAME_COLORS.quest
  const borderStyle = buildBorderEffect('quest', 'solid')

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
              background: buildBackgroundGradient('quest'),
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
            background: buildBackgroundGradient('quest', 'card'),
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
                color: questPalette.primary,
                fontWeight: 600,
              }}
            >
              QUEST #{questId}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                background: statusColor,
                borderRadius: 12,
                fontSize: FRAME_FONTS_V2.label,
                color: 'white',
                fontWeight: 600,
              }}
            >
              {statusEmoji} {statusText}
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
            {/* Quest Icon */}
            <div
              style={{
                display: 'flex',
                width: 100,
                height: 100,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${questPalette.primary}40, ${questPalette.secondary}40)`,
                border: `3px solid ${questPalette.primary}`,
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 56,
              }}
            >
              🎯
            </div>

            {/* Quest Title */}
            <div
              style={{ display: 'flex', fontSize: FRAME_FONTS_V2.h2,
                fontWeight: 700,
                color: 'white',
                textAlign: 'center',
                maxWidth: 450,
              }}
            >
              {title}
            </div>

            {/* Stats Row */}
            <div
              style={{
                display: 'flex',
                gap: FRAME_SPACING.section.large,
                width: '100%',
                justifyContent: 'center',
              }}
            >
              {/* Difficulty */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: FRAME_SPACING.padding.medium,
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  minWidth: 120,
                }}
              >
                <div style={{ display: 'flex', fontSize: FRAME_FONTS_V2.h2, marginBottom: 4 }}>
                  {difficultyEmoji}
                </div>
                <div
                  style={{ display: 'flex', fontSize: FRAME_FONTS_V2.caption,
                    color: 'rgba(255, 255, 255, 0.6)',
                    textTransform: 'uppercase',
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
                  padding: FRAME_SPACING.padding.medium,
                  background: `linear-gradient(135deg, ${questPalette.accent}20, ${questPalette.accent}10)`,
                  borderRadius: 8,
                  border: `2px solid ${questPalette.accent}`,
                  minWidth: 120,
                }}
              >
                <div
                  style={{ display: 'flex', fontSize: FRAME_FONTS_V2.h2,
                    color: questPalette.accent,
                    fontWeight: 700,
                  }}
                >
                  {reward}
                </div>
                <div
                  style={{ display: 'flex', fontSize: FRAME_FONTS_V2.caption,
                    color: 'rgba(255, 255, 255, 0.6)',
                    textTransform: 'uppercase',
                  }}
                >
                  XP Reward
                </div>
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
