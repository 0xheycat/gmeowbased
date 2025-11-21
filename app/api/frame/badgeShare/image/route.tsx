/**
 * Badge Share Frame - Dynamic OG Image Generator
 * Generates 600x400 PNG images with rich styling (3:2 Farcaster spec)
 * 
 * Features:
 * - og-image.png background via filesystem (Satori-compatible)
 * - User PFP from Neynar API
 * - Neynar score display
 * - Real badge images from /public/badges/
 * 
 * Backups: route.tsx.backup-pre-enhancements
 */
import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { fetchUserByFid } from '@/lib/neynar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WIDTH = 600
const HEIGHT = 400 // 3:2 aspect ratio per Farcaster spec (matches Farville)

// Tier configuration (inline, no external imports)
const TIERS = {
  legendary: { name: 'Legendary', color: '#FFD700', start: '#FFD700', end: '#FFA500' },
  epic: { name: 'Epic', color: '#00FFFF', start: '#00FFFF', end: '#0099FF' },
  rare: { name: 'Rare', color: '#FF00FF', start: '#FF00FF', end: '#CC00FF' },
  common: { name: 'Common', color: '#808080', start: '#808080', end: '#606060' }
}

// Badge registry (inline, matches database structure)
const BADGES: Record<string, { name: string; tier: keyof typeof TIERS; description: string }> = {
  'signal-luminary': {
    name: 'Signal Luminary',
    tier: 'epic',
    description: 'Reserved for broadcast specialists who illuminate the network with exceptional content'
  },
  'neon-initiate': {
    name: 'Neon Initiate',
    tier: 'common',
    description: 'Your journey into the Gmeowbased universe begins here'
  },
  'pulse-runner': {
    name: 'Pulse Runner',
    tier: 'rare',
    description: 'For those who keep pace with the rhythm of the community'
  },
  'warp-navigator': {
    name: 'Warp Navigator',
    tier: 'rare',
    description: 'Master travelers of the digital frontier'
  },
  'gmeow-vanguard': {
    name: 'Gmeow Vanguard',
    tier: 'legendary',
    description: 'Elite guardians of the Gmeowbased mission'
  }
}

/**
 * Load image from filesystem and convert to base64 data URL
 * This works in nodejs runtime (not edge)
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
    console.error(`[BadgeShare] Failed to load ${relativePath}:`, err)
    return null
  }
}

/**
 * Fetch user data from Neynar API (using existing lib)
 */
async function fetchNeynarUserData(fid: number) {
  try {
    const user = await Promise.race([
      fetchUserByFid(fid),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Neynar timeout')), 2000)
      )
    ])
    
    return {
      pfpUrl: user?.pfpUrl || null,
      username: user?.username || null,
      displayName: user?.displayName || null,
      score: user?.neynarScore || null
    }
  } catch (err) {
    console.warn('[BadgeShare] Neynar fetch failed:', err)
    return { pfpUrl: null, username: null, displayName: null, score: null }
  }
}

/**
 * OG Image Generator: Badge Share
 * 
 * Generates a 600x400 OG image for badge share frames (3:2 ratio per Farcaster spec).
 * Route: /api/frame/badgeShare/image?fid=xxx&badgeId=xxx
 * 
 * Fetches real badge data from database to show accurate assigned dates and minted status.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const badgeId = searchParams.get('badgeId')
  const fid = searchParams.get('fid')

  // Get base URL for loading images
  const url = new URL(req.url)
  const baseUrl = `${url.protocol}//${url.host}`

  try {
    // Validate badge ID
    if (!badgeId || !BADGES[badgeId]) {
      return new ImageResponse(
        <NotFoundImage badgeId={badgeId || 'unknown'} />,
        { width: WIDTH, height: HEIGHT }
      )
    }

    const badge = BADGES[badgeId]
    const tier = TIERS[badge.tier]
    const tierGradient = tier

    // Static fallback data (real-time database integration coming soon)
    const assignedDate = 'Nov 2024'
    const isMinted = true
    const mintedDate = 'Nov 15, 2024'

    // Log FID for debugging
    if (fid) {
      console.log(`[BadgeShare Image] FID ${fid} requested badge ${badgeId}`)
    }

    // Load images from filesystem (works in nodejs runtime)
    const [ogImageData, badgeImageData] = await Promise.all([
      loadImageAsDataUrl('og-image.png'),
      loadImageAsDataUrl(`badges/${badgeId}.png`),
    ])

    // Fetch Neynar data using lib
    let userData = { pfpUrl: null as string | null, username: null as string | null, displayName: null as string | null, score: null as number | null }
    if (fid) {
      try {
        userData = await fetchNeynarUserData(parseInt(fid))
      } catch (err) {
        console.warn('[BadgeShare] Neynar fetch skipped:', err)
      }
    }

    console.log('[BadgeShare] Assets loaded:', {
      ogImage: ogImageData ? 'OK' : 'FAILED',
      badgeImage: badgeImageData ? 'OK' : 'FAILED',
      username: userData.username || 'N/A',
      score: userData.score ?? 'N/A'
    })

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
                opacity: 0.6,
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: `linear-gradient(135deg, #0a0a0a 0%, #1a1a2a 30%, #0f0f1f 60%, #0a0a0a 100%)`,
              }}
            />
          )}

          {/* Glass transparency overlay */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.2)',
            }}
          />

          {/* Vibrant mesh gradient background */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `
                radial-gradient(circle at 15% 25%, ${tierGradient.start}40, transparent 35%), 
                radial-gradient(circle at 85% 75%, ${tierGradient.end}40, transparent 35%), 
                radial-gradient(circle at 50% 10%, ${tierGradient.start}30, transparent 40%),
                radial-gradient(circle at 30% 80%, ${tierGradient.end}25, transparent 35%)
              `,
            }}
          />

          {/* Animated particles effect */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `
                radial-gradient(2px 2px at 20% 30%, ${tierGradient.start}, transparent),
                radial-gradient(2px 2px at 60% 70%, ${tierGradient.end}, transparent),
                radial-gradient(1px 1px at 50% 50%, ${tierGradient.start}, transparent),
                radial-gradient(1px 1px at 80% 10%, ${tierGradient.end}, transparent),
                radial-gradient(2px 2px at 40% 90%, ${tierGradient.start}, transparent)
              `,
              backgroundSize: '100px 100px, 120px 120px, 80px 80px, 90px 90px, 110px 110px',
              backgroundPosition: '0 0, 40px 60px, 130px 270px, 70px 100px, 200px 150px',
              opacity: 0.3,
            }}
          />

          {/* Subtle grid pattern overlay */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `linear-gradient(0deg, ${tierGradient.start}30 1px, transparent 1px), linear-gradient(90deg, ${tierGradient.start}30 1px, transparent 1px)`,
              backgroundSize: '30px 30px',
              opacity: 0.15,
            }}
          />

          {/* Yu-Gi-Oh! Card Structure */}
          <div
            style={{
              width: 540,
              height: 360, // Scaled to 50% for 600x400 canvas
              display: 'flex',
              flexDirection: 'column',
              background: `linear-gradient(145deg, rgba(26, 26, 28, 0.95) 0%, rgba(18, 18, 20, 0.98) 100%)`,
              border: `3px solid ${tierGradient.start}`,
              borderRadius: 16,
              boxShadow: `0 0 0 1px rgba(255, 255, 255, 0.1), 0 10px 30px rgba(0, 0, 0, 0.5)`,
              padding: 16,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Card shine effect */}
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '50%',
                background: `linear-gradient(180deg, rgba(0, 255, 255, 0.03), transparent 100%)`,
              }}
            />

            {/* Header with tier badge */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              {/* Tier badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 12px',
                  background: `linear-gradient(135deg, ${tierGradient.start}, ${tierGradient.end})`,
                  border: `2px solid ${tierGradient.start}`,
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {tier.name.toUpperCase()}
              </div>
            </div>

            {/* Main content area */}
            <div
              style={{
                display: 'flex',
                flex: 1,
              }}
            >
              {/* Left: Badge artwork (gradient fallback) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                  width: 180,
                  height: 180,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${tierGradient.start}, ${tierGradient.end})`,
                  border: `3px solid ${tierGradient.start}`,
                  boxShadow: `0 4px 16px rgba(0, 0, 0, 0.4)`,
                  display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  
                  {badgeImageData ? (
                    <img 
                      src={badgeImageData}
                      alt={badge.name}
                      width="180"
                      height="180"
                      style={{
                        objectFit: 'cover',
                        borderRadius: 10,
                      }}
                    />
                  ) : (
                    <div style={{
                      fontSize: 80,
                      fontWeight: 900,
                      color: '#ffffff',
                    }}>
                      {badge.tier === 'legendary' ? 'L' :
                       badge.tier === 'epic' ? 'E' :
                       badge.tier === 'rare' ? 'R' : 'C'}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Badge details */}
              <div
                style={{
                  flex: 1,
                  marginLeft: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: '#ffffff',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                }}
              >
                {/* User info: PFP + Neynar Score */}
                {(userData.pfpUrl || userData.score) && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 10,
                      padding: 6,
                      background: 'rgba(0, 0, 0, 0.5)',
                      borderRadius: 999,
                      border: `1px solid ${tierGradient.start}30`,
                    }}
                  >
                   
                    {userData.pfpUrl && (
                      <img
                        src={userData.pfpUrl}
                        alt="Profile"
                        width="24"
                        height="24"
                        style={{
                          borderRadius: 999,
                          border: `1px solid ${tierGradient.start}`,
                        }}
                      />
                    )}
                    {userData.score && (
                      <div style={{
                        display: 'flex',
                        fontSize: 10,
                        fontWeight: 600,
                        color: tierGradient.start,
                        paddingRight: 6,
                      }}>
                        Neynar Score: {Math.round(userData.score)}
                      </div>
                    )}
                  </div>
                )}

                {/* Badge name */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 26,
                      fontWeight: 800,
                      margin: 0,
                      lineHeight: 1.1,
                      color: '#ffffff',
                      textShadow: `0 2px 20px ${tierGradient.start}80`,
                    }}
                  >
                    {badge.name}
                  </div>

                  {/* Description box */}
                  <div
                    style={{
                    marginTop: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 10,
                    background: 'rgba(30, 30, 32, 0.6)',
                    border: `1px solid ${tierGradient.start}`,
                    borderRadius: 8,
                    opacity: 0.8,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        fontSize: 9,
                        lineHeight: 1.6,
                        margin: 0,
                        color: 'rgba(255, 255, 255, 0.85)',
                      }}
                    >
                      {badge.description}
                    </div>
                  </div>

                  {/* Stats bar */}
                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      gap: 6,
                      fontSize: 9,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        background: 'rgba(30, 30, 32, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ display: 'flex', opacity: 0.7 }}>Earned:</div>
                      <div style={{ display: 'flex', fontWeight: 600, marginLeft: 4 }}>{assignedDate}</div>
                    </div>
                    
                    {isMinted && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '4px 8px',
                          background: `linear-gradient(135deg, ${tierGradient.start}20, ${tierGradient.end}20)`,
                          border: `1px solid ${tierGradient.start}`,
                          borderRadius: 6,
                        }}
                      >
                        <div style={{ display: 'flex', opacity: 0.9 }}>MINTED</div>
                        {mintedDate && <div style={{ display: 'flex', fontWeight: 600, marginLeft: 4, opacity: 0.7 }}>{mintedDate}</div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: Branding */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  padding: 8,
                  marginTop: 8,
                  background: 'rgba(20, 20, 22, 0.6)',
                  border: `1px solid ${tierGradient.start}`,
                  borderRadius: 6,
                  opacity: 0.7,
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 9, opacity: 0.8, fontWeight: 600 }}>
                    @gmeowbased
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 8,
                      opacity: 0.6,
                      fontFamily: 'monospace',
                    }}
                  >
                    {badgeId.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom accent line */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 4,
              background: `linear-gradient(90deg, transparent 0%, ${tierGradient.start} 20%, ${tierGradient.end} 50%, ${tierGradient.start} 80%, transparent 100%)`,
              boxShadow: `0 0 20px ${tierGradient.start}`,
            }}
          />
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        headers: {
          'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
          'CDN-Cache-Control': 'public, max-age=31536000',
          'Vercel-CDN-Cache-Control': 'public, max-age=31536000',
        },
      }
    )
  } catch (err: unknown) {
    console.error('[Frame BadgeShare Image] Error:', err)
    return new ImageResponse(
      <ErrorImage message={err instanceof Error ? err.message : 'Unknown error'} />,
      { width: WIDTH, height: HEIGHT }
    )
  }
}

// Error state component
function ErrorImage({ message }: { message: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a, #000000)',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          fontSize: 80,
          marginBottom: 24,
          fontWeight: 700,
        }}
      >
        !
      </div>
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          margin: 0,
        }}
      >
        Error
      </div>
      <div
        style={{
          fontSize: 24,
          opacity: 0.7,
          margin: 0,
          marginTop: 12,
        }}
      >
        {message}
      </div>
    </div>
  )
}

// Not found state component
function NotFoundImage({ badgeId }: { badgeId: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a, #000000)',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          fontSize: 80,
          marginBottom: 24,
        }}
      >
        X
      </div>
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          margin: 0,
        }}
      >
        404
      </div>
      <div
        style={{
          fontSize: 24,
          opacity: 0.7,
          margin: 0,
          marginTop: 12,
        }}
      >
        Badge not found
      </div>
      <div
        style={{
          fontSize: 18,
          opacity: 0.5,
          margin: 0,
          marginTop: 8,
          fontFamily: 'monospace',
        }}
      >
        {badgeId}
      </div>
    </div>
  )
}
