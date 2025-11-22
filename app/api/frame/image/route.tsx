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

  // GM frame type - Yu-Gi-Oh! Card Structure
  if (type === 'gm') {
    const gmCount = readParam(url, 'gmCount', '0')
    const streak = readParam(url, 'streak', '0')
    const rank = readParam(url, 'rank', '—')

    // Use tier colors if available, otherwise default GM colors
    const gmPalette = tierInfo ? {
      start: tierInfo.colors.gradient.start,
      end: tierInfo.colors.gradient.end
    } : {
      start: '#ff9500',
      end: '#ffb84d'
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
                  fontSize: 9,
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
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                GM
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
              {/* Left: GM icon + User Info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {/* GM Icon */}
                <div
                  style={{
                    width: 180,
                    height: 180,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${gmPalette.start}, ${gmPalette.end})`,
                    border: `3px solid ${gmPalette.start}`,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 100,
                  }}
                >
                  ☀️
                </div>

                {/* User info below icon */}
                {(user || fid) && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      padding: '10px 12px',
                      background: `linear-gradient(135deg, ${gmPalette.start}30, ${gmPalette.end}25)`,
                      borderRadius: 8,
                      border: `2px solid ${gmPalette.start}`,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 13, fontWeight: 800, color: '#ffffff', textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)' }}>
                      👤 {user ? shortenAddress(user) : `FID ${fid}`}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: GM stats */}
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
                      textShadow: `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px ${gmPalette.start}60`,
                    }}
                  >
                    Good Morning!
                  </div>

                  {/* Stats box */}
                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: 10,
                      background: 'rgba(30, 30, 32, 0.6)',
                      border: `1px solid ${gmPalette.start}`,
                      borderRadius: 8,
                      opacity: 0.8,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                      <span style={{ opacity: 0.7 }}>TOTAL GMs:</span>
                      <span style={{ color: gmPalette.start }}>{gmCount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                      <span style={{ opacity: 0.7 }}>STREAK:</span>
                      <span style={{ color: gmPalette.start }}>🔥 {streak}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
                      <span style={{ opacity: 0.6 }}>Rank:</span>
                      <span style={{ opacity: 0.9 }}>#{rank}</span>
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
    return cacheImageResponse(gmResponse, cacheKey, startTime)
  }

  // Guild frame type - Yu-Gi-Oh! Card Structure
  if (type === 'guild') {
    const guildId = readParam(url, 'guildId')
    const guildName = readParam(url, 'guildName', `Guild #${guildId}`)
    const members = readParam(url, 'members', '0')
    const quests = readParam(url, 'quests', '0')
    const level = readParam(url, 'level', '1')

    const guildPalette = {
      start: '#4da3ff',
      end: '#7dbaff'
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
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                GUILD
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
                {(user || fid) && (
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
                    <div style={{ display: 'flex', fontSize: 13, fontWeight: 800, color: '#ffffff', textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)' }}>
                      👤 {user ? shortenAddress(user) : `FID ${fid}`}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                      <span style={{ opacity: 0.7 }}>MEMBERS:</span>
                      <span style={{ color: guildPalette.start }}>{members} 👥</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                      <span style={{ opacity: 0.7 }}>QUESTS:</span>
                      <span style={{ color: guildPalette.start }}>{quests} active</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
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
                fontSize: 9,
                opacity: 0.6,
              }}
            >
              @gmeowbased • Guild #{guildId}
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
    const questId = readParam(url, 'questId')
    const questName = readParam(url, 'questName', 'Verification')
    const status = readParam(url, 'status', 'Pending')

    const verifyPalette = {
      start: '#7CFF7A',
      end: '#a0ffa0'
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
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#000000',
                }}
              >
                VERIFY
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
                {(user || fid) && (
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
                    <div style={{ display: 'flex', fontSize: 13, fontWeight: 800, color: '#000000', textShadow: '0 1px 3px rgba(255, 255, 255, 0.8)' }}>
                      👤 {user ? shortenAddress(user) : `FID ${fid}`}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                      <span style={{ opacity: 0.7 }}>STATUS:</span>
                      <span style={{ color: verifyPalette.start }}>{status}</span>
                    </div>
                    {questId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
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
                fontSize: 9,
                opacity: 0.6,
              }}
            >
              @gmeowbased • Verification
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
    
    const questPalette = {
      start: '#8e7cff',
      end: '#a78bff'
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
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                QUEST
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
                {(user || fid) && (
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
                    <div style={{ display: 'flex', fontSize: 13, fontWeight: 800, color: '#ffffff', textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)' }}>
                      👤 {user ? shortenAddress(user) : `FID ${fid}`}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                      <span style={{ opacity: 0.7 }}>REWARD:</span>
                      <span style={{ color: questPalette.start }}>+{reward} 🐾</span>
                    </div>
                    {slotsLeft !== '—' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                        <span style={{ opacity: 0.7 }}>SLOTS:</span>
                        <span style={{ color: questPalette.start }}>{slotsLeft} left</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
                      <span style={{ opacity: 0.6 }}>Expires:</span>
                      <span style={{ opacity: 0.9 }}>{expires}</span>
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
                fontSize: 9,
                opacity: 0.6,
              }}
            >
              @gmeowbased • Quest #{questId}
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
    const totalTxs = readParam(url, 'totalTxs', '0')
    const balance = readParam(url, 'balance', '0.00')
    const score = readParam(url, 'score', '0')
    const address = readParam(url, 'address', user)

    const statsPalette = {
      start: '#00d4ff',
      end: '#4de4ff'
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

            {/* Header with ONCHAIN badge */}
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
                    background: `linear-gradient(135deg, ${statsPalette.start}, ${statsPalette.end})`,
                    border: `3px solid ${statsPalette.start}`,
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
                      background: `linear-gradient(135deg, ${statsPalette.start}30, ${statsPalette.end}25)`,
                      borderRadius: 8,
                      border: `2px solid ${statsPalette.start}`,
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
                      textShadow: `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px ${statsPalette.start}60`,
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
                      border: `1px solid ${statsPalette.start}`,
                      borderRadius: 8,
                      opacity: 0.8,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                      <span style={{ opacity: 0.7 }}>TXS:</span>
                      <span style={{ color: statsPalette.start }}>{totalTxs}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                      <span style={{ opacity: 0.7 }}>BALANCE:</span>
                      <span style={{ color: statsPalette.start }}>{balance} ETH</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
                      <span style={{ opacity: 0.6 }}>Score:</span>
                      <span style={{ opacity: 0.9 }}>{score}</span>
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
    return cacheImageResponse(onchainstatsResponse, cacheKey, startTime)
  }

  // Leaderboards frame type - Yu-Gi-Oh! Card Structure
  if (type === 'leaderboards') {
    const season = readParam(url, 'season', 'Current Season')
    const limit = readParam(url, 'limit', '10')

    const leaderboardPalette = {
      start: '#7c5cff',
      end: '#a78bff'
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
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                LEADERBOARD
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                      <span style={{ opacity: 0.7 }}>SEASON:</span>
                      <span style={{ color: leaderboardPalette.start }}>{season}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                      <span style={{ opacity: 0.7 }}>SHOWING:</span>
                      <span style={{ color: leaderboardPalette.start }}>Top {limit}</span>
                    </div>
                    <div style={{ display: 'flex', fontSize: 10, fontWeight: 600, opacity: 0.7, marginTop: 4 }}>
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
                fontSize: 9,
                opacity: 0.6,
              }}
            >
              @gmeowbased • Multichain Rankings
            </div>
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    )
    return cacheImageResponse(leaderboardsResponse, cacheKey, startTime)
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
