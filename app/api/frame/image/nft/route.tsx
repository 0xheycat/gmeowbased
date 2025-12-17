/**
 * NFT Frame Image Generator
 * Dynamic image showing NFT collection
 * Uses hybrid calculator logic: nftPoints = nftMints.length * 100
 */

import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { loadFrameFonts, loadBackgroundImage } from '@/lib/frames/frame-fonts'
import {
  FRAME_FONT_FAMILY,
  FRAME_FONTS_V2,
  FRAME_SPACING,
  FRAME_COLORS,
  TIER_COLORS,
  buildBackgroundGradient,
  buildBorderEffect,
} from '@/lib/frames/frame-design-system'
import { withFrameImageCache, getStringParam, getNumericParam } from '@/lib/frames/image-cache-helper'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  return withFrameImageCache({
    req,
    frameType: 'nft',
    ttl: 300,
    generator: async ({ searchParams }) => {
      const nftCount = getNumericParam(searchParams, 'nftCount', 0)
      const nftPoints = getNumericParam(searchParams, 'nftPoints', 0)
      const username = getStringParam(searchParams, 'username', 'Pilot')
      const totalValue = getStringParam(searchParams, 'totalValue', '0')
      const nftIds = getStringParam(searchParams, 'nftIds', '')?.split(',').filter(Boolean).slice(0, 9) || []

    const [fonts, bgImage] = await Promise.all([
      loadFrameFonts(),
      loadBackgroundImage(),
    ])

    // Use badge colors for NFT display (gold/violet theme)
    const nftPalette = FRAME_COLORS.badge
    const borderStyle = buildBorderEffect('badge', 'solid')

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
                marginBottom: FRAME_SPACING.section.large,
              }}
            >
              <div
                style={{ display: 'flex', fontSize: FRAME_FONTS_V2.h3,
                  fontWeight: 600,
                  color: nftPalette.primary,
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
                {nftCount} NFTs
              </div>
            </div>

            {/* Main Content */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
              }}
            >
              {/* NFT Grid 3x3 */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: FRAME_SPACING.section.small,
                  justifyContent: 'center',
                  marginBottom: FRAME_SPACING.section.medium,
                }}
              >
                {nftIds.length > 0 ? (
                  nftIds.map((nftId, i) => {
                    // Rotate through tier colors
                    const tierColors = [
                      TIER_COLORS.legendary,
                      TIER_COLORS.epic,
                      TIER_COLORS.rare,
                    ]
                    const tierColor = tierColors[i % 3]
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          width: 64,
                          height: 64,
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 32,
                          background: `${tierColor}20`,
                          border: `2px solid ${tierColor}`,
                          borderRadius: 8,
                          boxShadow: `0 2px 8px ${tierColor}40`,
                        }}
                      >
                        🖼️
                      </div>
                    )
                  })
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      width: 100,
                      height: 100,
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 60,
                      opacity: 0.3,
                    }}
                  >
                    🖼️
                  </div>
                )}
              </div>

              {/* Stats Row */}
              <div
                style={{
                  display: 'flex',
                  gap: FRAME_SPACING.section.small,
                  justifyContent: 'space-between',
                }}
              >
                {/* NFT Count */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    background: `${nftPalette.primary}10`,
                    padding: FRAME_SPACING.padding.stat,
                    borderRadius: 8,
                    border: `1px solid ${nftPalette.primary}30`,
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 20, marginBottom: 2 }}>🖼️</div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: FRAME_FONTS_V2.h3,
                      fontWeight: 700,
                      color: 'white',
                    }}
                  >
                    {nftCount}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: FRAME_FONTS_V2.micro,
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginTop: 2,
                    }}
                  >
                    NFTS
                  </div>
                </div>

                {/* Points */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    background: `${nftPalette.secondary}10`,
                    padding: FRAME_SPACING.padding.stat,
                    borderRadius: 8,
                    border: `1px solid ${nftPalette.secondary}30`,
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 20, marginBottom: 2 }}>⭐</div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: FRAME_FONTS_V2.h3,
                      fontWeight: 700,
                      color: nftPalette.accent,
                    }}
                  >
                    {nftPoints}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: FRAME_FONTS_V2.micro,
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginTop: 2,
                    }}
                  >
                    POINTS
                  </div>
                </div>

                {/* Value */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    background: `${nftPalette.accent}10`,
                    padding: FRAME_SPACING.padding.stat,
                    borderRadius: 8,
                    border: `1px solid ${nftPalette.accent}30`,
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 20, marginBottom: 2 }}>💰</div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: FRAME_FONTS_V2.body,
                      fontWeight: 700,
                      color: 'white',
                    }}
                  >
                    {totalValue}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: FRAME_FONTS_V2.micro,
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginTop: 2,
                    }}
                  >
                    VALUE
                  </div>
                </div>
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
