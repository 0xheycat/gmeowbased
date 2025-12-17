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
    frameType: 'referral',
    ttl: 300,
    generator: async ({ searchParams }) => {
      const referralCode = getStringParam(searchParams, 'code', 'GMBASE')
      const referralCount = getNumericParam(searchParams, 'count', 0)
      const totalRewards = getNumericParam(searchParams, 'rewards', 0)
      const username = getStringParam(searchParams, 'username', 'Pilot')

  const [fonts, bgImage] = await Promise.all([
    loadFrameFonts(),
    loadBackgroundImage(),
  ])

  const referralPalette = FRAME_COLORS.referral
  const borderStyle = buildBorderEffect('referral', 'solid')

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
              background: buildBackgroundGradient('referral'),
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
            background: buildBackgroundGradient('referral', 'card'),
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
                color: referralPalette.primary,
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
              Referral
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
            {/* Gift Icon */}
            <div
              style={{
                display: 'flex',
                fontSize: 48,
                marginBottom: FRAME_SPACING.section.medium,
              }}
            >
              🎁
            </div>

            {/* Referral Code Display */}
            <div
              style={{
                display: 'flex',
                background: `linear-gradient(135deg, ${referralPalette.primary}, ${referralPalette.secondary})`,
                padding: '12px 36px',
                borderRadius: 12,
                marginBottom: FRAME_SPACING.section.large,
                boxShadow: `0 4px 16px ${referralPalette.primary}40`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: FRAME_FONTS_V2.display,
                  fontWeight: 700,
                  color: 'white',
                  fontFamily: 'monospace',
                  letterSpacing: '2px',
                }}
              >
                {referralCode}
              </div>
            </div>

            {/* Stats Row */}
            <div
              style={{
                display: 'flex',
                gap: FRAME_SPACING.section.large,
                marginTop: FRAME_SPACING.section.medium,
              }}
            >
              {/* Referral Count */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: `${referralPalette.primary}15`,
                  padding: FRAME_SPACING.padding.stat,
                  borderRadius: 8,
                  border: `1px solid ${referralPalette.primary}30`,
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
                  {referralCount}
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: FRAME_FONTS_V2.caption,
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginTop: 2,
                  }}
                >
                  REFERRALS
                </div>
              </div>

              {/* Total Rewards */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: `${referralPalette.accent}15`,
                  padding: FRAME_SPACING.padding.stat,
                  borderRadius: 8,
                  border: `1px solid ${referralPalette.accent}30`,
                }}
              >
                <div style={{ display: 'flex', fontSize: 24, marginBottom: 4 }}>💰</div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: FRAME_FONTS_V2.h2,
                    fontWeight: 700,
                    color: referralPalette.accent,
                  }}
                >
                  {totalRewards}
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: FRAME_FONTS_V2.caption,
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginTop: 2,
                  }}
                >
                  XP EARNED
                </div>
              </div>
            </div>

            {/* CTA Text */}
            <div
              style={{
                display: 'flex',
                fontSize: FRAME_FONTS_V2.caption,
                color: 'rgba(255, 255, 255, 0.5)',
                marginTop: FRAME_SPACING.section.medium,
                textAlign: 'center',
              }}
            >
              Share your code • Earn 50 XP per referral
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
