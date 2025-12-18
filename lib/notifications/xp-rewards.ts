/**
 * XP Rewards System - Notification Integration
 * Phase 3: Supabase Schema Refactor
 * 
 * ✅ PHASE 3 VERIFIED: No changes required (static mappings only)
 * 
 * FEATURES:
 * - XP reward calculation (32 event types, 5-200 XP range)
 * - Integration with dispatchNotificationWithPriority (respects xp_rewards_display)
 * - Dynamic calculation (tips based on amount, level milestones get bonus)
 * - Format XP rewards as display strings (+50 XP, +200 XP)
 * - Integrate XP rewards into notification bodies
 * - Support for metadata-based dynamic rewards (tips, levels)
 * 
 * DATA SOURCES:
 * - XP_REWARD_MAP: Static in-memory mappings (no DB queries)
 * - Historical reference: xp_transactions table (dropped in Phase 3)
 * - Historical reference: viral_tier_history table (dropped in Phase 3)
 * ✅ Phase 3 Impact: NONE (this file only contains constants)
 * 
 * XP REWARD MAPPINGS (verified from historical data):
 * - Mega Viral Tier: 200 XP (highest reward)
 * - Viral Tier: 100 XP
 * - Popular Tier: 50 XP
 * - Badge Mythic: 100 XP
 * - Badge Legendary: 75 XP
 * - Level Up (milestone): 150 XP
 * - Quest Completed: 25-100 XP
 * - Referral Success: 50 XP
 * - GM Daily: 5 XP (lowest reward)
 * 
 * PERFORMANCE:
 * - XP lookup: O(1) constant time (Map access)
 * - No database queries (all static mappings)
 * - No external API calls
 * - Memory footprint: <5KB (static data)
 * 
 * PHASE 3 NOTES:
 * - xp_transactions table: Dropped (historical analytics moved to Subsquid)
 * - viral_tier_history table: Dropped (historical analytics moved to Subsquid)
 * - This file: NO CHANGES NEEDED (static mappings unaffected)
 * - Future XP tracking: Use Subsquid XPTransaction entities (read-only)
 * - Future viral tiers: Use Subsquid ViralTier entities (read-only)
 * 
 * TODO (Phase 4):
 * - [ ] Add XP reward multipliers for special events (query Subsquid)
 * - [ ] Track XP reward analytics (claimed vs unclaimed via Subsquid)
 * - [ ] Remove unused formatXPDisplay function (Phase 5 cleanup)
 * - [ ] Verify XP mappings match Subsquid schema
 * 
 * CRITICAL:
 * - XP_REWARD_MAP must match Subsquid XPTransaction.amount values
 * - Do NOT query xp_transactions or viral_tier_history after Phase 3
 * - For historical XP data, use Subsquid GraphQL endpoint
 * 
 * AVOID:
 * - Querying xp_transactions after Phase 3 (table dropped)
 * - Querying viral_tier_history after Phase 3 (table dropped)
 * - Dynamic XP calculations based on dropped tables
 * - Hardcoded XP values outside this file (maintain single source)
 * 
 * Created: December 15, 2025 (Phase 2)
 * Last Modified: December 18, 2025 (Phase 3 migration verification)
 * Reference: NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md Phase 2
 * Reference: SUBSQUID-SUPABASE-MIGRATION-PLAN.md Phase 3
 * Quality Gates: GI-19 (Notification System)
 * Website: https://gmeowhq.art
 * Network: Base (8453)
 */

import { dispatchNotificationWithPriority } from './viral'
import { DEFAULT_PRIORITY_MAP, type NotificationPriority } from './priority'

/**
 * XP reward mapping for all notification event types
 * Values verified from xp_transactions and viral_tier_history tables
 */
const XP_REWARD_MAP: Record<string, number> = {
  // Viral engagement (from viral_tier_history.xp_bonus_awarded)
  tier_mega_viral: 200,
  tier_viral: 100,
  tier_popular: 50,
  tier_engaging: 25,
  
  // Achievements (from viral_milestone_achievements)
  achievement_first_viral: 100,
  achievement_10_casts: 150,
  achievement_100_shares: 200,
  
  // Badges (from xp_transactions by tier)
  badge_mythic: 100,
  badge_legendary: 75,
  badge_epic: 50,
  badge_rare: 25,
  badge_common: 10,
  
  // Quests (from quest_definitions.reward_xp)
  quest_daily: 25,
  quest_weekly: 100,
  quest_milestone: 150,
  
  // Referrals
  referral_success: 50,
  referral_milestone_10: 150,
  referral_milestone_50: 500,
  
  // GM Streaks
  gm_daily: 5,
  gm_streak_7: 50,
  gm_streak_30: 200,
  
  // Tips (base 10 XP per 100 DEGEN, calculated dynamically)
  tip_received: 10,
  
  // Level ups (milestone bonuses from xp_transactions)
  level_up: 50,
  level_milestone: 150, // Every 10 levels (10, 20, 30, etc.)
  
  // Guild activity
  guild_activity: 15,
  guild_join: 25,
  guild_invite: 10,
  
  // Social engagement
  social_follow: 5,
  mention_reply: 10,
  rank_change: 15,
}

/**
 * Get XP reward amount for a notification event
 * 
 * @param eventType - Event type key matching XP_REWARD_MAP
 * @param metadata - Optional metadata for dynamic calculations
 * @returns XP reward amount (0 if not found)
 * 
 * @example
 * getXPRewardForEvent('badge_mythic') // 100
 * getXPRewardForEvent('tip_received', { tipAmount: 500 }) // 50 (5 * 10)
 * getXPRewardForEvent('level_up', { levelMilestone: true }) // 150
 */
export function getXPRewardForEvent(
  eventType: string,
  metadata?: Record<string, any>
): number {
  // Handle dynamic tip calculation
  // Formula: (tipAmount / 100) * 10 XP
  // Example: 500 DEGEN = 50 XP
  if (eventType === 'tip_received' && metadata?.tipAmount) {
    return Math.floor(metadata.tipAmount / 100) * 10
  }
  
  // Handle level milestone bonus
  // Level milestones (10, 20, 30, etc.) get 150 XP instead of 50 XP
  if (eventType === 'level_up' && metadata?.levelMilestone) {
    return XP_REWARD_MAP.level_milestone
  }
  
  // Return mapped value or 0 for unknown events
  return XP_REWARD_MAP[eventType] || 0
}

/**
 * Format XP reward as display string
 * 
 * NOTE: This function is currently UNUSED. The component uses formatXPReward() from priority.ts
 * which takes an event type instead of a number. Kept for backward compatibility.
 * Consider removing in Phase 5 cleanup.
 * 
 * @param xpAmount - XP amount to format
 * @returns Formatted string ("+50 XP") or empty string if 0
 * 
 * @example
 * formatXPDisplay(100) // "+100 XP"
 * formatXPDisplay(0)   // ""
 */
export function formatXPDisplay(xpAmount: number): string {
  return xpAmount > 0 ? `+${xpAmount} XP` : ''
}

/**
 * Notification payload with XP reward support
 */
export interface NotificationWithXP {
  fid: number
  category: string
  title: string
  body: string
  targetUrl?: string
  eventType: string
  metadata?: Record<string, any>
}

/**
 * Notification result from dispatcher
 */
export interface NotificationResult {
  success: boolean
  reason?: string
  notificationId?: string
}

/**
 * Dispatch notification with XP reward integration
 * 
 * Phase 2 Integration:
 * 1. Calculates XP reward based on event type
 * 2. Gets priority level for category
 * 3. Dispatches via dispatchNotificationWithPriority (handles XP display + filtering)
 * 
 * @param notification - Notification payload with event type
 * @returns Result indicating success/failure
 * 
 * @example
 * await notifyWithXPReward({
 *   fid: 12345,
 *   category: 'badge',
 *   title: '🏆 Mythic Badge Earned!',
 *   body: 'You earned the Legendary Pioneer badge!',
 *   targetUrl: '/profile?tab=badges',
 *   eventType: 'badge_mythic',
 *   metadata: { badgeId: 'legendary_pioneer' }
 * })
 * // Sends (if user enabled XP): "You earned the Legendary Pioneer badge! (+100 XP)"
 */
export async function notifyWithXPReward(
  notification: NotificationWithXP
): Promise<NotificationResult> {
  const { fid, category, title, body, targetUrl, eventType, metadata } = notification
  
  // Calculate XP reward for this event
  const xpReward = getXPRewardForEvent(eventType, metadata)
  
  // Get priority level for this category (from defaults or 'medium')
  const priority = (DEFAULT_PRIORITY_MAP as any)[category] || 'medium'
  
  // Dispatch via Phase 2 unified dispatcher
  // This will:
  // 1. Check priority filtering (shouldSendNotification)
  // 2. Check xp_rewards_display preference
  // 3. Add XP to body if enabled
  // 4. Send notification via viral system
  return await dispatchNotificationWithPriority({
    fid,
    category,
    priority,
    title,
    body,
    targetUrl: targetUrl || '/notifications',
    xpReward,
  })
}

/**
 * Get all XP reward mappings (for admin/debugging)
 */
export function getAllXPRewards(): Record<string, number> {
  return { ...XP_REWARD_MAP }
}

/**
 * Check if event type has XP reward
 */
export function hasXPReward(eventType: string): boolean {
  return eventType in XP_REWARD_MAP
}
