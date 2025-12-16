/**
 * Simple NFT Badge Generator - Local Testing Version
 * 
 * Generates static SVG badges instead of using ImageResponse/WASM
 * For production, use the full ImageResponse version
 */

import { NextRequest, NextResponse } from 'next/server'

// Rarity color schemes
const RARITY_COLORS: Record<string, {primary: string, secondary: string, glow: string}> = {
  common: { primary: '#6b7280', secondary: '#9ca3af', glow: 'rgba(107, 114, 128, 0.4)' },
  rare: { primary: '#3b82f6', secondary: '#60a5fa', glow: 'rgba(59, 130, 246, 0.6)' },
  epic: { primary: '#a855f7', secondary: '#c084fc', glow: 'rgba(168, 85, 247, 0.6)' },
  legendary: { primary: '#f59e0b', secondary: '#fbbf24', glow: 'rgba(245, 158, 11, 0.8)' },
  mythic: { primary: '#ec4899', secondary: '#f472b6', glow: 'rgba(236, 72, 153, 0.8)' }
}

const CATEGORY_LABELS: Record<string, string> = {
  quest: 'QUEST',
  guild: 'GUILD',
  rank: 'RANK',
  activity: 'ACTIVITY',
  referral: 'REFERRAL',
  special: 'SPECIAL',
  achievement: 'ACHIEVEMENT'
}

// Mock data for local testing
function getMockNFTData(tokenId: string) {
  const mockTypes = [
    'LEGENDARY_QUEST', 'QUEST_MASTER', 'STREAK_CHAMPION', 'STREAK_LEGEND',
    'GUILD_FOUNDER', 'GUILD_CHAMPION', 'RANK_TROPHY_PLATINUM', 'RANK_TROPHY_GOLD',
    'RANK_TROPHY_SILVER', 'RANK_TROPHY_BRONZE', 'EARLY_ADOPTER', 'TOP_CONTRIBUTOR',
    'REFERRAL_CHAMPION', 'REFERRAL_MASTER'
  ]
  
  const index = (Number(tokenId) - 1) % mockTypes.length
  return mockTypes[index]
}

function generateSVGBadge(tokenId: string, nftType: string) {
  const nftTypeUpper = nftType.toUpperCase()
  
  // Parse nftType to determine appearance
  let category = 'achievement'
  let badgeName = 'Unknown Badge'
  let rarity = 'common'

  if (nftTypeUpper.includes('LEGENDARY') && nftTypeUpper.includes('QUEST')) {
    category = 'quest'
    badgeName = 'Legendary Quest Master'
    rarity = 'legendary'
  } else if (nftTypeUpper.includes('QUEST')) {
    category = 'quest'
    badgeName = 'Quest Master'
    rarity = 'epic'
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
    else if (nftTypeUpper.includes('SILVER')) rarity = 'rare'
    else rarity = 'common'
  } else if (nftTypeUpper.includes('EARLY') || nftTypeUpper.includes('ADOPTER')) {
    category = 'special'
    badgeName = 'Early Adopter'
    rarity = 'mythic'
  } else if (nftTypeUpper.includes('REFERRAL')) {
    category = 'referral'
    badgeName = 'Referral Champion'
    rarity = nftTypeUpper.includes('CHAMPION') ? 'legendary' : 'epic'
  } else if (nftTypeUpper.includes('TOP') || nftTypeUpper.includes('CONTRIBUTOR')) {
    category = 'special'
    badgeName = 'Top Contributor'
    rarity = 'legendary'
  }

  const colors = RARITY_COLORS[rarity]
  const categoryLabel = CATEGORY_LABELS[category] || 'BADGE'

  return `
    <svg width="1200" height="1200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:0.8" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <radialGradient id="glow-gradient" cx="50%" cy="50%">
          <stop offset="0%" style="stop-color:${colors.glow};stop-opacity:0.6" />
          <stop offset="70%" style="stop-color:${colors.glow};stop-opacity:0" />
        </radialGradient>
      </defs>
      
      <!-- Background -->
      <rect width="1200" height="1200" fill="#0a0a0a"/>
      <rect width="1200" height="1200" fill="url(#bg-gradient)"/>
      <circle cx="600" cy="600" r="600" fill="url(#glow-gradient)"/>
      
      <!-- Inner frame -->
      <rect x="60" y="60" width="1080" height="1080" 
            fill="rgba(10, 10, 10, 0.85)" 
            stroke="${colors.primary}" 
            stroke-width="6" 
            rx="32"
            filter="url(#glow)"/>
      
      <!-- Corner accents -->
      <rect x="80" y="80" width="80" height="80" 
            fill="none" 
            stroke="${colors.secondary}" 
            stroke-width="4"/>
      <rect x="1040" y="80" width="80" height="80" 
            fill="none" 
            stroke="${colors.secondary}" 
            stroke-width="4"/>
      <rect x="80" y="1040" width="80" height="80" 
            fill="none" 
            stroke="${colors.secondary}" 
            stroke-width="4"/>
      <rect x="1040" y="1040" width="80" height="80" 
            fill="none" 
            stroke="${colors.secondary}" 
            stroke-width="4"/>
      
      <!-- Category label -->
      <text x="600" y="150" 
            font-family="Arial, sans-serif" 
            font-size="36" 
            font-weight="900" 
            fill="${colors.secondary}" 
            text-anchor="middle"
            letter-spacing="6">${categoryLabel}</text>
      <rect x="500" y="160" width="200" height="3" fill="${colors.primary}"/>
      
      <!-- Badge name -->
      <text x="600" y="500" 
            font-family="Arial, sans-serif" 
            font-size="72" 
            font-weight="900" 
            fill="#ffffff" 
            text-anchor="middle"
            filter="url(#glow)">${badgeName}</text>
      
      <!-- Token ID -->
      <text x="600" y="600" 
            font-family="monospace" 
            font-size="48" 
            font-weight="700" 
            fill="${colors.primary}" 
            text-anchor="middle">#${tokenId}</text>
      
      <!-- Rarity badge -->
      <rect x="500" y="960" width="160" height="3" fill="${colors.primary}"/>
      <text x="600" y="1040" 
            font-family="Arial, sans-serif" 
            font-size="40" 
            font-weight="900" 
            fill="${colors.primary}" 
            text-anchor="middle"
            letter-spacing="8"
            filter="url(#glow)">${rarity.toUpperCase()}</text>
      
      <!-- Branding -->
      <text x="80" y="1150" 
            font-family="Arial, sans-serif" 
            font-size="28" 
            font-weight="700" 
            fill="#666666" 
            letter-spacing="2">GMEOWBASED</text>
      
      <!-- Base Network -->
      <rect x="480" y="1100" width="240" height="50" 
            fill="rgba(0, 82, 255, 0.15)" 
            stroke="#0052FF" 
            stroke-width="2" 
            rx="12"/>
      <text x="600" y="1135" 
            font-family="Arial, sans-serif" 
            font-size="24" 
            font-weight="700" 
            fill="#0052FF" 
            text-anchor="middle">BASE NETWORK</text>
    </svg>
  `.trim()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const { imageId } = await params

  try {
    // For mock testing, generate SVG directly
    const nftType = getMockNFTData(imageId)
    const svg = generateSVGBadge(imageId, nftType)

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('[NFT Image Error]', error)
    
    // Return error SVG
    return new NextResponse(
      `<svg width="1200" height="1200" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="1200" fill="#1a1a1a"/>
        <text x="600" y="600" font-family="Arial" font-size="48" fill="#ef4444" text-anchor="middle">ERROR</text>
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
