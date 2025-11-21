/**
 * Badge Share Frame - Dynamic OG Image Generator
 * Generates 1200x628 PNG images with Yu-Gi-Oh! card design
 * 
 * Uses nodejs runtime for Vercel production compatibility
 * Fetches real-time badge data via Supabase REST API (lightweight, no connection pooling)
 */
import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Lightweight badge data fetch using Supabase REST API
 * Bypasses connection pooling issues in serverless environment
 */
async function fetchBadgeDataLight(fid: number, badgeId: string): Promise<{
  assignedDate: string
  isMinted: boolean
  mintedDate: string
} | null> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[fetchBadgeDataLight] Supabase credentials missing:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
    })
    return null
  }

  try {
    const url = `${supabaseUrl}/rest/v1/user_badges?fid=eq.${fid}&badge_id=eq.${badgeId}&select=assigned_at,minted,minted_at`
    console.log('[fetchBadgeDataLight] Fetching:', url)

    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      // Remove abort controller - might not be supported in Vercel
    })

    if (!response.ok) {
      console.error(`[fetchBadgeDataLight] Supabase REST API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    console.log('[fetchBadgeDataLight] Received data:', data)

    if (!data || data.length === 0) {
      console.log('[fetchBadgeDataLight] No data found for badge')
      return null
    }

    const badge = data[0]
    return {
      assignedDate: new Date(badge.assigned_at).toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      }),
      isMinted: badge.minted,
      mintedDate: badge.minted_at 
        ? new Date(badge.minted_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })
        : 'Not minted yet'
    }
  } catch (error) {
    console.error('Badge fetch error:', error)
    return null
  }
}

const WIDTH = 1200
const HEIGHT = 628

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
 * OG Image Generator: Badge Share
 * 
 * Generates a 1200x628 OG image for badge share frames.
 * Route: /api/frame/badgeShare/image?fid=xxx&badgeId=xxx
 * 
 * Fetches real badge data from database to show accurate assigned dates and minted status.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const badgeId = searchParams.get('badgeId')
  const fid = searchParams.get('fid')

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

    // Fetch real-time badge data with lightweight REST API approach
    let assignedDate = 'Nov 2024'
    let isMinted = true
    let mintedDate = 'Nov 15, 2024'

    if (fid) {
      try {
        const fidNumber = parseInt(fid, 10)
        const badgeData = await fetchBadgeDataLight(fidNumber, badgeId)
        
        if (badgeData) {
          assignedDate = badgeData.assignedDate
          isMinted = badgeData.isMinted
          mintedDate = badgeData.mintedDate
          console.log(`✅ Real data loaded for FID ${fidNumber}: ${badgeId} assigned ${assignedDate}, minted: ${isMinted}`)
        } else {
          console.log(`⚠️ Badge ${badgeId} not found for FID ${fidNumber}, using fallback`)
        }
      } catch (fetchError) {
        console.error('[GET] Badge data fetch failed, using fallback:', fetchError)
      }
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
            background: `linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Animated mesh gradient background */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `radial-gradient(circle at 10% 20%, ${tierGradient.start}, transparent 40%), radial-gradient(circle at 90% 80%, ${tierGradient.end}, transparent 40%), radial-gradient(circle at 50% 50%, ${tierGradient.start}, transparent 60%)`,
              opacity: 0.2,
            }}
          />

          {/* Grid pattern overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `linear-gradient(${tierGradient.start} 1px, transparent 1px), linear-gradient(90deg, ${tierGradient.start} 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
              opacity: 0.08,
            }}
          />

          {/* Yu-Gi-Oh! Card Structure */}
          <div
            style={{
              width: 1080,
              height: 560,
              display: 'flex',
              flexDirection: 'column',
              background: `linear-gradient(145deg, rgba(26, 26, 28, 0.95) 0%, rgba(18, 18, 20, 0.98) 100%)`,
              border: `3px solid ${tierGradient.start}`,
              borderRadius: 32,
              boxShadow: `0 0 0 1px rgba(255, 255, 255, 0.1), 0 20px 60px rgba(0, 0, 0, 0.5)`,
              padding: 32,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Card shine effect */}
            <div
              style={{
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
                marginBottom: 24,
              }}
            >
              {/* Tier badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 24px',
                  background: `linear-gradient(135deg, ${tierGradient.start}, ${tierGradient.end})`,
                  border: `2px solid ${tierGradient.start}`,
                  borderRadius: 999,
                  fontSize: 20,
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
                  width: 360,
                  height: 360,
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${tierGradient.start}, ${tierGradient.end})`,
                  border: `3px solid ${tierGradient.start}`,
                  boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4)`,
                  display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 160,
                    fontWeight: 900,
                    color: '#ffffff',
                  }}
                >
                  {badge.tier === 'legendary' ? 'L' :
                   badge.tier === 'epic' ? 'E' :
                   badge.tier === 'rare' ? 'R' : 'C'}
                </div>
              </div>

              {/* Right: Badge details */}
              <div
                style={{
                  flex: 1,
                  marginLeft: 32,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: '#ffffff',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                }}
              >
                {/* Badge name */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      fontSize: 52,
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
                    marginTop: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 20,
                    background: 'rgba(30, 30, 32, 0.6)',
                    border: `1px solid ${tierGradient.start}`,
                    borderRadius: 16,
                    opacity: 0.8,
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
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
                      marginTop: 20,
                      display: 'flex',
                      gap: 12,
                      fontSize: 18,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 16px',
                        background: 'rgba(30, 30, 32, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 12,
                      }}
                    >
                      <div style={{ opacity: 0.7 }}>Earned:</div>
                      <div style={{ fontWeight: 600, marginLeft: 8 }}>{assignedDate}</div>
                    </div>
                    
                    {isMinted && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 16px',
                          background: `linear-gradient(135deg, ${tierGradient.start}20, ${tierGradient.end}20)`,
                          border: `1px solid ${tierGradient.start}`,
                          borderRadius: 12,
                        }}
                      >
                        <div style={{ opacity: 0.9 }}>MINTED</div>
                        {mintedDate && <div style={{ fontWeight: 600, marginLeft: 8, opacity: 0.7 }}>{mintedDate}</div>}
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
                  padding: 16,
                  marginTop: 16,
                  background: 'rgba(20, 20, 22, 0.6)',
                  border: `1px solid ${tierGradient.start}`,
                  borderRadius: 12,
                  opacity: 0.7,
                  }}
                >
                  <div style={{ fontSize: 18, opacity: 0.8, fontWeight: 600 }}>
                    @gmeowbased
                  </div>
                  <div
                    style={{
                      fontSize: 16,
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
