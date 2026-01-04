/**
 * Quest Creation Cost Calculator
 * Phase 7.5: Comprehensive Headers
 * 
 * FEATURES:
 * - Calculates BASE POINTS cost for creating quests
 * - Category-based base costs (social=50, onchain=200, hybrid=250)
 * - Task count pricing (20 points per task)
 * - Reward cost calculation (10:1 XP ratio, 1:1 points ratio)
 * - Badge creation cost (50 points for new badges)
 * - Detailed cost breakdown (base, tasks, rewards, badge)
 * - Affordability checking with shortage calculation
 * - Refund calculation for expired quests
 * - Type-safe cost interfaces
 * 
 * TODO:
 * - Add dynamic pricing based on quest complexity
 * - Implement surge pricing during high-demand periods
 * - Add creator reputation discounts (trusted creators pay less)
 * - Support promotional cost reductions (events, partnerships)
 * - Add cost estimation API for wizard preview
 * - Implement cost audit logging
 * - Add A/B testing for pricing models
 * 
 * CRITICAL:
 * - Cost calculations must match points-escrow-service exactly
 * - Never allow negative costs (validation required)
 * - Badge costs must be charged only once per quest
 * - Refund calculations must account for already-claimed rewards
 * 
 * SUGGESTIONS:
 * - Consider caching cost configurations in Redis
 * - Add cost breakdown UI component for transparency
 * - Implement cost alerts when approaching user's balance
 * - Add cost comparison vs average quest cost
 * 
 * AVOID:
 * - Changing cost formulas without migration plan
 * - Allowing client-side cost calculation only (must validate server-side)
 * - Hardcoding cost values (use configuration)
 * - Forgetting to update refund logic when changing costs
 * 
 * Created: December 2025
 * Last Modified: December 17, 2025
 * Currency: BASE POINTS (not Viral XP)
 * Quality Gates: GI-16 (Economic System), GI-14 (Input Validation)
 */

export interface QuestCostBreakdown {
  base: number
  tasks: number
  rewards: number
  pointsEscrow: number
  badge: number
  total: number
}

export interface QuestCostInput {
  category: 'onchain' | 'social' | 'creative' | 'learn' | 'hybrid'
  taskCount: number
  rewardXp: number
  hasNewBadge?: boolean
  rewardPoints?: number
  maxParticipants?: number // For calculating total escrow (reward × participants)
}

/**
 * Calculate quest creation cost with detailed breakdown
 */
export function calculateQuestCost(input: QuestCostInput): QuestCostBreakdown {
  // Base cost varies by category
  const baseCosts: Record<typeof input.category, number> = {
    social: 50,      // Encourage community engagement
    creative: 75,    // Moderate cost
    learn: 100,      // Standard cost
    onchain: 200,    // Higher cost (onchain verification more complex)
    hybrid: 250      // Highest cost (multiple verification types)
  }
  
  const base = baseCosts[input.category] || 100
  
  // Cost per task (20 points each)
  const tasks = input.taskCount * 20
  
  // Reward cost (10:1 ratio - 100 XP = 10 points cost)
  const xpRewardCost = Math.floor(input.rewardXp / 10)
  
  // Badge creation cost (50 points)
  const badge = input.hasNewBadge ? 50 : 0
  
  // Total escrow for point rewards = (points per user) × (max participants)
  // Example: 100 points/user × 20 participants = 2000 points total escrow
  const pointRewardCost = input.rewardPoints && input.maxParticipants
    ? input.rewardPoints * input.maxParticipants
    : (input.rewardPoints || 0)
  
  const total = base + tasks + xpRewardCost + badge + pointRewardCost
  
  return {
    base,
    tasks,
    rewards: xpRewardCost,
    pointsEscrow: pointRewardCost,
    badge,
    total
  }
}

/**
 * Validate user has sufficient points
 */
export function canAffordQuest(
  userPoints: number,
  questCost: number
): { affordable: boolean; shortage?: number } {
  if (userPoints >= questCost) {
    return { affordable: true }
  }
  
  return {
    affordable: false,
    shortage: questCost - userPoints
  }
}

/**
 * Calculate refund amount when quest expires
 */
export function calculateRefund(
  escrowedPoints: number,
  participantCount: number,
  rewardPerUser: number
): number {
  // If no participants, full refund
  if (participantCount === 0) {
    return escrowedPoints
  }
  
  // Refund unused portion
  const usedPoints = participantCount * rewardPerUser
  const refund = Math.max(0, escrowedPoints - usedPoints)
  
  return refund
}

/**
 * Estimate ROI for quest creator
 * Returns expected viral reach vs cost
 */
export interface QuestROI {
  cost: number
  expectedParticipants: number
  expectedReach: number // estimated impressions
  roi: number // reach per point spent
}

export function estimateQuestROI(
  cost: number,
  category: QuestCostInput['category'],
  rewardXp: number
): QuestROI {
  // Social quests have higher participation
  const baseParticipants: Record<typeof category, number> = {
    social: 100,
    creative: 50,
    learn: 75,
    onchain: 30,
    hybrid: 40
  }
  
  // Higher rewards attract more participants
  const rewardMultiplier = Math.min(2, 1 + (rewardXp / 500))
  
  const expectedParticipants = Math.floor(
    baseParticipants[category] * rewardMultiplier
  )
  
  // Average reach per participant (casts, followers, etc.)
  const reachPerParticipant = 50
  
  const expectedReach = expectedParticipants * reachPerParticipant
  
  const roi = cost > 0 ? expectedReach / cost : 0
  
  return {
    cost,
    expectedParticipants,
    expectedReach,
    roi
  }
}

/**
 * Get tier-based max active quests
 */
export function getMaxActiveQuests(
  userTier: string,
  totalXp: number
): number {
  // Tier mapping
  const tierLimits: Record<string, number> = {
    'Mythic GM': 20,
    'Diamond GM': 15,
    'Platinum GM': 12,
    'Gold GM': 10,
    'Silver GM': 8,
    'Bronze GM': 5,
    'Iron GM': 3,
    'Copper GM': 2,
    'Tin GM': 1,
    'Unranked GM': 1
  }
  
  // XP-based fallback
  if (totalXp >= 10000) return 20
  if (totalXp >= 5000) return 15
  if (totalXp >= 2500) return 10
  if (totalXp >= 1000) return 5
  if (totalXp >= 500) return 3
  
  return tierLimits[userTier] || 1
}

/**
 * Validate quest duration meets minimum requirements
 */
export function validateQuestDuration(
  startDate: Date,
  endDate: Date
): { valid: boolean; error?: string; durationDays: number } {
  const durationMs = endDate.getTime() - startDate.getTime()
  const durationDays = Math.floor(durationMs / (24 * 60 * 60 * 1000))
  
  // Minimum 7 days to prevent spam
  if (durationDays < 7) {
    return {
      valid: false,
      error: 'Quest must be active for at least 7 days',
      durationDays
    }
  }
  
  // Maximum 90 days
  if (durationDays > 90) {
    return {
      valid: false,
      error: 'Quest cannot be active for more than 90 days',
      durationDays
    }
  }
  
  return { valid: true, durationDays }
}

/**
 * Calculate escrow amount needed
 * Includes creation cost + point rewards for participants
 */
export function calculateEscrowAmount(
  creationCost: number,
  maxParticipants: number,
  pointRewardPerUser: number
): number {
  const creatorCost = creationCost
  const participantRewards = maxParticipants * pointRewardPerUser
  
  return creatorCost + participantRewards
}
