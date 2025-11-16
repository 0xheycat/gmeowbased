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
 * @returns Share text for Warpcast composer
 */
export function buildBadgeShareText(badge: UserBadge, username?: string): string {
  const badgeName = (badge.metadata as { name?: string })?.name || badge.badgeType
  const tierLabel = badge.tier.charAt(0).toUpperCase() + badge.tier.slice(1)

  if (username) {
    return `Just earned the ${badgeName} badge (${tierLabel} tier) on @gmeowbased! 🎖️ Check out my collection!`
  }

  return `Check out this ${badgeName} badge (${tierLabel} tier) from @gmeowbased! 🎖️`
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
