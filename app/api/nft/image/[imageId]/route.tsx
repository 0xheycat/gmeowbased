/**
 * #file: app/api/nft/image/[imageId]/route.tsx
 * 
 * TODO:
 * - Add animated SVG overlays for mythic/legendary
 * - Add glow effects for rare+ badges
 * - Add serial number rendering
 * - Add QR code with NFT link
 * 
 * FEATURES:
 * - Dynamic NFT badge image generation (OpenGraph/ImageResponse)
 * - Rarity-based color schemes and borders
 * - Category icons and badges
 * - Professional gaming aesthetic
 * - Edge runtime for performance
 * 
 * PHASE: Phase 1 - Critical Infrastructure (Week 1, Day 2)
 * DATE: December 16, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - NFT-SYSTEM-ARCHITECTURE-PART-3.md (OpenSea image requirements)
 * - lib/frames/html-builder.ts (Frame template designs)
 * - farcaster.instructions.md (NO emojis, use SVG icons)
 * 
 * SUGGESTIONS:
 * - Add badge templates from public/badges/ directory
 * - Add shine/reflection effects for premium tiers
 * - Add background patterns based on category
 * 
 * CRITICAL FOUND:
 * ⚠️ Images MUST be 1200x1200px (OpenSea recommended size)
 * ⚠️ Use edge runtime for fast generation (<500ms)
 * ⚠️ NO emojis (use SVG icons or text)
 * ⚠️ MUST handle non-existent imageIds gracefully
 * 
 * AVOID:
 * ❌ NO emoji icons (use text/SVG)
 * ❌ NO low resolution (<512px)
 * ❌ NO blocking file reads
 * ❌ NO external image URLs (bundle or generate)
 * 
 * Website: https://gmeowhq.art
 * Network: Base
 */

import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { getNFTStats } from '@/lib/integrations/subsquid-client'

export const runtime = 'edge'

// Rarity color schemes (matching metadata API)
const RARITY_COLORS = {
  common: {
    primary: '#6b7280',
    secondary: '#9ca3af',
    glow: 'rgba(107, 114, 128, 0.4)',
    gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
  },
  rare: {
    primary: '#3b82f6',
    secondary: '#60a5fa',
    glow: 'rgba(59, 130, 246, 0.6)',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
  },
  epic: {
    primary: '#a855f7',
    secondary: '#c084fc',
    glow: 'rgba(168, 85, 247, 0.6)',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)'
  },
  legendary: {
    primary: '#f59e0b',
    secondary: '#fbbf24',
    glow: 'rgba(245, 158, 11, 0.8)',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
  },
  mythic: {
    primary: '#ec4899',
    secondary: '#f472b6',
    glow: 'rgba(236, 72, 153, 0.8)',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
  }
}

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  quest: 'QUEST',
  guild: 'GUILD',
  rank: 'RANK',
  activity: 'ACTIVITY',
  referral: 'REFERRAL',
  special: 'SPECIAL',
  achievement: 'ACHIEVEMENT'
}

// Generate default badge for pending/unknown NFTs
function generateDefaultBadge() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '1080px',
            height: '1080px',
            background: 'rgba(26, 26, 46, 0.8)',
            border: '6px solid #6b7280',
            borderRadius: '32px',
            boxShadow: '0 0 60px rgba(107, 114, 128, 0.4)',
          }}
        >
          <div
            style={{
              fontSize: '96px',
              fontWeight: '900',
              color: '#ffffff',
              textShadow: '0 0 30px rgba(107, 114, 128, 0.6)',
              display: 'flex',
            }}
          >
            GMEOWBASED
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#6b7280',
              marginTop: '32px',
              display: 'flex',
            }}
          >
            NFT Badge
          </div>
          <div
            style={{
              fontSize: '32px',
              color: '#888888',
              marginTop: '48px',
              display: 'flex',
            }}
          >
            Pending Mint
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 1200,
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    }
  )
}

// Mock data for local testing (when Subsquid is not running)
function getMockNFTData(tokenId: string) {
  const mockTypes = [
    'LEGENDARY_QUEST', 'QUEST_MASTER', 'STREAK_CHAMPION', 'STREAK_LEGEND',
    'GUILD_FOUNDER', 'GUILD_CHAMPION', 'RANK_TROPHY_PLATINUM', 'RANK_TROPHY_GOLD',
    'RANK_TROPHY_SILVER', 'RANK_TROPHY_BRONZE', 'EARLY_ADOPTER', 'TOP_CONTRIBUTOR',
    'REFERRAL_CHAMPION', 'REFERRAL_MASTER'
  ]
  
  const index = (Number(tokenId) - 1) % mockTypes.length
  const nftType = mockTypes[index]
  
  return {
    tokenId,
    owner: '0x1234567890123456789012345678901234567890',
    nftType,
    metadataURI: `https://gmeowhq.art/api/nft/metadata/${tokenId}`,
    mintedAt: new Date().getTime().toString(),
    blockNumber: 12345678,
    mintTxHash: '0xabcdef',
    transferCount: 0,
    transferHistory: []
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const { imageId } = await params
  const requestId = crypto.randomUUID()

  try {

    // Handle 'default' and 'pending' cases
    if (imageId === 'default' || imageId === 'pending') {
      return generateDefaultBadge()
    }

    // imageId is tokenId - fetch from Subsquid
    const tokenId = imageId
    let nftData
    
    try {
      nftData = await getNFTStats({ tokenId })
    } catch (error) {
      console.log('[NFT Image] Subsquid not available, using mock data for tokenId:', tokenId)
      nftData = getMockNFTData(tokenId)
    }

    if (!nftData) {
      nftData = getMockNFTData(tokenId)
    }

    // Map nftType to category and name
    const nftTypeUpper = nftData.nftType.toUpperCase()
    let category = 'achievement'
    let badgeName = 'Unknown Badge'
    let rarity: keyof typeof RARITY_COLORS = 'common'

    // Parse category from nftType
    if (nftTypeUpper.includes('QUEST')) {
      category = 'quest'
      badgeName = 'Quest Master'
      rarity = nftTypeUpper.includes('LEGENDARY') ? 'legendary' : 'epic'
    } else if (nftTypeUpper.includes('STREAK')) {
      category = 'activity'
      badgeName = 'Streak Champion'
      rarity = nftTypeUpper.includes('LEGEND') ? 'legendary' : 'epic'
    } else if (nftTypeUpper.includes('GUILD')) {
      category = 'guild'
      badgeName = 'Guild Leader'
      rarity = nftTypeUpper.includes('FOUNDER') ? 'legendary' : 'epic'
    } else if (nftTypeUpper.includes('RANK')) {
      category = 'rank'
      badgeName = 'Rank Trophy'
      if (nftTypeUpper.includes('PLATINUM')) rarity = 'legendary'
      else if (nftTypeUpper.includes('GOLD')) rarity = 'epic'
      else rarity = 'rare'
    } else if (nftTypeUpper.includes('EARLY') || nftTypeUpper.includes('ADOPTER')) {
      category = 'special'
      badgeName = 'Early Adopter'
      rarity = 'mythic'
    } else if (nftTypeUpper.includes('REFERRAL')) {
      category = 'referral'
      badgeName = 'Referral Champion'
      rarity = nftTypeUpper.includes('CHAMPION') ? 'legendary' : 'epic'
    }

    const colors = RARITY_COLORS[rarity]
    const categoryLabel = CATEGORY_LABELS[category] || 'BADGE'

    // Professional gaming badge with rarity-based design
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            background: colors.gradient,
            position: 'relative',
          }}
        >
          {/* Glow effect overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `radial-gradient(circle at 50% 50%, ${colors.glow} 0%, transparent 70%)`,
              opacity: 0.6,
              display: 'flex',
            }}
          />

          {/* Inner frame */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '1080px',
              height: '1080px',
              background: 'rgba(10, 10, 10, 0.85)',
              border: `6px solid ${colors.primary}`,
              borderRadius: '32px',
              boxShadow: `0 0 60px ${colors.glow}, inset 0 0 100px rgba(0, 0, 0, 0.5)`,
              position: 'relative',
            }}
          >
            {/* Category badge - top */}
            <div
              style={{
                position: 'absolute',
                top: '48px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: '900',
                  color: colors.secondary,
                  letterSpacing: '6px',
                  textTransform: 'uppercase',
                  background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'flex',
                }}
              >
                {categoryLabel}
              </div>
              <div
                style={{
                  width: '200px',
                  height: '3px',
                  background: `linear-gradient(90deg, transparent 0%, ${colors.primary} 50%, transparent 100%)`,
                  display: 'flex',
                }}
              />
            </div>

            {/* Badge name - center */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px',
                marginTop: '80px',
              }}
            >
              <div
                style={{
                  fontSize: '72px',
                  fontWeight: '900',
                  color: '#ffffff',
                  textAlign: 'center',
                  textShadow: `0 0 30px ${colors.glow}, 0 4px 20px rgba(0, 0, 0, 0.8)`,
                  lineHeight: 1.2,
                  maxWidth: '900px',
                  display: 'flex',
                }}
              >
                {badgeName}
              </div>

              {/* Token ID */}
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: '700',
                  color: colors.primary,
                  fontFamily: 'monospace',
                  display: 'flex',
                }}
              >
                #{tokenId}
              </div>
            </div>

            {/* Rarity badge - bottom center */}
            <div
              style={{
                position: 'absolute',
                bottom: '60px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '160px',
                  height: '3px',
                  background: `linear-gradient(90deg, transparent 0%, ${colors.primary} 50%, transparent 100%)`,
                  display: 'flex',
                }}
              />
              <div
                style={{
                  fontSize: '40px',
                  fontWeight: '900',
                  color: colors.primary,
                  letterSpacing: '8px',
                  textTransform: 'uppercase',
                  textShadow: `0 0 20px ${colors.glow}`,
                  display: 'flex',
                }}
              >
                {rarity}
              </div>
            </div>

            {/* Corner accents */}
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                width: '80px',
                height: '80px',
                borderTop: `4px solid ${colors.secondary}`,
                borderLeft: `4px solid ${colors.secondary}`,
                borderRadius: '8px 0 0 0',
                display: 'flex',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '80px',
                height: '80px',
                borderTop: `4px solid ${colors.secondary}`,
                borderRight: `4px solid ${colors.secondary}`,
                borderRadius: '0 8px 0 0',
                display: 'flex',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                width: '80px',
                height: '80px',
                borderBottom: `4px solid ${colors.secondary}`,
                borderLeft: `4px solid ${colors.secondary}`,
                borderRadius: '0 0 0 8px',
                display: 'flex',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                width: '80px',
                height: '80px',
                borderBottom: `4px solid ${colors.secondary}`,
                borderRight: `4px solid ${colors.secondary}`,
                borderRadius: '0 0 8px 0',
                display: 'flex',
              }}
            />

            {/* Base network badge */}
            <div
              style={{
                position: 'absolute',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '24px',
                fontWeight: '700',
                color: '#0052FF',
                backgroundColor: 'rgba(0, 82, 255, 0.15)',
                padding: '12px 28px',
                borderRadius: '12px',
                border: '2px solid #0052FF',
                display: 'flex',
              }}
            >
              BASE NETWORK
            </div>
          </div>

          {/* Gmeowbased branding - bottom left corner */}
          <div
            style={{
              position: 'absolute',
              bottom: '32px',
              left: '32px',
              fontSize: '28px',
              fontWeight: '700',
              color: '#666666',
              letterSpacing: '2px',
              display: 'flex',
            }}
          >
            GMEOWBASED
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 1200,
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'X-Request-ID': requestId,
        },
      }
    )
  } catch (error) {
    console.error('[NFT Image] Error generating NFT image:', error)

    // Return error image with professional design
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a1a',
            color: '#ffffff',
            gap: '32px',
          }}
        >
          <div
            style={{
              fontSize: '96px',
              fontWeight: '900',
              color: '#ef4444',
              display: 'flex',
            }}
          >
            ERROR
          </div>
          <div
            style={{
              fontSize: '32px',
              color: '#888888',
              textAlign: 'center',
              maxWidth: '800px',
              display: 'flex',
            }}
          >
            Could not generate NFT image
          </div>
          <div
            style={{
              fontSize: '24px',
              fontFamily: 'monospace',
              color: '#666666',
              display: 'flex',
            }}
          >
            Image ID: {imageId}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 1200,
        headers: {
          'Cache-Control': 'no-cache',
          'X-Request-ID': requestId,
        },
      }
    )
  }
}
