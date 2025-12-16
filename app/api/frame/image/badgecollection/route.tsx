/**
 * Badge Collection Frame Image Generator
 * Dynamic image showing badge collection grid (up to 9 badges)
 * Extracted from monolithic route (lines 2120-2550)
 */

import { NextRequest } from 'next/server'
import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { loadFrameFonts } from '@/lib/frame-fonts'
import {
  FRAME_FONTS_V2,
  FRAME_FONT_FAMILY,
  FRAME_TYPOGRAPHY,
  FRAME_SPACING,
  FRAME_COLORS,
  SHARED_COLORS,
  buildFooterText,
} from '@/lib/frame-design-system'
import { formatXp } from '@/lib/rank'
import { withFrameImageCache, getStringParam, getNumericParam } from '@/lib/frames/image-cache-helper'

export const runtime = 'nodejs'

/**
 * Load image from filesystem and convert to base64 data URL
 */
async function loadImageAsDataUrl(relativePath: string): Promise<string | null> {
  try {
    const absolutePath = join(process.cwd(), 'public', relativePath)
    const buffer = await readFile(absolutePath)
    const base64 = buffer.toString('base64')
    const ext = relativePath.split('.').pop()
    const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp'
    return `data:${mimeType};base64,${base64}`
  } catch (err) {
    console.error(`[Badge Collection] Failed to load ${relativePath}:`, err)
    return null
  }
}

// Badge metadata registry
const badgeRegistry: Record<string, { name: string; tier: string }> = {
  'neon-initiate': { name: 'Neon Initiate', tier: 'common' },
  'pulse-runner': { name: 'Pulse Runner', tier: 'rare' },
  'signal-luminary': { name: 'Signal Luminary', tier: 'epic' },
  'warp-navigator': { name: 'Warp Navigator', tier: 'legendary' },
  'gmeow-vanguard': { name: 'Gmeow Vanguard', tier: 'mythic' }
}

// Tier colors for badge card borders
const tierColors: Record<string, string> = {
  common: '#D3D7DC',
  rare: '#A18CFF',
  epic: '#61DFFF',
  legendary: '#FFD966',
  mythic: '#9C27FF'
}

export async function GET(req: NextRequest) {
  return withFrameImageCache({
    req,
    frameType: 'badgecollection',
    ttl: 300,
    generator: async ({ searchParams }) => {
      const username = getStringParam(searchParams, 'username', '')
      const displayName = getStringParam(searchParams, 'displayName', '')
      const earnedCount = getStringParam(searchParams, 'earnedCount', '0')
      const eligibleCount = getStringParam(searchParams, 'eligibleCount', '0')
      const address = getStringParam(searchParams, 'address', '')
      const fid = getStringParam(searchParams, 'fid', '')
      const badgeXp = getStringParam(searchParams, 'badgeXp', '0')
      const earnedBadges = getStringParam(searchParams, 'earnedBadges', '')
      
      const badgeIds = earnedBadges.split(',').filter(Boolean).slice(0, 9)
    
    // Load badge images asynchronously
    const badgeImages = await Promise.all(
      badgeIds.map(async (badgeId) => {
        const imgData = await loadImageAsDataUrl(`badges/${badgeId}.png`)
        return imgData || ''
      })
    )
    
    // Load background image
    const ogImageData = await loadImageAsDataUrl('og-image.png')
    const fonts = await loadFrameFonts()

    const badgePalette = {
      start: FRAME_COLORS.badge.primary,
      end: FRAME_COLORS.badge.secondary
    }

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
          {ogImageData ? (
            <img
              src={ogImageData}
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
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 30%, #1f0a1f 60%, #0a0a0a 100%)',
              }}
            />
          )}

          {/* Badge Card Container */}
          <div
            style={{
              width: 540,
              height: 360,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(15, 15, 17, 0.75) 0%, rgba(10, 10, 12, 0.85) 100%)',
              border: `4px solid ${badgePalette.start}`,
              borderRadius: 12,
              boxShadow: `0 8px 32px rgba(212, 175, 55, 0.3), inset 0 0 0 1px rgba(199, 125, 255, 0.1)`,
              padding: FRAME_SPACING.container,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
                color: SHARED_COLORS.white,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: FRAME_SPACING.padding.minimal,
                  background: `linear-gradient(135deg, ${badgePalette.start}, ${badgePalette.end})`,
                  border: `2px solid ${badgePalette.start}`,
                  borderRadius: 999,
                  fontFamily: FRAME_FONT_FAMILY.display,
                  fontSize: FRAME_FONTS_V2.caption,
                  fontWeight: 700,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                }}
              >
                BADGE COLLECTION
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: FRAME_SPACING.section.tight,
                  fontSize: FRAME_FONTS_V2.caption,
                  fontWeight: 600,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                  opacity: 0.8,
                }}
              >
                GMEOW
              </div>
            </div>

            {/* Main content area */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                gap: FRAME_SPACING.section.small,
              }}
            >
              {/* Top: Badge grid section */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: FRAME_SPACING.section.small,
                }}
              >
                {/* Badge Icon - Badge Collection Grid with Images (70x70) */}
                <div
                  style={{
                    width: '100%',
                    minHeight: 150,
                    borderRadius: 10,
                    background: 'rgba(15, 15, 17, 0.5)',
                    border: '2px solid rgba(212, 175, 55, 0.3)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 12,
                  }}
                >
                  {badgeIds.length > 0 ? (
                    // Show earned badges with smart sizing based on count
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: badgeIds.length <= 6 ? 8 : badgeIds.length <= 12 ? 6 : 4,
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                      }}
                    >
                      {badgeIds.map((badgeId, i) => {
                        const badge = badgeRegistry[badgeId]
                        const tierColor = badge ? tierColors[badge.tier] : tierColors.common
                        
                        // Smart sizing: 1-6=70px, 7-12=60px, 13-18=50px
                        const cardSize = badgeIds.length <= 6 ? 70 : badgeIds.length <= 12 ? 60 : 50
                        const showName = badgeIds.length <= 12 // Hide names for 13+ to prevent overflow
                        
                        return (
                          <div
                            key={badgeId}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              width: cardSize,
                              padding: showName ? 4 : 2,
                              border: `2px solid ${tierColor}`,
                              borderRadius: 8,
                              background: 'rgba(255, 255, 255, 0.05)',
                            }}
                          >
                            {badgeImages[i] && (
                              <img
                                src={badgeImages[i]}
                                alt={badge?.name || 'Badge'}
                                width={cardSize.toString()}
                                height={cardSize.toString()}
                                style={{
                                  borderRadius: 6,
                                  objectFit: 'cover',
                                }}
                              />
                            )}
                            {showName && (
                              <div
                                style={{
                                  fontSize: FRAME_FONTS_V2.micro,
                                  fontWeight: 600,
                                  color: SHARED_COLORS.white,
                                  textAlign: 'center',
                                  marginTop: 2,
                                  maxWidth: cardSize,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {badge?.name || 'Unknown'}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    // Show placeholder when no badges
                    <div style={{ fontSize: 70, opacity: 0.3 }}>🏅</div>
                  )}
                </div>
              </div>

              {/* Bottom: User info + Stats */}
              <div
                style={{
                  display: 'flex',
                  gap: FRAME_SPACING.section.small,
                  alignItems: 'flex-start',
                }}
              >
                {/* User info box */}
                <div
                  style={{
                    width: 140,
                    display: 'flex',
                    padding: FRAME_SPACING.section.inline,
                    background: 'rgba(30, 30, 32, 0.6)',
                    border: `1px solid ${badgePalette.start}`,
                    borderRadius: 8,
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontFamily: FRAME_FONT_FAMILY.body,
                      fontSize: FRAME_FONTS_V2.label,
                      fontWeight: 700,
                      letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal,
                      lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal,
                      color: SHARED_COLORS.white,
                      textAlign: 'center',
                      wordBreak: 'break-word',
                    }}
                  >
                    {username ? `@${username}` : displayName ? displayName : address ? `👤 ${address.slice(0, 6)}...${address.slice(-4)}` : fid ? `👤 FID ${fid}` : '👤 Anonymous'}
                  </div>
                </div>

                {/* Stats section */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: FRAME_SPACING.section.small,
                  }}
                >
                  {/* Stats grid */}
                  <div
                    style={{
                      display: 'flex',
                      gap: FRAME_SPACING.section.small,
                    }}
                  >
                    {/* Stat card: Earned */}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: FRAME_SPACING.section.small,
                        background: 'rgba(30, 30, 32, 0.6)',
                        border: `1px solid ${badgePalette.start}`,
                        borderRadius: 8,
                        opacity: 0.9,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: 'rgba(255, 255, 255, 0.7)' }}>
                        EARNED
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          fontFamily: FRAME_FONT_FAMILY.display,
                          fontSize: FRAME_FONTS_V2.h3,
                          fontWeight: 900,
                          letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                          lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                          color: badgePalette.start,
                          textShadow: FRAME_TYPOGRAPHY.textShadow.strong,
                        }}
                      >
                        {earnedCount}
                      </div>
                    </div>

                    {/* Stat card: Eligible */}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: FRAME_SPACING.section.small,
                        background: 'rgba(30, 30, 32, 0.6)',
                        border: `1px solid ${badgePalette.end}`,
                        borderRadius: 8,
                        opacity: 0.9,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: 'rgba(255, 255, 255, 0.7)' }}>
                        ELIGIBLE
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          fontFamily: FRAME_FONT_FAMILY.display,
                          fontSize: FRAME_FONTS_V2.h3,
                          fontWeight: 900,
                          letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                          lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                          color: badgePalette.end,
                          textShadow: FRAME_TYPOGRAPHY.textShadow.strong,
                        }}
                      >
                        {eligibleCount}
                      </div>
                    </div>

                    {/* Stat card: XP from Badges */}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: FRAME_SPACING.section.small,
                        background: `linear-gradient(135deg, ${badgePalette.start}20, ${badgePalette.end}20)`,
                        border: `1px solid ${badgePalette.start}`,
                        borderRadius: 8,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center' }}>
                        XP
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          fontFamily: FRAME_FONT_FAMILY.display,
                          fontSize: FRAME_FONTS_V2.h3,
                          fontWeight: 900,
                          letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                          lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                          color: '#ffd700',
                          textShadow: FRAME_TYPOGRAPHY.textShadow.strong,
                        }}
                      >
                        +{formatXp(parseInt(badgeXp, 10))}
                      </div>
                    </div>
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
                fontFamily: FRAME_FONT_FAMILY.body,
                fontSize: FRAME_FONTS_V2.micro,
                letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal,
                lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal,
                color: 'rgba(255, 255, 255, 0.85)',
              }}
            >
              {buildFooterText('badge')}
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
