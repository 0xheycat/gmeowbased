// Rarity Tier System for Phase 0
// Maps Neynar scores to visual tiers with styling

export type RarityTier = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

export interface TierInfo {
  tier: RarityTier
  name: string
  label: string
  minScore: number
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    gradient: {
      start: string
      end: string
    }
    glow: string
  }
  borderStyle: {
    width: number
    opacity: number
  }
  labelEmoji: string
}

const TIER_CONFIGS: Record<RarityTier, TierInfo> = {
  mythic: {
    tier: 'mythic',
    name: 'Mythic',
    label: 'MYTHIC OG',
    minScore: 1.0,
    colors: {
      primary: '#FFD700',
      secondary: '#FFA500',
      accent: '#FFFFFF',
      background: '#1a0a00',
      gradient: {
        start: '#FFD700',
        end: '#FF8C00',
      },
      glow: 'rgba(255, 215, 0, 0.6)',
    },
    borderStyle: {
      width: 4,
      opacity: 1.0,
    },
    labelEmoji: '👑',
  },
  legendary: {
    tier: 'legendary',
    name: 'Legendary',
    label: 'LEGENDARY',
    minScore: 0.8,
    colors: {
      primary: '#9D4EDD',
      secondary: '#7B2CBF',
      accent: '#E0AAFF',
      background: '#10002b',
      gradient: {
        start: '#9D4EDD',
        end: '#5A189A',
      },
      glow: 'rgba(157, 78, 221, 0.5)',
    },
    borderStyle: {
      width: 3,
      opacity: 0.9,
    },
    labelEmoji: '⚡',
  },
  epic: {
    tier: 'epic',
    name: 'Epic',
    label: 'EPIC',
    minScore: 0.5,
    colors: {
      primary: '#3A86FF',
      secondary: '#0057FF',
      accent: '#8EC5FC',
      background: '#001845',
      gradient: {
        start: '#3A86FF',
        end: '#0057FF',
      },
      glow: 'rgba(58, 134, 255, 0.4)',
    },
    borderStyle: {
      width: 3,
      opacity: 0.8,
    },
    labelEmoji: '🌟',
  },
  rare: {
    tier: 'rare',
    name: 'Rare',
    label: 'RARE',
    minScore: 0.3,
    colors: {
      primary: '#06FFA5',
      secondary: '#00D98C',
      accent: '#7FFFD4',
      background: '#001a14',
      gradient: {
        start: '#06FFA5',
        end: '#00D98C',
      },
      glow: 'rgba(6, 255, 165, 0.3)',
    },
    borderStyle: {
      width: 2,
      opacity: 0.7,
    },
    labelEmoji: '✨',
  },
  common: {
    tier: 'common',
    name: 'Common',
    label: 'GMEOW',
    minScore: 0,
    colors: {
      primary: '#94A3B8',
      secondary: '#64748B',
      accent: '#CBD5E1',
      background: '#0f172a',
      gradient: {
        start: '#94A3B8',
        end: '#64748B',
      },
      glow: 'rgba(148, 163, 184, 0.2)',
    },
    borderStyle: {
      width: 2,
      opacity: 0.5,
    },
    labelEmoji: '🐱',
  },
}

/**
 * Calculate rarity tier from Neynar score
 * @param score Neynar score (typically 0.0 to 1.0+, can be null)
 * @returns TierInfo object with tier details and styling
 */
export function calculateTier(score: number | null | undefined): TierInfo {
  if (score == null || !Number.isFinite(score)) {
    return TIER_CONFIGS.common
  }

  // Clamp score to reasonable range (0 to 2.0)
  const clampedScore = Math.max(0, Math.min(2.0, score))

  if (clampedScore >= 1.0) return TIER_CONFIGS.mythic
  if (clampedScore >= 0.8) return TIER_CONFIGS.legendary
  if (clampedScore >= 0.5) return TIER_CONFIGS.epic
  if (clampedScore >= 0.3) return TIER_CONFIGS.rare
  return TIER_CONFIGS.common
}

/**
 * Get tier info by tier name
 */
export function getTierByName(tier: RarityTier): TierInfo {
  return TIER_CONFIGS[tier] || TIER_CONFIGS.common
}

/**
 * Get all tier configs (for documentation/testing)
 */
export function getAllTiers(): TierInfo[] {
  return Object.values(TIER_CONFIGS)
}

/**
 * Check if user is OG (Mythic tier, score >= 1.0)
 */
export function isOGUser(score: number | null | undefined): boolean {
  if (score == null || !Number.isFinite(score)) return false
  return score >= 1.0
}

/**
 * Format tier for display
 */
export function formatTierLabel(tier: TierInfo): string {
  return `${tier.labelEmoji} ${tier.label}`
}
