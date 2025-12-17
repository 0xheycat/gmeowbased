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
import { withFrameImageCache, getStringParam, getNumericParam } from '@/lib/frames/image-cache-helper'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  return withFrameImageCache({
    req,
    frameType: 'onchainstats',
    ttl: 300,
    generator: async ({ searchParams }) => {
      const totalXP = getNumericParam(searchParams, 'xp', 0)
      const gmStreak = getNumericParam(searchParams, 'streak', 0)
      const lifetimeGMs = getNumericParam(searchParams, 'gms', 0)
      const badges = getNumericParam(searchParams, 'badges', 0)
      const guilds = getNumericParam(searchParams, 'guilds', 0)
      const referrals = getNumericParam(searchParams, 'referrals', 0)
      const username = getStringParam(searchParams, 'username', 'Pilot')

  const [fonts, bgImage] = await Promise.all([
    loadFrameFonts(),
    loadBackgroundImage(),
  ])

  const statsPalette = FRAME_COLORS.onchainstats
  const borderStyle = buildBorderEffect('onchainstats', 'solid')

  const stats = [
    { icon: '🔥', value: gmStreak, label: 'GM STREAK' },
    { icon: '☀️', value: lifetimeGMs, label: 'LIFETIME GMS' },
    { icon: '🏅', value: badges, label: 'BADGES' },
    { icon: '🏰', value: guilds, label: 'GUILDS' },
    { icon: '🎁', value: referrals, label: 'REFERRALS' },
    { icon: '⭐', value: totalXP, label: 'TOTAL XP' },
  ]

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
              background: buildBackgroundGradient('onchainstats'),
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
            background: buildBackgroundGradient('onchainstats', 'card'),
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
                color: statsPalette.primary,
              }}
            >
              @{username}
            </div>
            <div
              style={{ display: 'flex', fontSize: FRAME_FONTS_V2.label,
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.6)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              On-Chain Stats
            </div>
          </div>

          {/* Main Content - 2x3 Stat Grid */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              gap: FRAME_SPACING.section.medium,
            }}
          >
            {/* Row 1 */}
            <div
              style={{
                display: 'flex',
                gap: FRAME_SPACING.section.small,
                justifyContent: 'space-between',
              }}
            >
              {stats.slice(0, 3).map((stat, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    background: `${statsPalette.primary}10`,
                    padding: FRAME_SPACING.padding.stat,
                    borderRadius: 8,
                    border: `1px solid ${statsPalette.primary}30`,
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: FRAME_FONTS_V2.h2,
                      fontWeight: 700,
                      color: 'white',
                    }}
                  >
                    {stat.value.toLocaleString()}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: FRAME_FONTS_V2.micro,
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginTop: 2,
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Row 2 */}
            <div
              style={{
                display: 'flex',
                gap: FRAME_SPACING.section.small,
                justifyContent: 'space-between',
              }}
            >
              {stats.slice(3, 6).map((stat, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    background: `${statsPalette.secondary}10`,
                    padding: FRAME_SPACING.padding.stat,
                    borderRadius: 8,
                    border: `1px solid ${statsPalette.secondary}30`,
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: FRAME_FONTS_V2.h2,
                      fontWeight: 700,
                      color: 'white',
                    }}
                  >
                    {stat.value.toLocaleString()}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: FRAME_FONTS_V2.micro,
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginTop: 2,
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
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
