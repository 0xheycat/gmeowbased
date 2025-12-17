/**
 * Badge Artwork System - Phase 5.2
 * Maps user tier to badge artwork URLs for onboarding card display
 * 
 * GI-7 Compliance: Uses existing badge registry system
 * GI-11 Security: Validates URLs before rendering
 */

import type { TierType } from './badges'
import { getTierConfig, getBadgeByTier } from './badges'

export type BadgeArtwork = {
  tier: TierType
  imageUrl: string
  artPath: string | null
  badgeName: string
  color: string
  bgGradient: string
  fallbackUrl: string
}

/**
 * Get badge artwork URL for a specific tier
 * Returns badge image from registry or fallback placeholder
 * 
 * @param tier - User's Neynar tier (mythic, legendary, epic, rare, common)
 * @returns BadgeArtwork object with image URLs and styling
 * 
 * @example
 * const artwork = getBadgeArtworkForTier('mythic')
 * // Returns: { imageUrl: 'https://...', color: '#9C27FF', ... }
 */
export function getBadgeArtworkForTier(tier: TierType): BadgeArtwork {
  const tierConfig = getTierConfig(tier)
  const badge = getBadgeByTier(tier)
  
  // Fallback to tier-specific default image if badge not found
  const fallbackUrl = `/badges/tier-${tier}.png`
  
  return {
    tier,
    imageUrl: badge?.imageUrl || fallbackUrl,
    artPath: badge?.artPath || null,
    badgeName: badge?.name || `${tierConfig.name} Tier Badge`,
    color: tierConfig.color,
    bgGradient: tierConfig.bgGradient,
    fallbackUrl,
  }
}

/**
 * Get all tier badge artworks (for admin preview or gallery)
 * @returns Array of BadgeArtwork for all tiers
 */
export function getAllTierBadgeArtworks(): BadgeArtwork[] {
  const tiers: TierType[] = ['mythic', 'legendary', 'epic', 'rare', 'common']
  return tiers.map(tier => getBadgeArtworkForTier(tier))
}

/**
 * Validate badge artwork URL
 * Ensures URL is HTTPS and from trusted domain
 * 
 * GI-11 Security: Validates external URLs before rendering
 */
export function validateBadgeArtworkUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  
  try {
    const parsed = new URL(url)
    
    // Only allow HTTPS protocol
    if (parsed.protocol !== 'https:') return false
    
    // Trusted domains for badge artwork
    const trustedDomains = [
      'gmeowhq.art',
      'supabase.co',
      'neynar.com',
      'farcaster.xyz',
    ]
    
    const hostname = parsed.hostname.toLowerCase()
    const isTrusted = trustedDomains.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    )
    
    return isTrusted
  } catch {
    return false
  }
}

/**
 * Get badge artwork with fallback chain
 * Tries: badge.imageUrl → badge.artPath → tier fallback → logo
 * 
 * @param tier - User tier
 * @param customFallback - Optional custom fallback URL
 * @returns Validated artwork URL
 */
export function getBadgeArtworkUrlSafe(
  tier: TierType, 
  customFallback?: string
): string {
  const artwork = getBadgeArtworkForTier(tier)
  
  // Try imageUrl first
  if (artwork.imageUrl && validateBadgeArtworkUrl(artwork.imageUrl)) {
    return artwork.imageUrl
  }
  
  // Try artPath (Supabase Storage)
  if (artwork.artPath && artwork.artPath.startsWith('/')) {
    // Relative path, construct full URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      const fullUrl = `${supabaseUrl}/storage/v1/object/public/badge-art${artwork.artPath}`
      if (validateBadgeArtworkUrl(fullUrl)) {
        return fullUrl
      }
    }
  }
  
  // Try custom fallback
  if (customFallback) return customFallback
  
  // Final fallback: tier-specific or logo
  return artwork.fallbackUrl || '/logo.png'
}

/**
 * Get badge artwork as CSS background style
 * For use in inline styles or CSS-in-JS
 * 
 * @param tier - User tier
 * @returns CSS background value with gradient overlay
 */
export function getBadgeArtworkBackground(tier: TierType): string {
  const artwork = getBadgeArtworkForTier(tier)
  const imageUrl = getBadgeArtworkUrlSafe(tier)
  
  return `linear-gradient(135deg, ${artwork.color}15, ${artwork.color}05), url('${imageUrl}')`
}

/**
 * Generate badge artwork metadata for OG images
 * Used in Phase 5.6 (OG Image API)
 * 
 * @param tier - User tier
 * @param username - Farcaster username
 * @param score - Neynar score
 * @returns Metadata object for OG image generation
 */
export function getBadgeArtworkMetadata(
  tier: TierType,
  username: string,
  score: number
) {
  const artwork = getBadgeArtworkForTier(tier)
  
  return {
    tier,
    tierLabel: artwork.badgeName,
    color: artwork.color,
    bgGradient: artwork.bgGradient,
    imageUrl: getBadgeArtworkUrlSafe(tier),
    username,
    score,
    scoreFormatted: score.toFixed(2),
    timestamp: new Date().toISOString(),
  }
}
