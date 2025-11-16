/**
 * Badge Frame Utilities
 * 
 * Helper functions for generating badge share frames and OG images.
 * Used by /api/frame/badgeShare and badge inventory pages.
 */

import { resolveOrigin } from '@/lib/share'
import type { UserBadge } from '@/lib/badges'

/**
 * Build badge share frame URL
 * 
 * @param fid - Farcaster ID
 * @param badgeId - Badge registry ID (e.g., "gmeow-vanguard")
 * @param originOverride - Optional origin override
 * @returns Full frame URL
 */
export function buildBadgeShareFrameUrl(
  fid: number | string,
  badgeId: string,
  originOverride?: string | null
): string {
  const origin = resolveOrigin(originOverride)
  if (!origin) return ''

  const params = new URLSearchParams()
  params.set('fid', String(fid))
  params.set('badgeId', badgeId)

  return `${origin}/api/frame/badgeShare?${params.toString()}`
}

/**
 * Build badge share OG image URL
 * 
 * @param fid - Farcaster ID
 * @param badgeId - Badge registry ID
 * @param originOverride - Optional origin override
 * @returns Full OG image URL
 */
export function buildBadgeShareImageUrl(
  fid: number | string,
  badgeId: string,
  originOverride?: string | null
): string {
  const origin = resolveOrigin(originOverride)
  if (!origin) return ''

  const params = new URLSearchParams()
  params.set('fid', String(fid))
  params.set('badgeId', badgeId)

  return `${origin}/api/frame/badgeShare/image?${params.toString()}`
}

/**
 * Build share cast text for badge
 * 
 * @param badge - User badge data
 * @param username - Optional username for personalization
 * @param bestFriendUsernames - Optional array of best friend usernames for viral tagging (e.g., ['alice', 'bob'])
 * @returns Share text for Warpcast composer
 * 
 * @example
 * buildBadgeShareText(badge, 'alice', ['bob', 'charlie'])
 * // Returns: "Just earned the Vanguard badge (Mythic tier) on @gmeowbased! 🎖️ Check it out @bob @charlie!"
 */
export function buildBadgeShareText(
  badge: UserBadge,
  username?: string,
  bestFriendUsernames?: string[]
): string {
  const badgeName = (badge.metadata as { name?: string })?.name || badge.badgeType
  const tierLabel = badge.tier.charAt(0).toUpperCase() + badge.tier.slice(1)

  // Tier-specific emoji mapping (viral appeal)
  const tierEmojis: Record<string, string> = {
    mythic: '🌟',
    legendary: '👑',
    epic: '💎',
    rare: '✨',
    common: '🎖️',
  }
  const tierEmoji = tierEmojis[badge.tier.toLowerCase()] || '🎖️'

  // Build base message
  let text = username
    ? `Just earned the ${badgeName} badge (${tierLabel} tier) on @gmeowbased! ${tierEmoji}`
    : `Check out this ${badgeName} badge (${tierLabel} tier) from @gmeowbased! ${tierEmoji}`

  // Add viral tagging (best friends mention)
  if (bestFriendUsernames && bestFriendUsernames.length > 0) {
    // Tag up to 3 best friends for optimal viral spread
    const tagsToUse = bestFriendUsernames.slice(0, 3)
    const tagString = tagsToUse.map(u => `@${u.replace(/^@/, '')}`).join(' ')
    text += ` Check it out ${tagString}!`
  } else {
    // Default CTA without tags
    text += ' Check out my collection!'
  }

  return text
}

/**
 * Get block explorer URL for minted badge
 * 
 * @param badge - User badge with chain and txHash
 * @returns Block explorer URL or null
 */
export function getBadgeExplorerUrl(badge: UserBadge): string | null {
  if (!badge.minted || !badge.txHash) return null

  const chain = badge.chain?.toLowerCase()

  const explorerMap: Record<string, string> = {
    base: 'https://basescan.org',
    op: 'https://optimistic.etherscan.io',
    optimism: 'https://optimistic.etherscan.io',
    celo: 'https://celoscan.io',
    unichain: 'https://unichain.explorer.com',
    ink: 'https://explorer.inkonchain.com',
  }

  const explorerBase = chain ? explorerMap[chain] : null
  if (!explorerBase) return null

  return `${explorerBase}/tx/${badge.txHash}`
}

/**
 * Validate badge ID format
 * 
 * @param badgeId - Badge registry ID
 * @returns True if valid format
 */
export function isValidBadgeId(badgeId: string): boolean {
  if (!badgeId || typeof badgeId !== 'string') return false
  // Badge IDs should be lowercase with hyphens (e.g., "gmeow-vanguard")
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(badgeId)
}

/**
 * Validate Farcaster ID
 * 
 * @param fid - Farcaster ID
 * @returns True if valid FID
 */
export function isValidFid(fid: number | string): boolean {
  const parsed = typeof fid === 'string' ? parseInt(fid, 10) : fid
  return Number.isInteger(parsed) && parsed > 0
}

/**
 * Format badge assignment date
 * 
 * @param dateString - ISO date string
 * @returns Formatted date (e.g., "Jan 15, 2025")
 */
export function formatBadgeDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return 'Unknown date'
  }
}

/**
 * Get tier gradient colors for OG images
 * 
 * @param tier - Badge tier
 * @returns Gradient color stops
 */
export function getTierGradient(tier: string): { start: string; end: string } {
  const gradients: Record<string, { start: string; end: string }> = {
    mythic: { start: '#9C27FF', end: '#7B1DD9' },
    legendary: { start: '#FFD966', end: '#FFA500' },
    epic: { start: '#61DFFF', end: '#3B82F6' },
    rare: { start: '#A18CFF', end: '#7C5CFF' },
    common: { start: '#D3D7DC', end: '#9CA3AF' },
  }

  return gradients[tier.toLowerCase()] || gradients.common
}

/**
 * Fetch user's best friends from Neynar API (for viral tagging)
 * 
 * Returns up to 5 relevant followers (best friends) based on engagement.
 * Uses Neynar's "relevant followers" algorithm.
 * 
 * @param fid - Farcaster ID
 * @returns Array of best friend usernames (max 5)
 * 
 * @example
 * const friends = await fetchBestFriendsForSharing(14206);
 * // Returns: ['alice', 'bob', 'charlie']
 */
export async function fetchBestFriendsForSharing(fid: number): Promise<string[]> {
  // Validate FID
  if (!fid || fid <= 0) {
    return []
  }

  // Check for Neynar API key
  const apiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY
  if (!apiKey) {
    console.warn('[fetchBestFriendsForSharing] NEYNAR_API_KEY not configured')
    return []
  }

  try {
    // Call Neynar Best Friends API (relevant followers)
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/followers/relevant?target_fid=${fid}&viewer_fid=${fid}`,
      {
        headers: {
          'x-api-key': apiKey,
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      console.error('[fetchBestFriendsForSharing] API error:', response.status)
      return []
    }

    const result = await response.json()

    // Extract usernames from relevant followers
    const followers = result.users || result.result?.users || []
    const usernames = followers
      .slice(0, 5) // Max 5 best friends
      .map((user: { username?: string }) => user.username)
      .filter((username: string | undefined): username is string => Boolean(username))

    return usernames
  } catch (error) {
    console.error('[fetchBestFriendsForSharing] Exception:', error)
    return []
  }
}
