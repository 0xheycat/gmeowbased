/**
 * Viral Bonus Calculator
 * 
 * Calculates engagement scores and viral bonus XP for badge share casts.
 * Implements tiered reward system based on cast performance.
 * 
 * Quality Gates Applied:
 * - GI-7: Spec sync with Neynar cast engagement API
 * - GI-11: Safe score calculations with bounds checking
 * - GI-13: Clear tier progression and reward transparency
 */

export type ViralTier = 'mega_viral' | 'viral' | 'popular' | 'engaging' | 'active' | 'none'

export type EngagementMetrics = {
  likes: number
  recasts: number
  replies: number
}

export type ViralTierConfig = {
  name: string
  emoji: string
  xp: number
  minScore: number
  color: string
}

// Engagement score weights (GI-7: Aligned with Neynar engagement patterns)
export const ENGAGEMENT_WEIGHTS = {
  RECAST: 10,  // Highest value - amplifies reach
  REPLY: 5,    // High value - drives conversation
  LIKE: 2,     // Medium value - shows approval
} as const

// Viral tier thresholds (GI-13: Clear progression with visual feedback)
export const VIRAL_TIERS: Record<ViralTier, ViralTierConfig> = {
  mega_viral: {
    name: 'Mega Viral',
    emoji: '🔥',
    xp: 500,
    minScore: 100,
    color: '#FF4500',
  },
  viral: {
    name: 'Viral',
    emoji: '⚡',
    xp: 250,
    minScore: 50,
    color: '#FFD700',
  },
  popular: {
    name: 'Popular',
    emoji: '✨',
    xp: 100,
    minScore: 20,
    color: '#61DFFF',
  },
  engaging: {
    name: 'Engaging',
    emoji: '💫',
    xp: 50,
    minScore: 10,
    color: '#A18CFF',
  },
  active: {
    name: 'Active',
    emoji: '🌟',
    xp: 25,
    minScore: 5,
    color: '#D3D7DC',
  },
  none: {
    name: 'None',
    emoji: '',
    xp: 0,
    minScore: 0,
    color: '#808080',
  },
}

/**
 * Calculate engagement score from metrics
 * 
 * @param metrics - Cast engagement metrics (likes, recasts, replies)
 * @returns Weighted engagement score
 * 
 * GI-11: Bounds checking and safe math operations
 */
export function calculateEngagementScore(metrics: EngagementMetrics): number {
  // GI-11: Input validation
  const safeLikes = Math.max(0, Math.floor(metrics.likes || 0))
  const safeRecasts = Math.max(0, Math.floor(metrics.recasts || 0))
  const safeReplies = Math.max(0, Math.floor(metrics.replies || 0))
  
  const score = 
    (safeRecasts * ENGAGEMENT_WEIGHTS.RECAST) +
    (safeReplies * ENGAGEMENT_WEIGHTS.REPLY) +
    (safeLikes * ENGAGEMENT_WEIGHTS.LIKE)
  
  // GI-11: Return bounded result
  return Math.max(0, Math.floor(score))
}

/**
 * Determine viral tier from engagement score
 * 
 * @param score - Calculated engagement score
 * @returns Viral tier configuration
 * 
 * GI-13: Clear tier progression with visual feedback
 */
export function getViralTier(score: number): ViralTierConfig {
  // GI-11: Safe score handling
  const safeScore = Math.max(0, Math.floor(score || 0))
  
  // Check tiers in descending order (GI-13: Highest tier first)
  if (safeScore >= VIRAL_TIERS.mega_viral.minScore) return VIRAL_TIERS.mega_viral
  if (safeScore >= VIRAL_TIERS.viral.minScore) return VIRAL_TIERS.viral
  if (safeScore >= VIRAL_TIERS.popular.minScore) return VIRAL_TIERS.popular
  if (safeScore >= VIRAL_TIERS.engaging.minScore) return VIRAL_TIERS.engaging
  if (safeScore >= VIRAL_TIERS.active.minScore) return VIRAL_TIERS.active
  
  return VIRAL_TIERS.none
}

/**
 * Calculate viral bonus XP from metrics
 * 
 * @param metrics - Cast engagement metrics
 * @returns Object with score, tier, and XP
 * 
 * GI-13: Transparent calculation with breakdown
 */
export function calculateViralBonus(metrics: EngagementMetrics): {
  score: number
  tier: ViralTierConfig
  xp: number
  breakdown: {
    recasts: number
    replies: number
    likes: number
  }
} {
  const score = calculateEngagementScore(metrics)
  const tier = getViralTier(score)
  
  // GI-13: Provide calculation breakdown for transparency
  const breakdown = {
    recasts: (metrics.recasts || 0) * ENGAGEMENT_WEIGHTS.RECAST,
    replies: (metrics.replies || 0) * ENGAGEMENT_WEIGHTS.REPLY,
    likes: (metrics.likes || 0) * ENGAGEMENT_WEIGHTS.LIKE,
  }
  
  return {
    score,
    tier,
    xp: tier.xp,
    breakdown,
  }
}

/**
 * Check if metrics have increased since last update
 * 
 * @param current - Current engagement metrics
 * @param previous - Previous engagement metrics
 * @returns True if any metric increased
 * 
 * GI-11: Prevent duplicate XP awards
 */
export function hasMetricsIncreased(
  current: EngagementMetrics,
  previous: EngagementMetrics
): boolean {
  return (
    current.likes > previous.likes ||
    current.recasts > previous.recasts ||
    current.replies > previous.replies
  )
}

/**
 * Calculate incremental XP bonus (only award for new engagement)
 * 
 * @param current - Current engagement metrics
 * @param previous - Previous engagement metrics
 * @returns Incremental XP to award
 * 
 * GI-11: Idempotent XP awards - only reward new engagement
 */
export function calculateIncrementalBonus(
  current: EngagementMetrics,
  previous: EngagementMetrics
): number {
  const currentBonus = calculateViralBonus(current)
  const previousBonus = calculateViralBonus(previous)
  
  // GI-11: Only award difference (no double-dipping)
  const incrementalXP = Math.max(0, currentBonus.xp - previousBonus.xp)
  
  return incrementalXP
}

/**
 * Get all tiers in descending order (for leaderboards/displays)
 * 
 * @returns Array of viral tiers sorted by XP (highest first)
 * 
 * GI-13: Consistent tier ordering for UI
 */
export function getViralTiersDescending(): ViralTierConfig[] {
  return [
    VIRAL_TIERS.mega_viral,
    VIRAL_TIERS.viral,
    VIRAL_TIERS.popular,
    VIRAL_TIERS.engaging,
    VIRAL_TIERS.active,
  ]
}

/**
 * Format engagement metrics for display
 * 
 * @param metrics - Engagement metrics
 * @returns Formatted string (e.g., "45 likes, 12 recasts, 8 replies")
 * 
 * GI-13: Human-readable metric display
 */
export function formatEngagementMetrics(metrics: EngagementMetrics): string {
  const parts: string[] = []
  
  if (metrics.likes > 0) parts.push(`${metrics.likes} like${metrics.likes !== 1 ? 's' : ''}`)
  if (metrics.recasts > 0) parts.push(`${metrics.recasts} recast${metrics.recasts !== 1 ? 's' : ''}`)
  if (metrics.replies > 0) parts.push(`${metrics.replies} repl${metrics.replies !== 1 ? 'ies' : 'y'}`)
  
  return parts.join(', ') || 'No engagement yet'
}

/**
 * Estimate time to next tier (for gamification)
 * 
 * @param currentScore - Current engagement score
 * @param currentTier - Current viral tier
 * @returns Object with next tier info and required metrics
 * 
 * GI-13: Gamification - show progress to next tier
 */
export function estimateNextTier(currentScore: number, currentTier: ViralTierConfig): {
  nextTier: ViralTierConfig | null
  scoreNeeded: number
  suggestedEngagement: string
} | null {
  const tiers = getViralTiersDescending()
  const currentIndex = tiers.findIndex(t => t.name === currentTier.name)
  
  if (currentIndex === 0) {
    // Already at highest tier
    return null
  }
  
  const nextTier = tiers[currentIndex - 1]
  const scoreNeeded = nextTier.minScore - currentScore
  
  // Calculate suggested engagement to reach next tier
  const recasts = Math.ceil(scoreNeeded / ENGAGEMENT_WEIGHTS.RECAST)
  const likes = Math.ceil(scoreNeeded / ENGAGEMENT_WEIGHTS.LIKE)
  
  const suggestedEngagement = recasts <= 5
    ? `${recasts} more recast${recasts !== 1 ? 's' : ''}`
    : `${likes} more likes or ${recasts} recasts`
  
  return {
    nextTier,
    scoreNeeded,
    suggestedEngagement,
  }
}
