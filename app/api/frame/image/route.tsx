/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unknown-property */
/* eslint-disable react/style-prop-object */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/forbid-dom-props */
import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { fetchUserByFid } from '@/lib/neynar'
import { calculateTier, formatTierLabel, type TierInfo } from '@/lib/rarity-tiers'
import { getCachedFrame, setCachedFrame, type FrameCacheKey } from '@/lib/frame-cache'
import { getChainIconUrl } from '@/lib/chain-icons'
import { 
  FRAME_FONTS, 
  FRAME_FONTS_V2,
  FRAME_FONT_FAMILY,
  FRAME_TYPOGRAPHY,
  FRAME_SPACING,
  FRAME_COLORS,
  SHARED_COLORS,
  TIER_COLORS,
  buildIdentityDisplay,
  buildFooterText,
  buildBackgroundGradient,
  buildBoxShadow,
  buildOverlay,
  buildBorderEffect,
} from '@/lib/frame-design-system'
import { 
  calculateLevelProgress, 
  formatXp,
} from '@/lib/rank'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WIDTH = 600
const HEIGHT = 400 // 3:2 aspect ratio per Farcaster spec (matches badge frames)

/**
 * Phase 2 Task 1: Load font files for ImageResponse
 * Loads PixelifySans-Bold and Gmeow fonts from public/fonts/
 */
async function loadFonts() {
  try {
    const pixelifySansPath = join(process.cwd(), 'public', 'fonts', 'PixelifySans-Bold.ttf')
    const gmeowPath = join(process.cwd(), 'public', 'fonts', 'gmeow2.ttf')
    
    const [pixelifySansBuffer, gmeowBuffer] = await Promise.all([
      readFile(pixelifySansPath),
      readFile(gmeowPath),
    ])
    
    return [
      {
        name: 'PixelifySans',
        data: pixelifySansBuffer.buffer as ArrayBuffer,
        weight: 700 as const,
        style: 'normal' as const,
      },
      {
        name: 'Gmeow',
        data: gmeowBuffer.buffer as ArrayBuffer,
        weight: 400 as const,
        style: 'normal' as const,
      },
    ]
  } catch (err) {
    console.error('[Frame Image] Failed to load fonts:', err)
    return []
  }
}

/**
 * Load image from filesystem and convert to base64 data URL
 * This works in nodejs runtime (matches badge frame implementation)
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
    console.error(`[Frame Image] Failed to load ${relativePath}:`, err)
    return null
  }
}

/**
 * Load chain icon from external URL (Task 9: Chain Icon Integration)
 * Returns the icon URL for use in <img> src attribute
 */
async function loadChainIconData(chain: string): Promise<string | null> {
  try {
    const iconUrl = getChainIconUrl(chain)
    if (!iconUrl) return null
    return iconUrl
  } catch (err) {
    console.error(`[Frame Image] Failed to get chain icon for ${chain}:`, err)
    return null
  }
}

function readParam(url: URL, name: string, fallback = '') {
  const value = url.searchParams.get(name)
  if (!value) return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback
  const lower = trimmed.toLowerCase()
  if (lower === 'undefined' || lower === 'null') return fallback
  return trimmed
}

function shortenAddress(addr: string) {
  if (!addr) return ''
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

/**
 * Helper function to store ImageResponse in cache
 * Phase 1A: Automatically caches all generated frames
 */
async function cacheImageResponse(
  imageResponse: Response,
  cacheKey: FrameCacheKey,
  startTime: number
): Promise<Response> {
  try {
    // Clone the response so we can read the body
    const clonedResponse = imageResponse.clone()
    const arrayBuffer = await clonedResponse.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)

    // CRITICAL: Must await cache write in serverless environment
    // Serverless functions can terminate before async operations complete
    // This ensures cache SET completes before function exits
    try {
      await setCachedFrame(cacheKey, imageBuffer, 300)
    } catch (err) {
      console.error('[Frame Image] Failed to cache frame:', err)
    }

    const renderTime = Date.now() - startTime
    console.log(`[Frame Image] Generated ${cacheKey.type} frame (${renderTime}ms) - FID:${cacheKey.fid} - Tier:${cacheKey.tier}`)

    // Return original response with cache headers
    // CRITICAL: Set Cache-Control to no-cache for MISS to prevent Vercel CDN from caching MISS responses
    // This allows subsequent requests to hit our Redis cache instead of serving stale MISS headers
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=0, s-maxage=300, must-revalidate',
        'X-Cache-Status': 'MISS',
        'X-Render-Time': `${renderTime}ms`,
      },
    })
  } catch (err) {
    console.error('[Frame Image] Failed to cache:', err)
    return imageResponse
  }
}

export async function GET(req: Request) {
  const startTime = Date.now()
  const url = new URL(req.url)
  const type = readParam(url, 'type', 'onchainstats')
  const chain = readParam(url, 'chainName', readParam(url, 'chain', 'Base'))
  const user = readParam(url, 'user')
  const fid = readParam(url, 'fid')

  // Phase 2 Task 1: Load fonts once for all frames
  const fonts = await loadFonts()

  // Build cache key from query parameters
  const cacheParams: Record<string, string> = {}
  for (const [key, value] of url.searchParams.entries()) {
    cacheParams[key] = value
  }

  const fidNum = fid ? parseInt(fid, 10) : null
  const validFid = fidNum && Number.isFinite(fidNum) && fidNum > 0 ? fidNum : null

  // Fetch Neynar score and calculate tier for rarity system (Phase 0)
  let tierInfo: TierInfo | null = null
  if (validFid) {
    try {
      const userData = await fetchUserByFid(validFid)
      tierInfo = calculateTier(userData?.neynarScore)
      console.log(`[Frame Image] FID ${validFid} → Score ${userData?.neynarScore} → Tier ${tierInfo.tier}`)
    } catch (err) {
      console.warn('[Frame Image] Failed to fetch Neynar score:', err)
      // Continue without tier styling if fetch fails
    }
  }

  // Phase 1A: Check cache before generating image
  const cacheKey: FrameCacheKey = {
    type,
    fid: validFid,
    tier: tierInfo?.tier || null,
    params: cacheParams,
  }

  const cachedImage = await getCachedFrame(cacheKey)
  if (cachedImage) {
    const renderTime = Date.now() - startTime
    console.log(`[Frame Image] Cache HIT (${renderTime}ms) - ${type} - FID:${validFid} - Tier:${tierInfo?.tier || 'none'}`)
    return new Response(new Uint8Array(cachedImage), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 minutes
        'X-Cache-Status': 'HIT',
        'X-Render-Time': `${renderTime}ms`,
      },
    })
  }

  console.log(`[Frame Image] Cache MISS - Generating ${type} frame...`)

  // Load og-image.png background (matches badge frame implementation)
  const ogImageData = await loadImageAsDataUrl('og-image.png')
  
  // Task 9: Load chain icon for header display
  const chainIconData = await loadChainIconData(chain)

  // GM frame type - Yu-Gi-Oh! Card Structure
  if (type === 'gm') {
    const gmCount = readParam(url, 'gmCount', '0')
    const streak = readParam(url, 'streak', '0')
    const rank = readParam(url, 'rank', '—')
    // Phase 1F: Read username and displayName for proper identity display
    const username = readParam(url, 'username', '')
    const displayName = readParam(url, 'displayName', '')

    // Use tier colors if available, otherwise default GM colors from design system
    const gmPalette = tierInfo ? {
      start: tierInfo.colors.gradient.start,
      end: tierInfo.colors.gradient.end
    } : {
      start: FRAME_COLORS.gm.primary,
      end: FRAME_COLORS.gm.secondary
    }

    const borderColor = tierInfo?.colors.primary || gmPalette.start
    const glowColor = tierInfo?.colors.glow || `${gmPalette.start}90`
    const borderWidth = tierInfo?.borderStyle.width || 4

    const gmResponse = new ImageResponse(
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
          {/* Background: og-image.png or gradient fallback */}
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
                background: 'linear-gradient(135deg, #0a0a0a 0%, #2a1a0a 30%, #1f0f0a 60%, #0a0a0a 100%)',
              }}
            />
          )}

          {/* Yu-Gi-Oh! Card Container */}
          <div
            style={{
              width: 540,
              height: 360,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(15, 15, 17, 0.75) 0%, rgba(10, 10, 12, 0.85) 100%)',
              border: `${borderWidth}px solid ${borderColor}`,
              borderRadius: 12,
              boxShadow: `0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 40px ${glowColor}, 0 10px 50px rgba(0, 0, 0, 0.8)`,
              padding: FRAME_SPACING.container,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Holographic shine */}
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '30%',
                background: `linear-gradient(180deg, ${gmPalette.start}15, transparent 100%)`,
              }}
            />

            {/* Tier label (top-right badge) */}
            {tierInfo && (
              <div
                style={{
                  display: 'flex',
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  padding: FRAME_SPACING.padding.minimal,
                  background: `linear-gradient(135deg, ${tierInfo.colors.gradient.start}, ${tierInfo.colors.gradient.end})`,
                  border: `2px solid ${tierInfo.colors.primary}`,
                  borderRadius: 999,
                  fontFamily: FRAME_FONT_FAMILY.display,
                  fontSize: FRAME_FONTS_V2.micro,
                  fontWeight: 800,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                  boxShadow: `0 0 12px ${tierInfo.colors.glow}`,
                  textTransform: 'uppercase',
                }}
              >
                {formatTierLabel(tierInfo)}
              </div>
            )}

            {/* Header with GM badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: FRAME_SPACING.margin.header,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: FRAME_SPACING.padding.small,
                  background: `linear-gradient(135deg, ${gmPalette.start}, ${gmPalette.end})`,
                  border: `2px solid ${gmPalette.start}`,
                  borderRadius: 999,
                  fontFamily: FRAME_FONT_FAMILY.display,
                  fontSize: FRAME_FONTS_V2.caption,
                  fontWeight: 700,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                  color: SHARED_COLORS.white,
                  textShadow: FRAME_TYPOGRAPHY.textShadow.strong,
                }}
              >
                GM
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: FRAME_SPACING.section.tight,
                  fontFamily: FRAME_FONT_FAMILY.body,
                  fontSize: FRAME_FONTS_V2.caption,
                  fontWeight: 600,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                  color: 'rgba(255, 255, 255, 0.85)',
                }}
              >
                {chainIconData && (
                  <img src={chainIconData} alt="" style={{ width: 16, height: 16, borderRadius: 999 }} />
                )}
                {chain}
              </div>
            </div>

            {/* Identity Header - Prominent (Task 5: Phase 1F redesign) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: FRAME_SPACING.margin.section,
                padding: FRAME_SPACING.padding.medium,
                background: `linear-gradient(135deg, ${gmPalette.start}20, ${gmPalette.end}15)`,
                borderRadius: 8,
                border: `2px solid ${gmPalette.start}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontFamily: FRAME_FONT_FAMILY.display,
                  fontSize: FRAME_FONTS_V2.h3,
                  fontWeight: 900,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                  lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                  color: SHARED_COLORS.white,
                  textShadow: FRAME_TYPOGRAPHY.textShadow.glow(gmPalette.start),
                }}
              >
                {buildIdentityDisplay({ username, displayName, address: user, fid: fid ? parseInt(fid) : null })}
              </div>
            </div>

            {/* Streak Badge - Prominent if >= 7 days (Task 5: Phase 1F) */}
            {parseInt(streak) >= 7 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: FRAME_SPACING.margin.header,
                  padding: FRAME_SPACING.padding.large,
                  background: `linear-gradient(135deg, ${gmPalette.start}, ${gmPalette.end})`,
                  borderRadius: 12,
                  border: `3px solid ${gmPalette.start}`,
                  boxShadow: `0 4px 16px ${gmPalette.start}80`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: FRAME_SPACING.section.small,
                    fontFamily: FRAME_FONT_FAMILY.display,
                    fontSize: FRAME_FONTS_V2.h2,
                    fontWeight: 900,
                    letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                    lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                    color: SHARED_COLORS.white,
                    textShadow: FRAME_TYPOGRAPHY.textShadow.strong,
                  }}
                >
                  🔥 {streak}-Day Streak
                </div>
              </div>
            )}

            {/* Main Stats Grid - 2 columns (Task 5: Phase 1F redesign) */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                gap: FRAME_SPACING.section.medium,
              }}
            >
              {/* Left Column: GM Stats */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: FRAME_SPACING.section.small,
                  padding: FRAME_SPACING.section.medium,
                  background: 'rgba(30, 30, 32, 0.6)',
                  border: `2px solid ${gmPalette.start}`,
                  borderRadius: 10,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 60,
                    marginBottom: FRAME_SPACING.section.inline,
                  }}
                >
                  ☀️
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: FRAME_SPACING.section.inline }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7, textTransform: 'uppercase' }}>Total GMs</span>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.h3, fontWeight: 900, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight, color: gmPalette.start }}>{gmCount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7, textTransform: 'uppercase' }}>Streak</span>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.h3, fontWeight: 900, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight, color: gmPalette.start }}>🔥 {streak}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7, textTransform: 'uppercase' }}>Rank</span>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.h3, fontWeight: 800, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight, color: gmPalette.start}}>#{rank}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Milestones */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: FRAME_SPACING.section.small,
                  padding: FRAME_SPACING.section.medium,
                  background: 'rgba(30, 30, 32, 0.6)',
                  border: `2px solid ${gmPalette.start}40`,
                  borderRadius: 10,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontFamily: FRAME_FONT_FAMILY.body,
                    fontSize: FRAME_FONTS_V2.label,
                    fontWeight: 700,
                    letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                    opacity: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: FRAME_SPACING.section.minimal,
                  }}
                >
                  Milestones
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: FRAME_SPACING.section.small }}>
                  {parseInt(streak) >= 30 ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: FRAME_SPACING.section.inline,
                        padding: FRAME_SPACING.padding.stat,
                        background: `linear-gradient(135deg, ${gmPalette.start}30, ${gmPalette.end}20)`,
                        borderRadius: 8,
                        border: `2px solid ${gmPalette.start}`,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>👑</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: FRAME_SPACING.section.minimal }}>
                        <span style={{ fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.caption, fontWeight: 800, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, color: gmPalette.start }}>Legendary</span>
                        <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal, opacity: 0.7 }}>30+ day streak!</span>
                      </div>
                    </div>
                  ) : parseInt(streak) >= 7 ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: FRAME_SPACING.section.inline,
                        padding: FRAME_SPACING.padding.stat,
                        background: `linear-gradient(135deg, ${gmPalette.start}30, ${gmPalette.end}20)`,
                        borderRadius: 8,
                        border: `2px solid ${gmPalette.start}`,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>⚡</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: FRAME_SPACING.section.minimal }}>
                        <span style={{ fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.caption, fontWeight: 800, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, color: gmPalette.start }}>Week Warrior</span>
                        <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal, opacity: 0.7 }}>{30 - parseInt(streak)} to Legend</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: FRAME_SPACING.section.inline,
                        padding: FRAME_SPACING.padding.stat,
                        background: 'rgba(30, 30, 32, 0.4)',
                        borderRadius: 8,
                        border: '1px dashed rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <span style={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.75)' }}>🎯</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: FRAME_SPACING.section.minimal }}>
                        <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 700, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: 'rgba(255, 255, 255, 0.85)' }}>Week Warrior</span>
                        <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal, color: 'rgba(255, 255, 255, 0.75)' }}>{7 - parseInt(streak)} days away</span>
                      </div>
                    </div>
                  )}
                  {parseInt(gmCount) >= 100 ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: FRAME_SPACING.section.inline,
                        padding: FRAME_SPACING.padding.stat,
                        background: `linear-gradient(135deg, ${gmPalette.start}30, ${gmPalette.end}20)`,
                        borderRadius: 8,
                        border: `2px solid ${gmPalette.start}`,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>💯</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: FRAME_SPACING.section.minimal }}>
                        <span style={{ fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.caption, fontWeight: 800, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, color: gmPalette.start }}>Century Club</span>
                        <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal, opacity: 0.7 }}>100+ GMs!</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: FRAME_SPACING.section.inline,
                        padding: FRAME_SPACING.padding.stat,
                        background: 'rgba(30, 30, 32, 0.4)',
                        borderRadius: 8,
                        border: '1px dashed rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <span style={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.75)' }}>💯</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: FRAME_SPACING.section.minimal }}>
                        <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 700, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: 'rgba(255, 255, 255, 0.85)' }}>Century Club</span>
                        <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal, color: 'rgba(255, 255, 255, 0.75)' }}>{100 - parseInt(gmCount)} GMs away</span>
                      </div>
                    </div>
                  )}
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
              {buildFooterText('gm', chain)}
            </div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts,
      }
    )
    return cacheImageResponse(gmResponse, cacheKey, startTime)
  }

  // Guild frame type - Yu-Gi-Oh! Card Structure
  if (type === 'guild') {
    const username = readParam(url, 'username', '')
    const displayName = readParam(url, 'displayName', '')
    const guildId = readParam(url, 'guildId')
    const guildName = readParam(url, 'guildName', `Guild #${guildId}`)
    const members = readParam(url, 'members', '0')
    const quests = readParam(url, 'quests', '0')
    const level = readParam(url, 'level', '1')

    const guildPalette = {
      start: FRAME_COLORS.guild.primary,
      end: FRAME_COLORS.guild.secondary
    }

    const guildResponse = new ImageResponse(
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
          {/* Background: og-image.png or gradient fallback */}
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
                background: 'linear-gradient(135deg, #0a0a0a 0%, #0a1a2a 30%, #0a1f2f 60%, #0a0a0a 100%)',
              }}
            />
          )}

          {/* Yu-Gi-Oh! Card Container */}
          <div
            style={{
              width: 540,
              height: 360,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(15, 15, 17, 0.75) 0%, rgba(10, 10, 12, 0.85) 100%)',
              border: `4px solid ${guildPalette.start}`,
              borderRadius: 12,
              boxShadow: `0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 40px ${guildPalette.start}90, 0 10px 50px rgba(0, 0, 0, 0.8)`,
              padding: FRAME_SPACING.container,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Holographic shine */}
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '30%',
                background: `linear-gradient(180deg, ${guildPalette.start}15, transparent 100%)`,
              }}
            />

            {/* Header with GUILD badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: FRAME_SPACING.margin.header,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: FRAME_SPACING.padding.small,
                  background: `linear-gradient(135deg, ${guildPalette.start}, ${guildPalette.end})`,
                  border: `2px solid ${guildPalette.start}`,
                  borderRadius: 999,
                  fontFamily: FRAME_FONT_FAMILY.display,
                  fontSize: FRAME_FONTS_V2.caption,
                  fontWeight: 700,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                }}
              >  
                GUILD
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
                {chainIconData && (
                  <img src={chainIconData} alt="" style={{ width: 16, height: 16, borderRadius: 999 }} />
                )}
                {chain}
              </div>
            </div>

            {/* Main content area */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                gap: FRAME_SPACING.section.large,
              }}
            >
              {/* Left: Guild icon + User Info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: FRAME_SPACING.section.small,
                }}
              >
                {/* Guild Icon */}
                <div
                  style={{
                    width: 180,
                    height: 180,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${guildPalette.start}, ${guildPalette.end})`,
                    border: `3px solid ${guildPalette.start}`,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FRAME_FONT_FAMILY.display,
                    fontSize: 100,
                  }}
                >
                  🛡️
                </div>

                {/* User info below icon */}
                {(username || displayName || user || fid) && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: FRAME_SPACING.section.tight,
                      padding: FRAME_SPACING.padding.box,
                      background: `linear-gradient(135deg, ${guildPalette.start}30, ${guildPalette.end}25)`,
                      borderRadius: 8,
                      border: `2px solid ${guildPalette.start}`,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.body, fontWeight: 800, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight, color: SHARED_COLORS.white, textShadow: FRAME_TYPOGRAPHY.textShadow.subtle }}>
                      {buildIdentityDisplay({ username, displayName, address: user, fid: fid ? parseInt(fid) : null })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Guild details */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: SHARED_COLORS.white,
                }}
              >
                {/* Guild name - More prominent */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: FRAME_SPACING.section.medium,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontFamily: FRAME_FONT_FAMILY.display,
                      fontSize: FRAME_FONTS_V2.h1,
                      fontWeight: 900,
                      letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                      lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                      color: SHARED_COLORS.white,
                      textShadow: FRAME_TYPOGRAPHY.textShadow.glow(guildPalette.start),
                    }}
                  >
                    {guildName}
                  </div>

                  {/* Stats box */}
                  <div
                    style={{
                      marginTop: FRAME_SPACING.section.small,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: FRAME_SPACING.section.small,
                      background: 'rgba(30, 30, 32, 0.6)',
                      border: `1px solid ${guildPalette.start}`,
                      borderRadius: 8,
                      opacity: 0.8,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      gap: FRAME_SPACING.section.inline,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.label, fontWeight: 700 }}>
                      <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>MEMBERS:</span>
                      <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, color: guildPalette.start }}>{members} 👥</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.label, fontWeight: 700 }}>
                      <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: 'rgba(255, 255, 255, 0.85)' }}>QUESTS:</span>
                      <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: guildPalette.start }}>{quests} active</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600 }}>
                      <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: 'rgba(255, 255, 255, 0.85)' }}>Level:</span>
                      <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.9 }}>{level}</span>
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
              {buildFooterText('guild', `Guild #${guildId}`)}
            </div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts,
      }
    )
    return cacheImageResponse(guildResponse, cacheKey, startTime)
  }

  // Verify frame type - Yu-Gi-Oh! Card Structure
  if (type === 'verify') {
    const username = readParam(url, 'username', '')
    const displayName = readParam(url, 'displayName', '')
    const questId = readParam(url, 'questId')
    const questName = readParam(url, 'questName', 'Verification')
    const status = readParam(url, 'status', 'Pending')

    const verifyPalette = {
      start: FRAME_COLORS.verify.primary,
      end: FRAME_COLORS.verify.secondary
    }

    const verifyResponse = new ImageResponse(
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
          {/* Background: og-image.png or gradient fallback */}
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
                background: 'linear-gradient(135deg, #0a0a0a 0%, #0a2a0a 30%, #0a1f0a 60%, #0a0a0a 100%)',
              }}
            />
          )}

          {/* Yu-Gi-Oh! Card Container */}
          <div
            style={{
              width: 540,
              height: 360,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(15, 15, 17, 0.75) 0%, rgba(10, 10, 12, 0.85) 100%)',
              border: `4px solid ${verifyPalette.start}`,
              borderRadius: 12,
              boxShadow: `0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 40px ${verifyPalette.start}90, 0 10px 50px rgba(0, 0, 0, 0.8)`,
              padding: FRAME_SPACING.container,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Holographic shine */}
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '30%',
                background: `linear-gradient(180deg, ${verifyPalette.start}15, transparent 100%)`,
              }}
            />

            {/* Header with VERIFY badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: FRAME_SPACING.margin.header,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: FRAME_SPACING.padding.small,
                  background: `linear-gradient(135deg, ${verifyPalette.start}, ${verifyPalette.end})`,
                  border: `2px solid ${verifyPalette.start}`,
                  borderRadius: 999,
                  fontFamily: FRAME_FONT_FAMILY.display,
                  fontSize: FRAME_FONTS_V2.caption,
                  fontWeight: 700,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                  color: SHARED_COLORS.white,
                  textShadow: FRAME_TYPOGRAPHY.textShadow.strong,
                }}
              >
                VERIFY
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
                {chainIconData && (
                  <img src={chainIconData} alt="" style={{ width: 16, height: 16, borderRadius: 999 }} />
                )}
                {chain}
              </div>
            </div>

            {/* Main content area */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                gap: FRAME_SPACING.section.large,
              }}
            >
              {/* Left: Verify icon + User Info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: FRAME_SPACING.section.small,
                }}
              >
                {/* Verify Icon */}
                <div
                  style={{
                    width: 180,
                    height: 180,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${verifyPalette.start}, ${verifyPalette.end})`,
                    border: `3px solid ${verifyPalette.start}`,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FRAME_FONT_FAMILY.display,
                    fontSize: 100,
                  }}
                >
                  ✅
                </div>

                {/* User info below icon */}
                {(username || displayName || user || fid) && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: FRAME_SPACING.section.tight,
                      padding: FRAME_SPACING.padding.box,
                      background: `linear-gradient(135deg, ${verifyPalette.start}30, ${verifyPalette.end}25)`,
                      borderRadius: 8,
                      border: `2px solid ${verifyPalette.start}`,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.body, fontWeight: 800, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight, color: SHARED_COLORS.white, textShadow: FRAME_TYPOGRAPHY.textShadow.subtle }}>
                      {buildIdentityDisplay({ username, displayName, address: user, fid: fid ? parseInt(fid) : null })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Verification details */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: SHARED_COLORS.white,
                }}
              >
                {/* Title - More prominent */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: FRAME_SPACING.section.medium,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontFamily: FRAME_FONT_FAMILY.display,
                      fontSize: FRAME_FONTS_V2.h1,
                      fontWeight: 900,
                      letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                      lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                      color: SHARED_COLORS.white,
                      textShadow: FRAME_TYPOGRAPHY.textShadow.glow(verifyPalette.start),
                    }}
                  >
                    {questName}
                  </div>

                  {/* Verification info box */}
                  <div
                    style={{
                      marginTop: FRAME_SPACING.section.small,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: FRAME_SPACING.section.small,
                      background: 'rgba(30, 30, 32, 0.6)',
                      border: `1px solid ${verifyPalette.start}`,
                      borderRadius: 8,
                      opacity: 0.8,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      gap: FRAME_SPACING.section.inline,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.label, fontWeight: 700 }}>
                      <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>STATUS:</span>
                      <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: verifyPalette.start }}>{status}</span>
                    </div>
                    {questId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600 }}>
                        <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: 'rgba(255, 255, 255, 0.85)' }}>Quest:</span>
                        <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.9 }}>#{questId}</span>
                      </div>
                    )}
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
              {buildFooterText('verify')}
            </div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts,
      }
    )
    return cacheImageResponse(verifyResponse, cacheKey, startTime)
  }

  // Quest frame type - Yu-Gi-Oh! Card Structure (matches badge frames)
  if (type === 'quest') {
    const questId = readParam(url, 'questId')
    const questName = readParam(url, 'questName', `Quest #${questId}`)
    const reward = readParam(url, 'reward', '15')
    const expires = readParam(url, 'expires', '—')
    const slotsLeft = readParam(url, 'slotsLeft', '—')
    const progress = readParam(url, 'progress', '0')
    // Phase 1F: Read username for identity display
    const username = readParam(url, 'username', '')
    const displayName = readParam(url, 'displayName', '')
    const questFid = readParam(url, 'fid', '')
    
    const questPalette = {
      start: FRAME_COLORS.quest.primary,
      end: FRAME_COLORS.quest.secondary
    }

    const questResponse = new ImageResponse(
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
          {/* Background: og-image.png or gradient fallback */}
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
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2a 30%, #0f0f1f 60%, #0a0a0a 100%)',
              }}
            />
          )}

          {/* Yu-Gi-Oh! Card Container */}
          <div
            style={{
              width: 540,
              height: 360,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(15, 15, 17, 0.75) 0%, rgba(10, 10, 12, 0.85) 100%)',
              border: `4px solid ${questPalette.start}`,
              borderRadius: 12,
              boxShadow: `0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 40px ${questPalette.start}90, 0 10px 50px rgba(0, 0, 0, 0.8)`,
              padding: FRAME_SPACING.container,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Holographic shine */}
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '30%',
                background: `linear-gradient(180deg, ${questPalette.start}15, transparent 100%)`,
              }}
            />

            {/* Header with QUEST badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: FRAME_SPACING.margin.header,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: FRAME_SPACING.padding.small,
                  background: `linear-gradient(135deg, ${questPalette.start}, ${questPalette.end})`,
                  border: `2px solid ${questPalette.start}`,
                  borderRadius: 999,
                  fontFamily: FRAME_FONT_FAMILY.display,
                  fontSize: FRAME_FONTS_V2.caption,
                  fontWeight: 700,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                }}
              >
                QUEST
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
                {chainIconData && (
                  <img src={chainIconData} alt="" style={{ width: 16, height: 16, borderRadius: 999 }} />
                )}
                {chain}
              </div>
            </div>

            {/* Main content area */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                gap: FRAME_SPACING.section.large,
              }}
            >
              {/* Left: Quest icon + User Info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: FRAME_SPACING.section.small,
                }}
              >
                {/* Quest Icon */}
                <div
                  style={{
                    width: 180,
                    height: 180,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${questPalette.start}, ${questPalette.end})`,
                    border: `3px solid ${questPalette.start}`,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FRAME_FONT_FAMILY.display,
                    fontSize: 80,
                  }}
                >
                  🎯
                </div>

                {/* User info below icon */}
                {(username || displayName || user || questFid || fid) && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: FRAME_SPACING.section.tight,
                      padding: FRAME_SPACING.padding.box,
                      background: `linear-gradient(135deg, ${questPalette.start}30, ${questPalette.end}25)`,
                      borderRadius: 8,
                      border: `2px solid ${questPalette.start}`,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.body, fontWeight: 800, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight, color: SHARED_COLORS.white, textShadow: FRAME_TYPOGRAPHY.textShadow.subtle }}>
                      {buildIdentityDisplay({ username, displayName, address: user, fid: questFid ? parseInt(questFid) : (fid ? parseInt(fid) : null) })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Quest details */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: SHARED_COLORS.white,
                }}
              >
                {/* Quest name - More prominent */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: FRAME_SPACING.section.medium,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontFamily: FRAME_FONT_FAMILY.display,
                      fontSize: FRAME_FONTS_V2.h1,
                      fontWeight: 900,
                      letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                      lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                      color: SHARED_COLORS.white,
                      textShadow: FRAME_TYPOGRAPHY.textShadow.glow(questPalette.start),
                    }}
                  >
                    {questName}
                  </div>

                  {/* Description box with stats */}
                  <div
                    style={{
                      marginTop: FRAME_SPACING.section.small,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: FRAME_SPACING.section.small,
                      background: 'rgba(30, 30, 32, 0.6)',
                      border: `1px solid ${questPalette.start}`,
                      borderRadius: 8,
                      opacity: 0.8,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      gap: FRAME_SPACING.section.inline,
                    }}
                  >
                    {/* Task 10: XP Reward Badge - Prominent display */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: FRAME_SPACING.padding.box,
                        background: `linear-gradient(135deg, ${questPalette.start}, ${questPalette.end})`,
                        borderRadius: 8,
                        boxShadow: `0 0 12px ${questPalette.start}60`,
                      }}
                    >
                      <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.9 }}>
                        COMPLETE FOR
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          fontFamily: FRAME_FONT_FAMILY.display,
                          fontSize: FRAME_FONTS_V2.h2,
                          fontWeight: 900,
                          letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                          lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                          color: SHARED_COLORS.white,
                          textShadow: FRAME_TYPOGRAPHY.textShadow.strong,
                        }}
                      >
                        +{reward} XP
                      </div>
                    </div>
                    {slotsLeft !== '—' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.label, fontWeight: 700 }}>
                        <div style={{ display: 'flex', letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, color: 'rgba(255, 255, 255, 0.85)' }}>SLOTS:</div>
                        <div style={{ display: 'flex', letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: questPalette.start }}>{slotsLeft} left</div>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600 }}>
                      <div style={{ display: 'flex', letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: 'rgba(255, 255, 255, 0.85)' }}>Expires:</div>
                      <div style={{ display: 'flex', letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.9 }}>{expires}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer: Powered by */}
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
              {buildFooterText('quest', `Quest #${questId}`)}
            </div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts,
      }
    )
    return cacheImageResponse(questResponse, cacheKey, startTime)
  }

  // OnchainStats frame type - Yu-Gi-Oh! Card Structure
  if (type === 'onchainstats') {
    // Read all onchain stats parameters passed from frame route
    const username = readParam(url, 'username', '')
    const displayName = readParam(url, 'displayName', '')
    const txs = readParam(url, 'txs', '0')
    const contracts = readParam(url, 'contracts', '0')
    const volume = readParam(url, 'volume', '0.00 ETH')
    const balance = readParam(url, 'balance', '0.00 ETH')
    const age = readParam(url, 'age', '—')
    const builder = readParam(url, 'builder', '—')
    const neynar = readParam(url, 'neynar', '—')
    const power = readParam(url, 'power', '—')
    const firstTx = readParam(url, 'firstTx', '—')
    const lastTx = readParam(url, 'lastTx', '—')
    const address = readParam(url, 'user', user)
    
    // Determine identity to display (priority: @username > displayName > address > FID)
    const identity = username 
      ? `@${username}` 
      : displayName 
        ? displayName 
        : address 
          ? shortenAddress(address) 
          : fid 
            ? `FID ${fid}` 
            : 'Anonymous'
    
    // Check if power badge should be shown
    const hasPower = power && power.toLowerCase() !== '—' && power.toLowerCase() !== 'no'

    const statsPalette = {
      start: FRAME_COLORS.onchainstats.primary,
      end: FRAME_COLORS.onchainstats.secondary
    }

    const onchainstatsResponse = new ImageResponse(
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
          {/* Background: og-image.png or gradient fallback */}
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
                background: 'linear-gradient(135deg, #0a0a0a 0%, #0a1a2a 30%, #0a1f1f 60%, #0a0a0a 100%)',
              }}
            />
          )}

          {/* Yu-Gi-Oh! Card Container */}
          <div
            style={{
              width: 540,
              height: 360,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(15, 15, 17, 0.75) 0%, rgba(10, 10, 12, 0.85) 100%)',
              border: `4px solid ${statsPalette.start}`,
              borderRadius: 12,
              boxShadow: `0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 40px ${statsPalette.start}90, 0 10px 50px rgba(0, 0, 0, 0.8)`,
              padding: FRAME_SPACING.container,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Holographic shine */}
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '30%',
                background: `linear-gradient(180deg, ${statsPalette.start}15, transparent 100%)`,
              }}
            />

            {/* Header with ONCHAIN badge and Power Badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: FRAME_SPACING.margin.header,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: FRAME_SPACING.padding.small,
                  background: `linear-gradient(135deg, ${statsPalette.start}, ${statsPalette.end})`,
                  border: `2px solid ${statsPalette.start}`,
                  borderRadius: 999,
                  fontFamily: FRAME_FONT_FAMILY.display,
                  fontSize: FRAME_FONTS_V2.caption,
                  fontWeight: 700,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                }}
              >
                ONCHAIN
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: FRAME_SPACING.section.inline,
                  alignItems: 'center',
                }}
              >
                {hasPower && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: FRAME_SPACING.padding.minimal,
                      background: `linear-gradient(135deg, ${SHARED_COLORS.gold}, #FFA500)`,
                      border: `2px solid ${SHARED_COLORS.gold}`,
                      borderRadius: 999,
                      fontFamily: FRAME_FONT_FAMILY.display,
                      fontSize: FRAME_FONTS_V2.micro,
                      fontWeight: 800,
                      letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                      boxShadow: '0 0 12px rgba(255, 215, 0, 0.6)',
                    }}
                  >
                    ⚡ POWER
                  </div>
                )}
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
                  {chainIconData && (
                    <img src={chainIconData} alt="" style={{ width: 16, height: 16, borderRadius: 999 }} />
                  )}
                  {chain}
                </div>
              </div>
            </div>

            {/* Identity Header - Prominent */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: FRAME_SPACING.margin.section,
                padding: FRAME_SPACING.padding.medium,
                background: `linear-gradient(135deg, ${statsPalette.start}20, ${statsPalette.end}15)`,
                borderRadius: 8,
                border: `2px solid ${statsPalette.start}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontFamily: FRAME_FONT_FAMILY.display,
                  fontSize: FRAME_FONTS_V2.h3,
                  fontWeight: 900,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                  lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                  color: SHARED_COLORS.white,
                  textShadow: FRAME_TYPOGRAPHY.textShadow.glow(statsPalette.start),
                }}
              >
                {identity}
              </div>
            </div>

            {/* Main Stats Grid - 2 columns */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                gap: FRAME_SPACING.section.medium,
              }}
            >
              {/* Left Column */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: FRAME_SPACING.section.small,
                  padding: FRAME_SPACING.section.medium,
                  background: 'rgba(30, 30, 32, 0.6)',
                  border: `2px solid ${statsPalette.start}`,
                  borderRadius: 10,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
              >
                {/* Primary Stats - Large and prominent */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: FRAME_SPACING.section.inline }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7, textTransform: 'uppercase' }}>Transactions</span>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.body, fontWeight: 900, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight, color: statsPalette.start }}>{txs}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7, textTransform: 'uppercase' }}>Contracts</span>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.body, fontWeight: 900, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight, color: statsPalette.start }}>{contracts}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7, textTransform: 'uppercase' }}>Volume</span>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.body, fontWeight: 800, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight, color: statsPalette.start }}>{volume}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7, textTransform: 'uppercase' }}>Balance</span>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.body, fontWeight: 800, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight, color: statsPalette.start }}>{balance}</span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: `${statsPalette.start}40`, margin: '4px 0' }} />

                {/* Secondary Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: FRAME_SPACING.section.tight }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: 'rgba(255, 255, 255, 0.85)' }}>Age</span>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 700, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.9 }}>{age}</span>
                  </div>
                  {firstTx !== '—' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: 'rgba(255, 255, 255, 0.85)' }}>First TX</span>
                      <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 700, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.9 }}>{firstTx}</span>
                    </div>
                  )}
                  {lastTx !== '—' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: 'rgba(255, 255, 255, 0.85)' }}>Last TX</span>
                      <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 700, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.9 }}>{lastTx}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Scores & Reputation */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: FRAME_SPACING.section.small,
                  padding: FRAME_SPACING.section.medium,
                  background: 'rgba(30, 30, 32, 0.6)',
                  border: `2px solid ${statsPalette.start}`,
                  borderRadius: 10,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontFamily: FRAME_FONT_FAMILY.display,
                    fontSize: FRAME_FONTS_V2.body,
                    fontWeight: 800,
                    letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                    lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                    color: SHARED_COLORS.white,
                    marginBottom: FRAME_SPACING.section.tight,
                    textShadow: FRAME_TYPOGRAPHY.textShadow.subtle,
                  }}
                >
                  Reputation
                </div>

                {/* Builder Score - Highlighted */}
                {builder !== '—' && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: FRAME_SPACING.section.minimal,
                      padding: FRAME_SPACING.section.small,
                      background: `linear-gradient(135deg, ${statsPalette.start}25, ${statsPalette.end}20)`,
                      borderRadius: 8,
                      border: `1px solid ${statsPalette.start}`,
                    }}
                  >
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7, textTransform: 'uppercase' }}>Builder Score</span>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.h3, fontWeight: 900, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight, color: statsPalette.start }}>{builder}</span>
                  </div>
                )}

                {/* Neynar Score */}
                {neynar !== '—' && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: FRAME_SPACING.section.minimal,
                      padding: FRAME_SPACING.section.small,
                      background: `linear-gradient(135deg, ${statsPalette.start}25, ${statsPalette.end}20)`,
                      borderRadius: 8,
                      border: `1px solid ${statsPalette.start}`,
                    }}
                  >
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7, textTransform: 'uppercase' }}>Neynar Score</span>
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.h2, fontWeight: 900, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight, color: statsPalette.start }}>{neynar}</span>
                  </div>
                )}

                {/* Power Badge Info (if not shown in header) */}
                {!hasPower && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: FRAME_SPACING.section.tight,
                      padding: FRAME_SPACING.section.inline,
                      background: 'rgba(40, 40, 42, 0.5)',
                      borderRadius: 6,
                      color: 'rgba(255, 255, 255, 0.75)',
                    }}
                  >
                    <span style={{ fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal }}>⚪ No Power Badge</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: FRAME_SPACING.section.small,
                fontFamily: FRAME_FONT_FAMILY.body,
                fontSize: FRAME_FONTS_V2.micro,
                letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal,
                lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal,
                color: 'rgba(255, 255, 255, 0.85)',
              }}
            >
              {buildFooterText('onchainstats', chain)}
            </div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts,
      }
    )
    return cacheImageResponse(onchainstatsResponse, cacheKey, startTime)
  }

  // Leaderboards frame type - Yu-Gi-Oh! Card Structure
  if (type === 'leaderboards') {
    const season = readParam(url, 'season', 'Current Season')
    const limit = readParam(url, 'limit', '10')

    const leaderboardPalette = {
      start: FRAME_COLORS.leaderboards.primary,
      end: FRAME_COLORS.leaderboards.secondary
    }

    const leaderboardsResponse = new ImageResponse(
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
          {/* Background: og-image.png or gradient fallback */}
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
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2a 30%, #1f0f2f 60%, #0a0a0a 100%)',
              }}
            />
          )}

          {/* Yu-Gi-Oh! Card Container */}
          <div
            style={{
              width: 540,
              height: 360,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(15, 15, 17, 0.75) 0%, rgba(10, 10, 12, 0.85) 100%)',
              border: `4px solid ${leaderboardPalette.start}`,
              borderRadius: 12,
              boxShadow: `0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 40px ${leaderboardPalette.start}90, 0 10px 50px rgba(0, 0, 0, 0.8)`,
              padding: FRAME_SPACING.container,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Holographic shine */}
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '30%',
                background: `linear-gradient(180deg, ${leaderboardPalette.start}15, transparent 100%)`,
              }}
            />

            {/* Header with LEADERBOARD badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: FRAME_SPACING.margin.header,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: FRAME_SPACING.padding.small,
                  background: `linear-gradient(135deg, ${leaderboardPalette.start}, ${leaderboardPalette.end})`,
                  border: `2px solid ${leaderboardPalette.start}`,
                  borderRadius: 999,
                  fontFamily: FRAME_FONT_FAMILY.display,
                  fontSize: FRAME_FONTS_V2.caption,
                  fontWeight: 700,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                }}
              >
                LEADERBOARD
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
                {chainIconData && (
                  <img src={chainIconData} alt="" style={{ width: 16, height: 16, borderRadius: 999 }} />
                )}
                {chain}
              </div>
            </div>

            {/* Main content area */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                gap: FRAME_SPACING.section.large,
              }}
            >
              {/* Left: Trophy icon (no user info for leaderboards) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: FRAME_SPACING.section.small,
                }}
              >
                {/* Trophy Icon */}
                <div
                  style={{
                    width: 180,
                    height: 180,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${leaderboardPalette.start}, ${leaderboardPalette.end})`,
                    border: `3px solid ${leaderboardPalette.start}`,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FRAME_FONT_FAMILY.display,
                    fontSize: 100,
                  }}
                >
                  🏆
                </div>
              </div>

              {/* Right: Leaderboard info */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: SHARED_COLORS.white,
                }}
              >
                {/* Title - More prominent */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: FRAME_SPACING.section.medium,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontFamily: FRAME_FONT_FAMILY.display,
                      fontSize: FRAME_FONTS_V2.h1,
                      fontWeight: 900,
                      letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                      lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                      color: SHARED_COLORS.white,
                      textShadow: FRAME_TYPOGRAPHY.textShadow.glow(leaderboardPalette.start),
                    }}
                  >
                    Top Performers
                  </div>

                  {/* Info box */}
                  <div
                    style={{
                      marginTop: FRAME_SPACING.section.small,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: FRAME_SPACING.section.small,
                      background: 'rgba(30, 30, 32, 0.6)',
                      border: `1px solid ${leaderboardPalette.start}`,
                      borderRadius: 8,
                      opacity: 0.8,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      gap: FRAME_SPACING.section.inline,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.label, fontWeight: 700 }}>
                      <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>SEASON:</span>
                      <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: leaderboardPalette.start }}>{season}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.label, fontWeight: 700 }}>
                      <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>SHOWING:</span>
                      <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: leaderboardPalette.start }}>Top {limit}</span>
                    </div>
                    <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, lineHeight: FRAME_TYPOGRAPHY.lineHeight.normal, opacity: 0.7, marginTop: FRAME_SPACING.section.minimal }}>
                      GM Streaks • Quests • XP • Badges
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
              {buildFooterText('leaderboard', 'Multichain Rankings')}
            </div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts,
      }
    )
    return cacheImageResponse(leaderboardsResponse, cacheKey, startTime)
  }

  // Badge Collection Frame - Yu-Gi-Oh! Card Structure
  if (type === 'badge') {
    const username = readParam(url, 'username', '')
    const displayName = readParam(url, 'displayName', '')
    const earnedCount = readParam(url, 'earnedCount', '0')
    const eligibleCount = readParam(url, 'eligibleCount', '0')
    const address = readParam(url, 'address', user)
    // Task 10: Add XP from badges tracking
    const badgeXp = readParam(url, 'badgeXp', '0')
    // Phase 2.1 Task 2.1.1: Parse badge IDs and load actual badge images
    const earnedBadges = readParam(url, 'earnedBadges', '')
    const badgeIds = earnedBadges.split(',').filter(Boolean).slice(0, 9)
    
    // Badge metadata registry (inline for frame generation)
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
    
    // Load badge images asynchronously
    const badgeImages = await Promise.all(
      badgeIds.map(async (badgeId) => {
        const imgData = await loadImageAsDataUrl(`badges/${badgeId}.png`)
        return imgData || ''
      })
    )

    const badgePalette = {
      start: FRAME_COLORS.badge.primary,
      end: FRAME_COLORS.badge.secondary
    }

    const badgeResponse = new ImageResponse(
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
                {chainIconData && (
                  <img src={chainIconData} alt="" style={{ width: 16, height: 16, borderRadius: 999 }} />
                )}
                GMEOW
              </div>
            </div>

            {/* Main content area */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                gap: FRAME_SPACING.section.large,
              }}
            >
              {/* Left: Badge icon + user info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: FRAME_SPACING.section.small,
                }}
              >
                {/* Badge Icon - Phase 2.1 Task 2.1.1: Badge Collection Grid with Images (70x70) */}
                <div
                  style={{
                    width: 270,
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
                    // Show earned badges with images and names
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                      }}
                    >
                      {badgeIds.map((badgeId, i) => {
                        const badge = badgeRegistry[badgeId]
                        const tierColor = badge ? tierColors[badge.tier] : tierColors.common
                        
                        return (
                          <div
                            key={badgeId}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              width: 70,
                              padding: 4,
                              border: `2px solid ${tierColor}`,
                              borderRadius: 8,
                              background: 'rgba(255, 255, 255, 0.05)',
                            }}
                          >
                            {badgeImages[i] && (
                              <img
                                src={badgeImages[i]}
                                alt={badge?.name || 'Badge'}
                                width="70"
                                height="70"
                                style={{
                                  borderRadius: 6,
                                  objectFit: 'cover',
                                }}
                              />
                            )}
                            <div
                              style={{
                                fontSize: FRAME_FONTS_V2.micro,
                                fontWeight: 600,
                                color: SHARED_COLORS.white,
                                textAlign: 'center',
                                marginTop: 4,
                                maxWidth: 70,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {badge?.name || 'Unknown'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    // Show placeholder when no badges
                    <div style={{ fontSize: 70, opacity: 0.3 }}>🏅</div>
                  )}
                </div>

                {/* User info box */}
                <div
                  style={{
                    width: 120,
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
              </div>

              {/* Right: Badge stats */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: SHARED_COLORS.white,
                }}
              >
                {/* Title */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: FRAME_SPACING.section.medium,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontFamily: FRAME_FONT_FAMILY.display,
                      fontSize: FRAME_FONTS_V2.h1,
                      fontWeight: 900,
                      letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                      lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                      color: SHARED_COLORS.white,
                      textShadow: FRAME_TYPOGRAPHY.textShadow.glow(badgePalette.start),
                    }}
                  >
                    Badge Collection
                  </div>

                  {/* Stats grid */}
                  <div
                    style={{
                      marginTop: FRAME_SPACING.section.small,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: FRAME_SPACING.section.medium,
                    }}
                  >
                    {/* Row 1: Earned */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: FRAME_SPACING.section.medium,
                        background: 'rgba(30, 30, 32, 0.6)',
                        border: `1px solid ${badgePalette.start}`,
                        borderRadius: 8,
                        opacity: 0.9,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>
                        EARNED BADGES
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          fontFamily: FRAME_FONT_FAMILY.display,
                          fontSize: FRAME_FONTS_V2.h2,
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

                    {/* Row 2: Eligible */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: FRAME_SPACING.section.medium,
                        background: 'rgba(30, 30, 32, 0.6)',
                        border: `1px solid ${badgePalette.end}`,
                        borderRadius: 8,
                        opacity: 0.9,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>
                        ELIGIBLE FOR
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          fontFamily: FRAME_FONT_FAMILY.display,
                          fontSize: FRAME_FONTS_V2.h2,
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

                    {/* Task 10: Row 3: XP from Badges */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: FRAME_SPACING.section.small,
                        background: `linear-gradient(135deg, ${badgePalette.start}20, ${badgePalette.end}20)`,
                        border: `1px solid ${badgePalette.start}`,
                        borderRadius: 8,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.8, textAlign: 'center' }}>
                        TOTAL XP FROM BADGES
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
                        +{formatXp(parseInt(badgeXp, 10))} XP
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
        width: WIDTH,
        height: HEIGHT,
        fonts,
      }
    )
    return cacheImageResponse(badgeResponse, cacheKey, startTime)
  }

  // Points & XP Frame - Yu-Gi-Oh! Card Structure
  if (type === 'points') {
    const username = readParam(url, 'username', '')
    const displayName = readParam(url, 'displayName', '')
    const availablePoints = readParam(url, 'availablePoints', '0')
    const lockedPoints = readParam(url, 'lockedPoints', '0')
    const xp = readParam(url, 'xp', '0')
    const tier = readParam(url, 'tier', 'Beginner')
    const address = readParam(url, 'address', user)

    // Task 10: Calculate level and XP progression
    const totalXp = parseInt(xp, 10) || 0
    const levelProgress = calculateLevelProgress(totalXp)
    const xpPercent = Math.min(100, Math.max(0, Math.round(levelProgress.levelPercent * 100)))

    const pointsPalette = {
      start: FRAME_COLORS.points.primary,
      end: FRAME_COLORS.points.secondary
    }

    const pointsResponse = new ImageResponse(
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
                background: 'linear-gradient(135deg, #0a0a0a 0%, #0a1a1a 30%, #0a1a1f 60%, #0a0a0a 100%)',
              }}
            />
          )}

          {/* Points Card Container */}
          <div
            style={{
              width: 540,
              height: 360,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(15, 15, 17, 0.75) 0%, rgba(10, 10, 12, 0.85) 100%)',
              border: `4px solid ${pointsPalette.start}`,
              borderRadius: 12,
              boxShadow: `0 8px 32px rgba(16, 185, 129, 0.3), inset 0 0 0 1px rgba(6, 182, 212, 0.1)`,
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
                  background: `linear-gradient(135deg, ${pointsPalette.start}, ${pointsPalette.end})`,
                  border: `2px solid ${pointsPalette.start}`,
                  borderRadius: 999,
                  fontFamily: FRAME_FONT_FAMILY.display,
                  fontSize: FRAME_FONTS_V2.caption,
                  fontWeight: 700,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                }}
              >
                POINTS & XP
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
                {chainIconData && (
                  <img src={chainIconData} alt="" style={{ width: 16, height: 16, borderRadius: 999 }} />
                )}
                GMEOW
              </div>
            </div>

            {/* Main content area */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                gap: FRAME_SPACING.section.large,
              }}
            >
              {/* Left: Points icon + user info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: FRAME_SPACING.section.small,
                }}
              >
                {/* Points Icon */}
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${pointsPalette.start}, ${pointsPalette.end})`,
                    border: `3px solid ${pointsPalette.start}`,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FRAME_FONT_FAMILY.display,
                    fontSize: 70,
                  }}
                >
                  💰
                </div>

                {/* User info box */}
                <div
                  style={{
                    width: 120,
                    display: 'flex',
                    padding: FRAME_SPACING.section.inline,
                    background: 'rgba(30, 30, 32, 0.6)',
                    border: `1px solid ${pointsPalette.start}`,
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
              </div>

              {/* Right: Points stats */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: SHARED_COLORS.white,
                }}
              >
                {/* Title & Tier */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: FRAME_SPACING.section.medium,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontFamily: FRAME_FONT_FAMILY.display,
                      fontSize: FRAME_FONTS_V2.h1,
                      fontWeight: 900,
                      letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                      lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                      color: SHARED_COLORS.white,
                      textShadow: FRAME_TYPOGRAPHY.textShadow.glow(pointsPalette.start),
                    }}
                  >
                    Points & XP
                  </div>

                  {/* Stats grid */}
                  <div
                    style={{
                      marginTop: FRAME_SPACING.section.small,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: FRAME_SPACING.section.small,
                    }}
                  >
                    {/* Row 1: Available Points */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: FRAME_SPACING.section.small,
                        background: 'rgba(30, 30, 32, 0.6)',
                        border: `1px solid ${pointsPalette.start}`,
                        borderRadius: 8,
                        opacity: 0.9,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>
                        AVAILABLE
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          fontFamily: FRAME_FONT_FAMILY.display,
                          fontSize: FRAME_FONTS_V2.h3,
                          fontWeight: 900,
                          letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                          lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                          color: pointsPalette.start,
                          textShadow: FRAME_TYPOGRAPHY.textShadow.strong,
                        }}
                      >
                        {availablePoints} pts
                      </div>
                    </div>

                    {/* Row 2: Locked Points */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: FRAME_SPACING.section.small,
                        background: 'rgba(30, 30, 32, 0.6)',
                        border: `1px solid ${pointsPalette.end}`,
                        borderRadius: 8,
                        opacity: 0.9,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>
                        LOCKED
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          fontFamily: FRAME_FONT_FAMILY.display,
                          fontSize: FRAME_FONTS_V2.h3,
                          fontWeight: 900,
                          letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                          lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                          color: pointsPalette.end,
                          textShadow: FRAME_TYPOGRAPHY.textShadow.strong,
                        }}
                      >
                        {lockedPoints} pts
                      </div>
                    </div>

                    {/* Row 3: Level Badge + XP Progress */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: FRAME_SPACING.section.inline,
                        padding: FRAME_SPACING.section.small,
                        background: 'rgba(30, 30, 32, 0.6)',
                        border: `1px solid ${pointsPalette.start}`,
                        borderRadius: 8,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      {/* Level and Tier */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: FRAME_SPACING.section.tight,
                            padding: '4px 8px',
                            background: `linear-gradient(135deg, ${pointsPalette.start}, ${pointsPalette.end})`,
                            borderRadius: 6,
                          }}
                        >
                          <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.body, fontWeight: 900, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight, color: SHARED_COLORS.white }}>
                            LVL {levelProgress.level}
                          </div>
                        </div>
                        <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.caption, fontWeight: 700, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, color: pointsPalette.start }}>
                          {tier}
                        </div>
                      </div>

                      {/* XP Progress Bar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.7 }}>
                          <div style={{ display: 'flex' }}>XP Progress</div>
                          <div style={{ display: 'flex' }}>{xpPercent}%</div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            height: 8,
                            background: 'rgba(0, 0, 0, 0.5)',
                            borderRadius: 4,
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              width: `${Math.max(2, xpPercent)}%`,
                              background: `linear-gradient(90deg, ${pointsPalette.start}, ${pointsPalette.end})`,
                              boxShadow: `0 0 8px ${pointsPalette.start}80`,
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.micro, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.8 }}>
                          <div style={{ display: 'flex' }}>{formatXp(levelProgress.xpIntoLevel)} XP</div>
                          <div style={{ display: 'flex' }}>{formatXp(levelProgress.xpToNextLevel)} to Lvl {levelProgress.level + 1}</div>
                        </div>
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
              {buildFooterText('points')}
            </div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        fonts,
      }
    )
    return cacheImageResponse(pointsResponse, cacheKey, startTime)
  }

  // Referral frame type - Yu-Gi-Oh! Card Structure
  if (type === 'referral') {
    const referrerFid = readParam(url, 'referrerFid', '')
    const referrerUsername = readParam(url, 'referrerUsername', '')
    const referralCount = readParam(url, 'referralCount', '0')
    const rewardAmount = readParam(url, 'rewardAmount', '0')
    const inviteCode = readParam(url, 'inviteCode', '')
    const chainDisplayText = readParam(url, 'chainDisplay', 'Base')

    const referralPalette = {
      start: FRAME_COLORS.referral.primary,
      end: FRAME_COLORS.referral.secondary
    }

    const referralResponse = new ImageResponse(
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
                background: `linear-gradient(135deg, ${FRAME_COLORS.referral.bg} 0%, #0a0a0a 50%, ${FRAME_COLORS.referral.bg} 100%)`,
              }}
            />
          )}

          {/* Referral Card Container */}
          <div
            style={{
              width: 540,
              height: 360,
              display: 'flex',
              flexDirection: 'column',
              background: `linear-gradient(145deg, rgba(32, 5, 16, 0.75) 0%, rgba(16, 2, 10, 0.85) 100%)`,
              border: `4px solid ${referralPalette.start}`,
              borderRadius: 12,
              boxShadow: `0 8px 32px rgba(255, 107, 157, 0.3), inset 0 0 0 1px rgba(255, 141, 180, 0.1)`,
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
                  background: `linear-gradient(135deg, ${referralPalette.start}, ${referralPalette.end})`,
                  border: `2px solid ${referralPalette.start}`,
                  borderRadius: 999,
                  fontFamily: FRAME_FONT_FAMILY.display,
                  fontSize: FRAME_FONTS_V2.caption,
                  fontWeight: 700,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                }}
              >
                REFERRAL
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: FRAME_SPACING.section.tight,
                  padding: FRAME_SPACING.padding.small,
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {chainIconData && (
                  <img src={chainIconData} alt="chain" style={{ width: 16, height: 16 }} />
                )}
                <span
                  style={{
                    fontFamily: FRAME_FONT_FAMILY.body,
                    fontSize: FRAME_FONTS_V2.label,
                    fontWeight: 600,
                    letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal,
                  }}
                >
                  {chainDisplayText}
                </span>
              </div>
            </div>

            {/* Icon section */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: FRAME_SPACING.section.small,
              }}
            >
              <div
                style={{
                  fontSize: 80,
                  lineHeight: 1,
                  fontFamily: FRAME_FONT_FAMILY.display,
                }}
              >
                🤝
              </div>
            </div>

            {/* Referrer Identity */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: FRAME_SPACING.section.minimal,
                alignItems: 'center',
                marginBottom: FRAME_SPACING.section.medium,
              }}
            >
              <div
                style={{
                  fontFamily: FRAME_FONT_FAMILY.display,
                  fontSize: FRAME_FONTS_V2.h1,
                  fontWeight: 700,
                  color: referralPalette.start,
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                  textShadow: FRAME_TYPOGRAPHY.textShadow.glow(referralPalette.start),
                }}
              >
                {referrerUsername ? `@${referrerUsername}` : `Referrer #${referrerFid}`}
              </div>
            </div>

            {/* Stats Box */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: FRAME_SPACING.section.medium,
                padding: FRAME_SPACING.padding.box,
                background: 'rgba(255, 107, 157, 0.1)',
                border: '2px solid rgba(255, 107, 157, 0.2)',
                borderRadius: 10,
                marginBottom: FRAME_SPACING.margin.section,
              }}
            >
              {/* Referrals Count */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily: FRAME_FONT_FAMILY.body,
                    fontSize: FRAME_FONTS_V2.label,
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.7)',
                    letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                  }}
                >
                  REFERRALS:
                </span>
                <span
                  style={{
                    fontFamily: FRAME_FONT_FAMILY.display,
                    fontSize: FRAME_FONTS_V2.h3,
                    fontWeight: 700,
                    color: SHARED_COLORS.white,
                    letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                  }}
                >
                  {parseInt(referralCount, 10).toLocaleString()}
                </span>
              </div>

              {/* Rewards Earned */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily: FRAME_FONT_FAMILY.body,
                    fontSize: FRAME_FONTS_V2.label,
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.7)',
                    letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                  }}
                >
                  REWARDS:
                </span>
                <span
                  style={{
                    fontFamily: FRAME_FONT_FAMILY.display,
                    fontSize: FRAME_FONTS_V2.h3,
                    fontWeight: 700,
                    color: FRAME_COLORS.referral.accent,
                    letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                  }}
                >
                  {parseInt(rewardAmount, 10).toLocaleString()} XP
                </span>
              </div>

              {/* Invite Code */}
              {inviteCode && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontFamily: FRAME_FONT_FAMILY.body,
                      fontSize: FRAME_FONTS_V2.label,
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.7)',
                      letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                    }}
                  >
                    CODE:
                  </span>
                  <span
                    style={{
                      fontFamily: FRAME_FONT_FAMILY.display,
                      fontSize: FRAME_FONTS_V2.h2,
                      fontWeight: 700,
                      color: referralPalette.end,
                      letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                    }}
                  >
                    {inviteCode.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 'auto',
              }}
            >
              <span
                style={{
                  fontFamily: FRAME_FONT_FAMILY.body,
                  fontSize: FRAME_FONTS_V2.label,
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.6)',
                  letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal,
                }}
              >
                {buildFooterText('referral')}
              </span>
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
    return cacheImageResponse(referralResponse, cacheKey, startTime)
  }

  // Default: onchainstats fallback - Yu-Gi-Oh! Card Structure
  // Note: fid and user already declared at top (lines 34-35)
  const totalTxs = readParam(url, 'totalTxs', readParam(url, 'txs', '—'))
  const volume = readParam(url, 'volume', '—')
  const balance_val = readParam(url, 'balance', '—')
  const builder = readParam(url, 'builder', '—')
  const age = readParam(url, 'age', '—')
  const firstTx = readParam(url, 'firstTx', '—')
  const score_val = readParam(url, 'score', builder !== '—' ? builder : '—')
  const address = readParam(url, 'address', user)

  const defaultPalette = {
    start: '#00d4ff',
    end: '#4de4ff'
  }

  const defaultResponse = new ImageResponse(
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
        {/* Background: og-image.png or gradient fallback */}
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
              background: 'linear-gradient(135deg, #0a0a0a 0%, #0a1a2a 30%, #0a1f1f 60%, #0a0a0a 100%)',
            }}
          />
        )}

        {/* Yu-Gi-Oh! Card Container */}
        <div
          style={{
            width: 540,
            height: 360,
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(145deg, rgba(15, 15, 17, 0.75) 0%, rgba(10, 10, 12, 0.85) 100%)',
            border: `4px solid ${defaultPalette.start}`,
            borderRadius: 12,
            boxShadow: `0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 40px ${defaultPalette.start}90, 0 10px 50px rgba(0, 0, 0, 0.8)`,
            padding: FRAME_SPACING.container,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Holographic shine */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '30%',
              background: `linear-gradient(180deg, ${defaultPalette.start}15, transparent 100%)`,
            }}
          />

          {/* Header with DEFAULT badge */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: FRAME_SPACING.margin.header,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: FRAME_SPACING.padding.small,
                background: `linear-gradient(135deg, ${defaultPalette.start}, ${defaultPalette.end})`,
                border: `2px solid ${defaultPalette.start}`,
                borderRadius: 999,
                fontFamily: FRAME_FONT_FAMILY.display,
                fontSize: FRAME_FONTS_V2.caption,
                fontWeight: 700,
                letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
              }}
            >
              ONCHAIN
            </div>
            <div
              style={{
                display: 'flex',
                fontFamily: FRAME_FONT_FAMILY.body,
                fontSize: FRAME_FONTS_V2.caption,
                fontWeight: 600,
                letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide,
                opacity: 0.8,
              }}
            >
              {chain}
            </div>
          </div>

          {/* Main content area */}
          <div
            style={{
              display: 'flex',
              flex: 1,
              gap: FRAME_SPACING.section.large,
            }}
          >
            {/* Left: Stats icon + User Info */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: FRAME_SPACING.section.small,
              }}
            >
              {/* Stats Icon */}
              <div
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${defaultPalette.start}, ${defaultPalette.end})`,
                  border: `3px solid ${defaultPalette.start}`,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: FRAME_FONT_FAMILY.display,
                  fontSize: 100,
                }}
              >
                📊
              </div>

              {/* User info below icon */}
              {(address || fid) && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: FRAME_SPACING.section.tight,
                    padding: FRAME_SPACING.padding.box,
                    background: `linear-gradient(135deg, ${defaultPalette.start}30, ${defaultPalette.end}25)`,
                    borderRadius: 8,
                    border: `2px solid ${defaultPalette.start}`,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div style={{ display: 'flex', fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.body, fontWeight: 800, letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight, color: SHARED_COLORS.white, textShadow: FRAME_TYPOGRAPHY.textShadow.subtle }}>
                    👤 {address ? shortenAddress(address) : `FID ${fid}`}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Stats data */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                color: SHARED_COLORS.white,
              }}
            >
              {/* Title - More prominent */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: FRAME_SPACING.section.medium,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontFamily: FRAME_FONT_FAMILY.display,
                    fontSize: FRAME_FONTS_V2.h1,
                    fontWeight: 900,
                    letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight,
                    lineHeight: FRAME_TYPOGRAPHY.lineHeight.tight,
                    color: SHARED_COLORS.white,
                    textShadow: FRAME_TYPOGRAPHY.textShadow.glow(defaultPalette.start),
                  }}
                >
                  Onchain Stats
                </div>

                {/* Stats box */}
                <div
                  style={{
                    marginTop: FRAME_SPACING.section.small,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: FRAME_SPACING.section.small,
                    background: 'rgba(30, 30, 32, 0.6)',
                    border: `1px solid ${defaultPalette.start}`,
                    borderRadius: 8,
                    opacity: 0.8,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                    gap: FRAME_SPACING.section.inline,
                  }}
                >
                    {totalTxs !== '—' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.label, fontWeight: 700 }}>
                        <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.wide, opacity: 0.7 }}>TXS:</span>
                        <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.tight, color: defaultPalette.start }}>{totalTxs}</span>
                      </div>
                    )}
                    {volume !== '—' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600 }}>
                        <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: 'rgba(255, 255, 255, 0.85)' }}>Volume:</span>
                        <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.9 }}>{volume}</span>
                      </div>
                    )}
                    {(balance_val !== '—' || age !== '—') && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FRAME_FONT_FAMILY.body, fontSize: FRAME_FONTS_V2.caption, fontWeight: 600 }}>
                        <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, color: 'rgba(255, 255, 255, 0.85)' }}>{balance_val !== '—' ? 'Balance:' : 'Age:'}</span>
                        <span style={{ letterSpacing: FRAME_TYPOGRAPHY.letterSpacing.normal, opacity: 0.9 }}>{balance_val !== '—' ? balance_val : age}</span>
                      </div>
                    )}
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
            @gmeowbased • {chain}
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts,
    }
  )
  return cacheImageResponse(defaultResponse, cacheKey, startTime)
}
