/**
 * NFT Badge Image API
 * 
 * Generates SVG badge images for NFT tokens.
 * Uses simple badge design with category and rarity themes.
 * 
 * @see lib/dicebear-generator.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateGmeowBadgeWithBranding } from '@/lib/dicebear-generator'

// Mock data for local testing (same as metadata API)
function getMockNFTData(tokenId: string) {
  const mockTypes = [
    'LEGENDARY_QUEST_EPIC', 'QUEST_MASTER_RARE', 'STREAK_CHAMPION_EPIC', 'STREAK_LEGEND_LEGENDARY',
    'GUILD_FOUNDER_LEGENDARY', 'GUILD_CHAMPION_EPIC', 'RANK_TROPHY_PLATINUM_EPIC', 'RANK_TROPHY_GOLD_RARE',
    'RANK_TROPHY_SILVER_COMMON', 'RANK_TROPHY_BRONZE_COMMON', 'EARLY_ADOPTER_MYTHIC', 'TOP_CONTRIBUTOR_LEGENDARY',
    'REFERRAL_CHAMPION_EPIC', 'REFERRAL_MASTER_RARE'
  ]
  
  const index = (Number(tokenId) - 1) % mockTypes.length
  return mockTypes[index]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await params
    const tokenId = imageId

    console.log('[NFT Image SVG] Generating badge for token:', tokenId)

    // Get NFT type (mock data for now, will use Subsquid in production)
    const nftType = getMockNFTData(tokenId)
    
    console.log('[NFT Image SVG] NFT type:', nftType)

    // Generate badge SVG
    const svgContent = generateGmeowBadgeWithBranding(tokenId, nftType)

    return new NextResponse(svgContent, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    })

  } catch (error) {
    console.error('[NFT Image SVG] Error generating badge:', error)
    
    // Return error SVG
    return new NextResponse(
      `<svg width="1200" height="1200" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="1200" fill="#1a1a1a"/>
        <text x="600" y="600" font-family="Arial" font-size="48" fill="#ef4444" text-anchor="middle">ERROR</text>
        <text x="600" y="700" font-family="Arial" font-size="24" fill="#999999" text-anchor="middle">${error instanceof Error ? error.message : 'Unknown error'}</text>
      </svg>`,
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache',
        },
      }
    )
  }
}
