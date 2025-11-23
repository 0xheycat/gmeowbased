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
  FRAME_COLORS, 
  buildIdentityDisplay,
  buildFooterText,
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
              padding: 14,
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
                  padding: '4px 10px',
                  background: `linear-gradient(135deg, ${tierInfo.colors.gradient.start}, ${tierInfo.colors.gradient.end})`,
                  border: `2px solid ${tierInfo.colors.primary}`,
                  borderRadius: 999,
                  fontSize: FRAME_FONTS.micro,
                  fontWeight: 800,
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
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 12px',
                  background: `linear-gradient(135deg, ${gmPalette.start}, ${gmPalette.end})`,
                  border: `2px solid ${gmPalette.start}`,
                  borderRadius: 999,
                  fontSize: FRAME_FONTS.caption,
                  fontWeight: 700,
                }}
              >
                GM
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: FRAME_FONTS.caption,
                  fontWeight: 600,
                  opacity: 0.8,
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
                marginBottom: 14,
                padding: '8px 16px',
                background: `linear-gradient(135deg, ${gmPalette.start}20, ${gmPalette.end}15)`,
                borderRadius: 8,
                border: `2px solid ${gmPalette.start}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: FRAME_FONTS.identity,
                  fontWeight: 900,
                  color: '#ffffff',
                  textShadow: `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 16px ${gmPalette.start}60`,
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
                  marginBottom: 12,
                  padding: '12px 20px',
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
                    gap: 10,
                    fontSize: 24,
                    fontWeight: 900,
                    color: '#000000',
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
                gap: 12,
              }}
            >
              {/* Left Column: GM Stats */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: 12,
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
                    marginBottom: 8,
                  }}
                >
                  ☀️
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase' }}>Total GMs</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: gmPalette.start }}>{gmCount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase' }}>Streak</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: gmPalette.start }}>🔥 {streak}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase' }}>Rank</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: gmPalette.start }}>#{rank}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Milestones */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: 12,
                  background: 'rgba(30, 30, 32, 0.6)',
                  border: `2px solid ${gmPalette.start}40`,
                  borderRadius: 10,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: 12,
                    fontWeight: 700,
                    opacity: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  Milestones
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {parseInt(streak) >= 30 ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        background: `linear-gradient(135deg, ${gmPalette.start}30, ${gmPalette.end}20)`,
                        borderRadius: 8,
                        border: `2px solid ${gmPalette.start}`,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>👑</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: gmPalette.start }}>Legendary</span>
                        <span style={{ fontSize: 9, opacity: 0.7 }}>30+ day streak!</span>
                      </div>
                    </div>
                  ) : parseInt(streak) >= 7 ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        background: `linear-gradient(135deg, ${gmPalette.start}30, ${gmPalette.end}20)`,
                        borderRadius: 8,
                        border: `2px solid ${gmPalette.start}`,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>⚡</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: gmPalette.start }}>Week Warrior</span>
                        <span style={{ fontSize: 9, opacity: 0.7 }}>{30 - parseInt(streak)} to Legend</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        background: 'rgba(30, 30, 32, 0.4)',
                        borderRadius: 8,
                        border: '1px dashed rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <span style={{ fontSize: 18, opacity: 0.5 }}>🎯</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.6 }}>Week Warrior</span>
                        <span style={{ fontSize: 9, opacity: 0.5 }}>{7 - parseInt(streak)} days away</span>
                      </div>
                    </div>
                  )}
                  {parseInt(gmCount) >= 100 ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        background: `linear-gradient(135deg, ${gmPalette.start}30, ${gmPalette.end}20)`,
                        borderRadius: 8,
                        border: `2px solid ${gmPalette.start}`,
                      }}
                    >
                      <span style={{ fontSize: 20 }}>💯</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: gmPalette.start }}>Century Club</span>
                        <span style={{ fontSize: 9, opacity: 0.7 }}>100+ GMs!</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        background: 'rgba(30, 30, 32, 0.4)',
                        borderRadius: 8,
                        border: '1px dashed rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <span style={{ fontSize: 18, opacity: 0.5 }}>💯</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.6 }}>Century Club</span>
                        <span style={{ fontSize: 9, opacity: 0.5 }}>{100 - parseInt(gmCount)} GMs away</span>
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
                marginTop: 12,
                fontSize: FRAME_FONTS.micro,
                opacity: 0.6,
              }}
            >
              {buildFooterText('gm', chain)}
            </div>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
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
              padding: 14,
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
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 12px',
                  background: `linear-gradient(135deg, ${guildPalette.start}, ${guildPalette.end})`,
                  border: `2px solid ${guildPalette.start}`,
                  borderRadius: 999,
                  fontSize: FRAME_FONTS.caption,
                  fontWeight: 700,
                }}
              >  
                GUILD
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: FRAME_FONTS.caption,
                  fontWeight: 600,
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
                gap: 16,
              }}
            >
              {/* Left: Guild icon + User Info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
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
                      gap: 6,
                      padding: '10px 12px',
                      background: `linear-gradient(135deg, ${guildPalette.start}30, ${guildPalette.end}25)`,
                      borderRadius: 8,
                      border: `2px solid ${guildPalette.start}`,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: FRAME_FONTS.body, fontWeight: 800, color: '#ffffff', textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)' }}>
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
                  color: '#ffffff',
                }}
              >
                {/* Guild name - More prominent */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 28,
                      fontWeight: 900,
                      lineHeight: 1.1,
                      color: '#ffffff',
                      textShadow: `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px ${guildPalette.start}60`,
                    }}
                  >
                    {guildName}
                  </div>

                  {/* Stats box */}
                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: 10,
                      background: 'rgba(30, 30, 32, 0.6)',
                      border: `1px solid ${guildPalette.start}`,
                      borderRadius: 8,
                      opacity: 0.8,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: FRAME_FONTS.label, fontWeight: 700 }}>
                      <span style={{ opacity: 0.7 }}>MEMBERS:</span>
                      <span style={{ color: guildPalette.start }}>{members} 👥</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: FRAME_FONTS.label, fontWeight: 700 }}>
                      <span style={{ opacity: 0.7 }}>QUESTS:</span>
                      <span style={{ color: guildPalette.start }}>{quests} active</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: FRAME_FONTS.caption, fontWeight: 600 }}>
                      <span style={{ opacity: 0.6 }}>Level:</span>
                      <span style={{ opacity: 0.9 }}>{level}</span>
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
                marginTop: 12,
                fontSize: FRAME_FONTS.micro,
                opacity: 0.6,
              }}
            >
              {buildFooterText('guild', `Guild #${guildId}`)}
            </div>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
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
              padding: 14,
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
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 12px',
                  background: `linear-gradient(135deg, ${verifyPalette.start}, ${verifyPalette.end})`,
                  border: `2px solid ${verifyPalette.start}`,
                  borderRadius: 999,
                  fontSize: FRAME_FONTS.caption,
                  fontWeight: 700,
                  color: '#000000',
                }}
              >
                VERIFY
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: FRAME_FONTS.caption,
                  fontWeight: 600,
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
                gap: 16,
              }}
            >
              {/* Left: Verify icon + User Info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
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
                      gap: 6,
                      padding: '10px 12px',
                      background: `linear-gradient(135deg, ${verifyPalette.start}30, ${verifyPalette.end}25)`,
                      borderRadius: 8,
                      border: `2px solid ${verifyPalette.start}`,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: FRAME_FONTS.body, fontWeight: 800, color: '#000000', textShadow: '0 1px 3px rgba(255, 255, 255, 0.8)' }}>
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
                  color: '#ffffff',
                }}
              >
                {/* Title - More prominent */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 28,
                      fontWeight: 900,
                      lineHeight: 1.1,
                      color: '#ffffff',
                      textShadow: `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px ${verifyPalette.start}60`,
                    }}
                  >
                    {questName}
                  </div>

                  {/* Verification info box */}
                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: 10,
                      background: 'rgba(30, 30, 32, 0.6)',
                      border: `1px solid ${verifyPalette.start}`,
                      borderRadius: 8,
                      opacity: 0.8,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: FRAME_FONTS.label, fontWeight: 700 }}>
                      <span style={{ opacity: 0.7 }}>STATUS:</span>
                      <span style={{ color: verifyPalette.start }}>{status}</span>
                    </div>
                    {questId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: FRAME_FONTS.caption, fontWeight: 600 }}>
                        <span style={{ opacity: 0.6 }}>Quest:</span>
                        <span style={{ opacity: 0.9 }}>#{questId}</span>
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
                marginTop: 12,
                fontSize: FRAME_FONTS.micro,
                opacity: 0.6,
              }}
            >
              {buildFooterText('verify')}
            </div>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
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
              padding: 14,
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
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 12px',
                  background: `linear-gradient(135deg, ${questPalette.start}, ${questPalette.end})`,
                  border: `2px solid ${questPalette.start}`,
                  borderRadius: 999,
                  fontSize: FRAME_FONTS.caption,
                  fontWeight: 700,
                }}
              >
                QUEST
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: FRAME_FONTS.caption,
                  fontWeight: 600,
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
                gap: 16,
              }}
            >
              {/* Left: Quest icon + User Info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
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
                      gap: 6,
                      padding: '10px 12px',
                      background: `linear-gradient(135deg, ${questPalette.start}30, ${questPalette.end}25)`,
                      borderRadius: 8,
                      border: `2px solid ${questPalette.start}`,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: FRAME_FONTS.body, fontWeight: 800, color: '#ffffff', textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)' }}>
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
                  color: '#ffffff',
                }}
              >
                {/* Quest name - More prominent */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 28,
                      fontWeight: 900,
                      lineHeight: 1.1,
                      color: '#ffffff',
                      textShadow: `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px ${questPalette.start}60`,
                    }}
                  >
                    {questName}
                  </div>

                  {/* Description box with stats */}
                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: 10,
                      background: 'rgba(30, 30, 32, 0.6)',
                      border: `1px solid ${questPalette.start}`,
                      borderRadius: 8,
                      opacity: 0.8,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      gap: 8,
                    }}
                  >
                    {/* Task 10: XP Reward Badge - Prominent display */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: `linear-gradient(135deg, ${questPalette.start}, ${questPalette.end})`,
                        borderRadius: 8,
                        boxShadow: `0 0 12px ${questPalette.start}60`,
                      }}
                    >
                      <div style={{ display: 'flex', fontSize: FRAME_FONTS.micro, fontWeight: 600, opacity: 0.9 }}>
                        COMPLETE FOR
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          fontSize: 24,
                          fontWeight: 900,
                          color: '#ffffff',
                          textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
                        }}
                      >
                        +{reward} XP
                      </div>
                    </div>
                    {slotsLeft !== '—' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: FRAME_FONTS.label, fontWeight: 700 }}>
                        <div style={{ display: 'flex', opacity: 0.7 }}>SLOTS:</div>
                        <div style={{ display: 'flex', color: questPalette.start }}>{slotsLeft} left</div>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: FRAME_FONTS.caption, fontWeight: 600 }}>
                      <div style={{ display: 'flex', opacity: 0.6 }}>Expires:</div>
                      <div style={{ display: 'flex', opacity: 0.9 }}>{expires}</div>
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
                marginTop: 12,
                fontSize: FRAME_FONTS.micro,
                opacity: 0.6,
              }}
            >
              {buildFooterText('quest', `Quest #${questId}`)}
            </div>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
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
              padding: 14,
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
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 12px',
                  background: `linear-gradient(135deg, ${statsPalette.start}, ${statsPalette.end})`,
                  border: `2px solid ${statsPalette.start}`,
                  borderRadius: 999,
                  fontSize: FRAME_FONTS.caption,
                  fontWeight: 700,
                }}
              >
                ONCHAIN
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                {hasPower && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                      border: '2px solid #FFD700',
                      borderRadius: 999,
                      fontSize: FRAME_FONTS.micro,
                      fontWeight: 800,
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
                    gap: 6,
                    fontSize: FRAME_FONTS.caption,
                    fontWeight: 600,
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
                marginBottom: 14,
                padding: '8px 16px',
                background: `linear-gradient(135deg, ${statsPalette.start}20, ${statsPalette.end}15)`,
                borderRadius: 8,
                border: `2px solid ${statsPalette.start}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: FRAME_FONTS.identity,
                  fontWeight: 900,
                  color: '#ffffff',
                  textShadow: `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 16px ${statsPalette.start}60`,
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
                gap: 12,
              }}
            >
              {/* Left Column */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: 12,
                  background: 'rgba(30, 30, 32, 0.6)',
                  border: `2px solid ${statsPalette.start}`,
                  borderRadius: 10,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
              >
                {/* Primary Stats - Large and prominent */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase' }}>Transactions</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: statsPalette.start }}>{txs}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase' }}>Contracts</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: statsPalette.start }}>{contracts}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase' }}>Volume</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: statsPalette.start }}>{volume}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase' }}>Balance</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: statsPalette.start }}>{balance}</span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: `${statsPalette.start}40`, margin: '4px 0' }} />

                {/* Secondary Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.6 }}>Age</span>
                    <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.9 }}>{age}</span>
                  </div>
                  {firstTx !== '—' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.6 }}>First TX</span>
                      <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.9 }}>{firstTx}</span>
                    </div>
                  )}
                  {lastTx !== '—' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.6 }}>Last TX</span>
                      <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.9 }}>{lastTx}</span>
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
                  gap: 10,
                  padding: 12,
                  background: 'rgba(30, 30, 32, 0.6)',
                  border: `2px solid ${statsPalette.start}`,
                  borderRadius: 10,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: 13,
                    fontWeight: 800,
                    color: '#ffffff',
                    marginBottom: 6,
                    textShadow: `0 1px 3px rgba(0, 0, 0, 0.8)`,
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
                      gap: 4,
                      padding: 10,
                      background: `linear-gradient(135deg, ${statsPalette.start}25, ${statsPalette.end}20)`,
                      borderRadius: 8,
                      border: `1px solid ${statsPalette.start}`,
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase' }}>Builder Score</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: statsPalette.start }}>{builder}</span>
                  </div>
                )}

                {/* Neynar Score */}
                {neynar !== '—' && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      padding: 10,
                      background: `linear-gradient(135deg, ${statsPalette.start}25, ${statsPalette.end}20)`,
                      borderRadius: 8,
                      border: `1px solid ${statsPalette.start}`,
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase' }}>Neynar Score</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: statsPalette.start }}>{neynar}</span>
                  </div>
                )}

                {/* Power Badge Info (if not shown in header) */}
                {!hasPower && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: 8,
                      background: 'rgba(40, 40, 42, 0.5)',
                      borderRadius: 6,
                      opacity: 0.5,
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 600 }}>⚪ No Power Badge</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: 10,
                fontSize: FRAME_FONTS.micro,
                opacity: 0.6,
              }}
            >
              {buildFooterText('onchainstats', chain)}
            </div>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
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
              padding: 14,
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
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 12px',
                  background: `linear-gradient(135deg, ${leaderboardPalette.start}, ${leaderboardPalette.end})`,
                  border: `2px solid ${leaderboardPalette.start}`,
                  borderRadius: 999,
                  fontSize: FRAME_FONTS.caption,
                  fontWeight: 700,
                }}
              >
                LEADERBOARD
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: FRAME_FONTS.caption,
                  fontWeight: 600,
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
                gap: 16,
              }}
            >
              {/* Left: Trophy icon (no user info for leaderboards) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
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
                  color: '#ffffff',
                }}
              >
                {/* Title - More prominent */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 28,
                      fontWeight: 900,
                      lineHeight: 1.1,
                      color: '#ffffff',
                      textShadow: `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px ${leaderboardPalette.start}60`,
                    }}
                  >
                    Top Performers
                  </div>

                  {/* Info box */}
                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: 10,
                      background: 'rgba(30, 30, 32, 0.6)',
                      border: `1px solid ${leaderboardPalette.start}`,
                      borderRadius: 8,
                      opacity: 0.8,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: FRAME_FONTS.label, fontWeight: 700 }}>
                      <span style={{ opacity: 0.7 }}>SEASON:</span>
                      <span style={{ color: leaderboardPalette.start }}>{season}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: FRAME_FONTS.label, fontWeight: 700 }}>
                      <span style={{ opacity: 0.7 }}>SHOWING:</span>
                      <span style={{ color: leaderboardPalette.start }}>Top {limit}</span>
                    </div>
                    <div style={{ display: 'flex', fontSize: FRAME_FONTS.caption, fontWeight: 600, opacity: 0.7, marginTop: 4 }}>
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
                marginTop: 12,
                fontSize: FRAME_FONTS.micro,
                opacity: 0.6,
              }}
            >
              {buildFooterText('leaderboard', 'Multichain Rankings')}
            </div>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
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
              padding: 14,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
                color: '#ffffff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: '4px 10px',
                  background: `linear-gradient(135deg, ${badgePalette.start}, ${badgePalette.end})`,
                  border: `2px solid ${badgePalette.start}`,
                  borderRadius: 999,
                  fontSize: FRAME_FONTS.caption,
                  fontWeight: 700,
                }}
              >
                BADGE COLLECTION
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: FRAME_FONTS.caption,
                  fontWeight: 600,
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
                gap: 16,
              }}
            >
              {/* Left: Badge icon + user info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {/* Badge Icon */}
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${badgePalette.start}, ${badgePalette.end})`,
                    border: `3px solid ${badgePalette.start}`,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 70,
                  }}
                >
                  🏅
                </div>

                {/* User info box */}
                <div
                  style={{
                    width: 120,
                    display: 'flex',
                    padding: 8,
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
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#ffffff',
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
                  color: '#ffffff',
                }}
              >
                {/* Title */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 28,
                      fontWeight: 900,
                      lineHeight: 1.1,
                      color: '#ffffff',
                      textShadow: `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px ${badgePalette.start}60`,
                    }}
                  >
                    Badge Collection
                  </div>

                  {/* Stats grid */}
                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    {/* Row 1: Earned */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 12,
                        background: 'rgba(30, 30, 32, 0.6)',
                        border: `1px solid ${badgePalette.start}`,
                        borderRadius: 8,
                        opacity: 0.9,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', fontSize: FRAME_FONTS.caption, fontWeight: 600, opacity: 0.7 }}>
                        EARNED BADGES
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          fontSize: 24,
                          fontWeight: 900,
                          color: badgePalette.start,
                          textShadow: `0 2px 8px ${badgePalette.start}80`,
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
                        padding: 12,
                        background: 'rgba(30, 30, 32, 0.6)',
                        border: `1px solid ${badgePalette.end}`,
                        borderRadius: 8,
                        opacity: 0.9,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', fontSize: FRAME_FONTS.caption, fontWeight: 600, opacity: 0.7 }}>
                        ELIGIBLE FOR
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          fontSize: 24,
                          fontWeight: 900,
                          color: badgePalette.end,
                          textShadow: `0 2px 8px ${badgePalette.end}80`,
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
                        padding: 10,
                        background: `linear-gradient(135deg, ${badgePalette.start}20, ${badgePalette.end}20)`,
                        border: `1px solid ${badgePalette.start}`,
                        borderRadius: 8,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', fontSize: FRAME_FONTS.micro, fontWeight: 600, opacity: 0.8, textAlign: 'center' }}>
                        TOTAL XP FROM BADGES
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          fontSize: 20,
                          fontWeight: 900,
                          color: '#ffd700',
                          textShadow: '0 2px 8px rgba(255, 215, 0, 0.8)',
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
                marginTop: 12,
                fontSize: FRAME_FONTS.micro,
                opacity: 0.6,
              }}
            >
              {buildFooterText('badge')}
            </div>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
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
              padding: 14,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
                color: '#ffffff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: '4px 10px',
                  background: `linear-gradient(135deg, ${pointsPalette.start}, ${pointsPalette.end})`,
                  border: `2px solid ${pointsPalette.start}`,
                  borderRadius: 999,
                  fontSize: FRAME_FONTS.caption,
                  fontWeight: 700,
                }}
              >
                POINTS & XP
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: FRAME_FONTS.caption,
                  fontWeight: 600,
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
                gap: 16,
              }}
            >
              {/* Left: Points icon + user info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
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
                    padding: 8,
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
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#ffffff',
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
                  color: '#ffffff',
                }}
              >
                {/* Title & Tier */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 28,
                      fontWeight: 900,
                      lineHeight: 1.1,
                      color: '#ffffff',
                      textShadow: `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px ${pointsPalette.start}60`,
                    }}
                  >
                    Points & XP
                  </div>

                  {/* Stats grid */}
                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {/* Row 1: Available Points */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 10,
                        background: 'rgba(30, 30, 32, 0.6)',
                        border: `1px solid ${pointsPalette.start}`,
                        borderRadius: 8,
                        opacity: 0.9,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', fontSize: FRAME_FONTS.caption, fontWeight: 600, opacity: 0.7 }}>
                        AVAILABLE
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          fontSize: 20,
                          fontWeight: 900,
                          color: pointsPalette.start,
                          textShadow: `0 2px 8px ${pointsPalette.start}80`,
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
                        padding: 10,
                        background: 'rgba(30, 30, 32, 0.6)',
                        border: `1px solid ${pointsPalette.end}`,
                        borderRadius: 8,
                        opacity: 0.9,
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', fontSize: FRAME_FONTS.caption, fontWeight: 600, opacity: 0.7 }}>
                        LOCKED
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          fontSize: 20,
                          fontWeight: 900,
                          color: pointsPalette.end,
                          textShadow: `0 2px 8px ${pointsPalette.end}80`,
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
                        gap: 8,
                        padding: 10,
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
                            gap: 6,
                            padding: '4px 8px',
                            background: `linear-gradient(135deg, ${pointsPalette.start}, ${pointsPalette.end})`,
                            borderRadius: 6,
                          }}
                        >
                          <div style={{ display: 'flex', fontSize: 16, fontWeight: 900, color: '#ffffff' }}>
                            LVL {levelProgress.level}
                          </div>
                        </div>
                        <div style={{ display: 'flex', fontSize: FRAME_FONTS.caption, fontWeight: 700, color: pointsPalette.start }}>
                          {tier}
                        </div>
                      </div>

                      {/* XP Progress Bar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: FRAME_FONTS.micro, opacity: 0.7 }}>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: FRAME_FONTS.micro, opacity: 0.8 }}>
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
                marginTop: 12,
                fontSize: FRAME_FONTS.micro,
                opacity: 0.6,
              }}
            >
              {buildFooterText('points')}
            </div>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    )
    return cacheImageResponse(pointsResponse, cacheKey, startTime)
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
            padding: 14,
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
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '5px 12px',
                background: `linear-gradient(135deg, ${defaultPalette.start}, ${defaultPalette.end})`,
                border: `2px solid ${defaultPalette.start}`,
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              ONCHAIN
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 11,
                fontWeight: 600,
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
              gap: 16,
            }}
          >
            {/* Left: Stats icon + User Info */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
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
                    gap: 6,
                    padding: '10px 12px',
                    background: `linear-gradient(135deg, ${defaultPalette.start}30, ${defaultPalette.end}25)`,
                    borderRadius: 8,
                    border: `2px solid ${defaultPalette.start}`,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 13, fontWeight: 800, color: '#ffffff', textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)' }}>
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
                color: '#ffffff',
              }}
            >
              {/* Title - More prominent */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: 28,
                    fontWeight: 900,
                    lineHeight: 1.1,
                    color: '#ffffff',
                    textShadow: `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px ${defaultPalette.start}60`,
                  }}
                >
                  Onchain Stats
                </div>

                {/* Stats box */}
                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 10,
                    background: 'rgba(30, 30, 32, 0.6)',
                    border: `1px solid ${defaultPalette.start}`,
                    borderRadius: 8,
                    opacity: 0.8,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                    gap: 8,
                  }}
                >
                    {totalTxs !== '—' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                        <span style={{ opacity: 0.7 }}>TXS:</span>
                        <span style={{ color: defaultPalette.start }}>{totalTxs}</span>
                      </div>
                    )}
                    {volume !== '—' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
                        <span style={{ opacity: 0.6 }}>Volume:</span>
                        <span style={{ opacity: 0.9 }}>{volume}</span>
                      </div>
                    )}
                    {(balance_val !== '—' || age !== '—') && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
                        <span style={{ opacity: 0.6 }}>{balance_val !== '—' ? 'Balance:' : 'Age:'}</span>
                        <span style={{ opacity: 0.9 }}>{balance_val !== '—' ? balance_val : age}</span>
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
              marginTop: 12,
              fontSize: 9,
              opacity: 0.6,
            }}
          >
            @gmeowbased • {chain}
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  )
  return cacheImageResponse(defaultResponse, cacheKey, startTime)
}
