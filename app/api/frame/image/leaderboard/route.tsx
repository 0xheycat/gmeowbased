/**
 * Leaderboard Frame Image Generator
 * Dynamic OG image for leaderboard frames
 */

import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { loadFrameFonts, loadBackgroundImage } from '@/lib/frames/frame-fonts'
import {
  FRAME_FONT_FAMILY,
  FRAME_FONTS_V2,
  FRAME_SPACING,
  FRAME_COLORS,
  buildBackgroundGradient,
  buildBorderEffect,
} from '@/lib/frames/frame-design-system'
import { withFrameImageCache, getStringParam } from '@/lib/frames/image-cache-helper'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  return withFrameImageCache({
    req,
    frameType: 'leaderboard',
    ttl: 300,
    generator: async ({ searchParams }) => {
      const season = getStringParam(searchParams, 'season', 'weekly')
      const top1 = getStringParam(searchParams, 'top1', 'Loading...')
      const top1Points = getStringParam(searchParams, 'top1Points', '0')
      const top2 = getStringParam(searchParams, 'top2', '')
      const top3 = getStringParam(searchParams, 'top3', '')
      const total = getStringParam(searchParams, 'total', '0')

    const [fonts, bgImage] = await Promise.all([
      loadFrameFonts(),
      loadBackgroundImage(),
    ])

    const leaderboardPalette = FRAME_COLORS.leaderboards
    const borderStyle = buildBorderEffect('leaderboards', 'solid')

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
                background: buildBackgroundGradient('leaderboards'),
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
              background: buildBackgroundGradient('leaderboards', 'card'),
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
                  color: leaderboardPalette.primary,
                  fontWeight: 600,
                }}
              >
                🏆 TOP PILOTS
              </div>
              <div
                style={{ display: 'flex', fontSize: FRAME_FONTS_V2.label,
                  color: 'rgba(255, 255, 255, 0.6)',
                  textTransform: 'uppercase',
                }}
              >
                {season}
              </div>
            </div>

            {/* Podium Layout */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: FRAME_SPACING.section.small,
                alignItems: 'flex-end',
                justifyContent: 'center',
                flex: 1,
                marginTop: FRAME_SPACING.section.medium,
              }}
            >
              {/* #2 */}
              {top2 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'rgba(192, 192, 192, 0.1)',
                    padding: FRAME_SPACING.padding.box,
                    borderRadius: 8,
                    border: '2px solid rgba(192, 192, 192, 0.5)',
                    minWidth: 140,
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 32 }}>🥈</div>
                  <div
                    style={{ display: 'flex', fontSize: FRAME_FONTS_V2.body,
                      color: 'white',
                      fontWeight: 600,
                      marginTop: 4,
                    }}
                  >
                    {top2}
                  </div>
                  <div
                    style={{ display: 'flex', fontSize: FRAME_FONTS_V2.caption,
                      color: 'rgba(192, 192, 192, 0.8)',
                    }}
                  >
                    #2
                  </div>
                </div>
              )}

              {/* #1 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: `linear-gradient(135deg, ${leaderboardPalette.primary}30, ${leaderboardPalette.secondary}30)`,
                  padding: FRAME_SPACING.padding.large,
                  borderRadius: 8,
                  border: `3px solid ${leaderboardPalette.primary}`,
                  minWidth: 160,
                  boxShadow: `0 0 20px ${leaderboardPalette.primary}60`,
                }}
              >
                <div style={{ display: 'flex', fontSize: 40 }}>👑</div>
                <div
                  style={{ display: 'flex', fontSize: FRAME_FONTS_V2.h3,
                    color: leaderboardPalette.primary,
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  {top1}
                </div>
                <div
                  style={{ display: 'flex', fontSize: FRAME_FONTS_V2.body,
                    color: leaderboardPalette.accent,
                    fontWeight: 600,
                    marginTop: 4,
                  }}
                >
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
                    background: 'rgba(205, 127, 50, 0.1)',
                    padding: FRAME_SPACING.padding.box,
                    borderRadius: 8,
                    border: '2px solid rgba(205, 127, 50, 0.5)',
                    minWidth: 140,
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 32 }}>🥉</div>
                  <div
                    style={{ display: 'flex', fontSize: FRAME_FONTS_V2.body,
                      color: 'white',
                      fontWeight: 600,
                      marginTop: 4,
                    }}
                  >
                    {top3}
                  </div>
                  <div
                    style={{ display: 'flex', fontSize: FRAME_FONTS_V2.caption,
                      color: 'rgba(205, 127, 50, 0.8)',
                    }}
                  >
                    #3
                  </div>
                </div>
              )}
            </div>

            {/* Stats Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: FRAME_SPACING.section.medium,
                padding: FRAME_SPACING.padding.small,
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 6,
              }}
            >
              <div
                style={{ display: 'flex', fontSize: FRAME_FONTS_V2.body,
                  color: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                📊 {total} pilots competing
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
