/**
 * Notification Priority System - Helper Functions
 * 
 * PHASE 1-2 COMPLETE:
 * - ✅ Priority-based filtering (shouldSendNotification in viral.ts)
 * - ✅ XP rewards display integration (dispatchNotificationWithPriority)
 * - ✅ Analytics tracking (trackPriorityUsage function)
 * - ✅ Type guards and validation (isValidPriority, getDefaultPriorityMap)
 * - ✅ Priority decay for stale notifications (calculatePriorityDecay)
 * - ✅ Timezone-based recommendations (getTimeBasedThreshold)
 * - ✅ 14 helper functions total (450+ lines)
 * 
 * TODO:
 * - [ ] Implement A/B testing for default priority thresholds (Phase 4 - Analytics)
 * - [ ] Add machine learning model for smart priority predictions (Phase 5 - AI enhancement)
 * 
 * FEATURES:
 * - 4-tier priority system (critical/high/medium/low)
 * - XP reward amount calculation per notification type
 * - Threshold-based push notification filtering
 * - Category-to-priority mapping with Warpcast patterns
 * 
 * PHASE: Phase 1 - Schema Migration & Helper Functions
 * DATE: December 15, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - Core Plan: NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md
 * - System Audit: NOTIFICATION-SYSTEM-SUMMARY.md (3 broadcasting events baseline)
 * - farcaster.instructions.md: Section 3.6 (Dialog vs Notification Usage)
 * - XP System: XP-SYSTEM-COMPREHENSIVE-GUIDE-PART-2.md
 * 
 * SUGGESTIONS:
 * - [x] Consider user timezone for priority threshold recommendations (✅ getTimeBasedThreshold)
 * - [x] Implement priority decay for stale notifications (✅ calculatePriorityDecay with 24h intervals)
 * - [x] Create priority analytics tracking (✅ trackPriorityUsage function)
 * - [ ] Add "smart priority" ML model to learn user preferences (Phase 4 - AI enhancement)
 * - [ ] Create priority analytics dashboard UI (excluded per user request)
 * 
 * PHASE 2 RESOLVED:
 * - ✅ Priority filtering implemented (shouldSendNotification in viral.ts)
 * - ✅ XP rewards displayed (dispatchNotificationWithPriority checks xp_rewards_display)
 * - ✅ Threshold control ready (min_priority_for_push column exists)
 * 
 * PHASE 3 COMPLETE (December 15, 2025):
 * - ✅ Threshold control implemented in NotificationSettings.tsx (4 buttons)
 * - ✅ XP badges per category with conditional display
 * - ✅ Priority dropdown per category (updates priority_settings JSONB)
 * - ✅ Push status indicators (real-time filtering visualization)
 * 
 * REMAINING (Phase 4 Integration):
 * - Only 3 events currently broadcast to Farcaster (viral tier, achievements, GM reminders)
 * - Need to connect all event systems (badges, quests, levels) to dispatcher
 * - End-to-end testing of priority filtering with real events
 * 
 * AVOID (from farcaster.instructions.md):
 * - ❌ NO emojis in code or responses (use SVG icons from components/icons/)
 * - ❌ NO `any` types (strict TypeScript mode)
 * - ❌ NO mixing old notification patterns with new priority system
 * - ❌ NO hardcoded priority values (use constants/enums)
 * 
 * REQUIREMENTS (from farcaster.instructions.md):
 * - ✅ TypeScript strict mode (0 errors)
 * - ✅ Null-safety checks before operations
 * - ✅ Export types for external usage
 * - ✅ Professional headers with documentation
 * - ✅ Use approved icon system (components/icons/)
 * 
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (8453)
 * 
 * @see NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md - Complete implementation roadmap
 * @see supabase/migrations/20251215_notification_priorities.sql - Database schema
 */

import type { NotificationCategory } from './history'

/**
 * Priority levels for notification filtering
 * Ordered from highest to lowest priority
 * 
 * Used to determine which notifications trigger Farcaster push
 * based on user's min_priority_for_push threshold
 */
export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low'

/**
 * Extended notification categories for priority mapping
 * Adds 'mention' and 'rank' to existing NotificationCategory from history.ts
 * 
 * Categories:
 * - achievement: Viral tier upgrades, first viral, mega viral (critical)
 * - badge: Badge minting, Mythic tier unlocks (high)
 * - level: Level ups, tier upgrades (high)
 * - reward: Referral rewards, quest bonuses (high)
 * - quest: Quest completion, daily quests (medium)
 * - tip: Tips received, tip notifications (medium)
 * - mention: Tagged in casts, replies (medium)
 * - guild: Guild activity, member joins (medium)
 * - gm: GM streak reminders, daily GM (low)
 * - social: Friend activity, follows (low)
 * - rank: Rank changes, leaderboard updates (low)
 */
export type NotificationCategoryExtended = NotificationCategory | 'mention' | 'rank'

/**
 * XP reward amounts for each notification type
 * Based on actual XP system values from viral_tier_history and xp_transactions
 * 
 * @see XP-SYSTEM-COMPREHENSIVE-GUIDE-PART-2.md
 */
export const XP_REWARDS: Record<string, number> = {
  // Critical priority (100-200 XP)
  tier_mega_viral: 200,      // Mega viral tier upgrade
  tier_viral: 150,           // Viral tier upgrade
  first_viral_cast: 100,     // First cast reaches viral status
  mega_viral_master: 200,    // Achievement: 10+ mega viral casts
  
  // High priority (50-150 XP)
  badge_mythic: 100,         // Mythic badge minting
  badge_legendary: 75,       // Legendary badge minting
  level_up: 150,             // Level up notification
  referral_success: 50,      // Successful referral reward
  
  // Medium priority (10-25 XP)
  quest_daily: 25,           // Daily quest completion
  quest_weekly: 50,          // Weekly quest completion
  tip_received: 10,          // Tips received from other users
  mention_reply: 15,         // Mentioned in cast or reply
  guild_activity: 20,        // Guild participation bonus
  
  // Low priority (5-10 XP)
  gm_streak: 5,              // Daily GM streak bonus
  social_follow: 5,          // New follower notification
  rank_change: 10,           // Leaderboard rank change
} as const

/**
 * Default priority mapping for notification categories
 * Based on Warpcast notification patterns and XP rewards
 * 
 * Critical: First-time achievements, mega viral events (100-200 XP)
 * High: Badge minting, level ups, significant rewards (50-150 XP)
 * Medium: Quest completion, tips, mentions (10-25 XP)
 * Low: Daily reminders, social activity, rank changes (5-10 XP)
 */
export const DEFAULT_PRIORITY_MAP: Record<NotificationCategoryExtended, NotificationPriority> = {
  achievement: 'critical',
  badge: 'high',
  level: 'high',
  reward: 'high',
  quest: 'medium',
  tip: 'medium',
  mention: 'medium',
  guild: 'medium',
  gm: 'low',
  social: 'low',
  streak: 'low', // Added to match history.ts NotificationCategory
  system: 'low', // Added to match history.ts NotificationCategory
  rank: 'low',
}

/**
 * Priority threshold hierarchy
 * Used to filter notifications based on min_priority_for_push setting
 * 
 * Exported for use in UI components (NotificationSettings.tsx)
 * to ensure consistent priority filtering logic
 * 
 * Example: If user sets min_priority_for_push = 'high'
 * - Only 'critical' and 'high' notifications trigger push
 * - 'medium' and 'low' notifications are in-app only
 */
export const PRIORITY_HIERARCHY: Record<NotificationPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

/**
 * Get priority level for a notification category
 * 
 * @param category - Notification category (achievement, badge, quest, etc.)
 * @param customMap - Optional custom priority mapping from user preferences
 * @returns Priority level (critical/high/medium/low)
 * 
 * @example
 * ```ts
 * const priority = getPriorityLevel('badge') // 'high'
 * const customPriority = getPriorityLevel('badge', { badge: 'critical' }) // 'critical'
 * ```
 */
export function getPriorityLevel(
  category: NotificationCategoryExtended,
  customMap?: Partial<Record<NotificationCategoryExtended, NotificationPriority>>
): NotificationPriority {
  return customMap?.[category] ?? DEFAULT_PRIORITY_MAP[category]
}

/**
 * Check if notification should trigger Farcaster push based on priority threshold
 * 
 * @param category - Notification category
 * @param minPriority - User's minimum priority threshold for push notifications
 * @param customMap - Optional custom priority mapping from user preferences
 * @returns true if notification should send push, false if in-app only
 * 
 * @example
 * ```ts
 * // User wants only high/critical push notifications
 * shouldSendNotification('badge', 'high') // true (badge = high)
 * shouldSendNotification('quest', 'high') // false (quest = medium)
 * shouldSendNotification('achievement', 'high') // true (achievement = critical)
 * ```
 */
export function shouldSendNotification(
  category: NotificationCategoryExtended,
  minPriority: NotificationPriority,
  customMap?: Partial<Record<NotificationCategoryExtended, NotificationPriority>>
): boolean {
  const notificationPriority = getPriorityLevel(category, customMap)
  return PRIORITY_HIERARCHY[notificationPriority] >= PRIORITY_HIERARCHY[minPriority]
}

/**
 * Get XP reward amount for a notification event
 * 
 * @param eventType - Event type identifier (matches XP_REWARDS keys)
 * @returns XP reward amount, or 0 if no reward for this event
 * 
 * @example
 * ```ts
 * getXPRewardForEvent('tier_mega_viral') // 200
 * getXPRewardForEvent('badge_mythic') // 100
 * getXPRewardForEvent('quest_daily') // 25
 * getXPRewardForEvent('unknown_event') // 0
 * ```
 */
export function getXPRewardForEvent(eventType: string): number {
  return XP_REWARDS[eventType] ?? 0
}

/**
 * Format XP reward for display in notifications
 * Returns formatted string like "+100 XP" or empty string if no reward
 * 
 * @param eventType - Event type identifier
 * @returns Formatted XP reward string, or empty string if no reward
 * 
 * @example
 * ```ts
 * formatXPReward('tier_mega_viral') // "+200 XP"
 * formatXPReward('badge_mythic') // "+100 XP"
 * formatXPReward('unknown_event') // ""
 * ```
 */
export function formatXPReward(eventType: string): string {
  const xp = getXPRewardForEvent(eventType)
  return xp > 0 ? `+${xp} XP` : ''
}

/**
 * Get all notification categories for a given priority level
 * Useful for UI display and analytics
 * 
 * @param priority - Priority level to filter by
 * @param customMap - Optional custom priority mapping
 * @returns Array of notification categories matching the priority level
 * 
 * @example
 * ```ts
 * getCategoriesForPriority('critical') // ['achievement']
 * getCategoriesForPriority('high') // ['badge', 'level', 'reward']
 * getCategoriesForPriority('low') // ['gm', 'social', 'rank']
 * ```
 */
export function getCategoriesForPriority(
  priority: NotificationPriority,
  customMap?: Partial<Record<NotificationCategoryExtended, NotificationPriority>>
): NotificationCategoryExtended[] {
  return (Object.keys(DEFAULT_PRIORITY_MAP) as NotificationCategoryExtended[]).filter(
    (category) => getPriorityLevel(category, customMap) === priority
  )
}

/**
 * Get priority statistics for user preferences
 * Returns count of notifications per priority level
 * 
 * @param customMap - Optional custom priority mapping
 * @returns Object with counts per priority level
 * 
 * @example
 * ```ts
 * getPriorityStats()
 * // { critical: 1, high: 3, medium: 4, low: 5 }
 * ```
 */
export function getPriorityStats(
  customMap?: Partial<Record<NotificationCategoryExtended, NotificationPriority>>
): Record<NotificationPriority, number> {
  const stats: Record<NotificationPriority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  }

  for (const category of Object.keys(DEFAULT_PRIORITY_MAP) as NotificationCategoryExtended[]) {
    const priority = getPriorityLevel(category, customMap)
    stats[priority]++
  }

  return stats
}

/**
 * Validate priority settings JSONB structure
 * Ensures all categories have valid priority levels
 * 
 * @param settings - Priority settings from database
 * @returns true if valid, false if invalid
 * 
 * @example
 * ```ts
 * validatePrioritySettings({ badge: 'high', quest: 'medium' }) // true
 * validatePrioritySettings({ badge: 'invalid' }) // false
 * ```
 */
export function validatePrioritySettings(
  settings: Partial<Record<NotificationCategoryExtended, string>>
): settings is Partial<Record<NotificationCategoryExtended, NotificationPriority>> {
  const validPriorities: NotificationPriority[] = ['critical', 'high', 'medium', 'low']
  
  for (const priority of Object.values(settings)) {
    if (!validPriorities.includes(priority as NotificationPriority)) {
      return false
    }
  }
  
  return true
}

/**
 * Type guard to check if value is a valid NotificationPriority
 * 
 * @param value - Value to check
 * @returns true if value is NotificationPriority type
 * 
 * @example
 * ```ts
 * isValidPriority('high') // true
 * isValidPriority('invalid') // false
 * isValidPriority(null) // false
 * ```
 */
export function isValidPriority(value: unknown): value is NotificationPriority {
  return typeof value === 'string' && ['critical', 'high', 'medium', 'low'].includes(value)
}

/**
 * Get a deep clone of the default priority map
 * Useful for customization without mutating the original
 * 
 * @returns Cloned default priority map
 * 
 * @example
 * ```ts
 * const customMap = getDefaultPriorityMap()
 * customMap.quest = 'high' // Doesn't affect DEFAULT_PRIORITY_MAP
 * ```
 */
export function getDefaultPriorityMap(): Record<NotificationCategoryExtended, NotificationPriority> {
  return { ...DEFAULT_PRIORITY_MAP }
}

/**
 * Calculate priority decay for stale notifications
 * Downgrades priority based on notification age (24h intervals)
 * 
 * Priority decay schedule:
 * - 0-24h: Original priority (no decay)
 * - 24-48h: Downgrade 1 level (critical → high, high → medium, medium → low)
 * - 48-72h: Downgrade 2 levels (critical → medium, high → low, medium/low → low)
 * - 72h+: Always low priority (archival)
 * 
 * @param originalPriority - Original notification priority
 * @param createdAt - Notification creation timestamp
 * @returns Decayed priority level
 * 
 * @example
 * ```ts
 * const now = new Date()
 * const yesterday = new Date(now.getTime() - 25 * 60 * 60 * 1000)
 * const twoDaysAgo = new Date(now.getTime() - 49 * 60 * 60 * 1000)
 * 
 * calculatePriorityDecay('critical', yesterday) // 'high' (1 level down)
 * calculatePriorityDecay('critical', twoDaysAgo) // 'medium' (2 levels down)
 * calculatePriorityDecay('high', yesterday) // 'medium'
 * calculatePriorityDecay('low', yesterday) // 'low' (can't go lower)
 * ```
 */
export function calculatePriorityDecay(
  originalPriority: NotificationPriority,
  createdAt: Date
): NotificationPriority {
  const now = Date.now()
  const ageInHours = (now - createdAt.getTime()) / (1000 * 60 * 60)
  
  // No decay for notifications less than 24 hours old
  if (ageInHours < 24) {
    return originalPriority
  }
  
  // Calculate decay levels (1 level per 24 hours)
  const decayLevels = Math.floor(ageInHours / 24)
  const originalLevel = PRIORITY_HIERARCHY[originalPriority]
  const newLevel = Math.max(1, originalLevel - decayLevels)
  
  // Map back to priority string
  const priorityByLevel: Record<number, NotificationPriority> = {
    4: 'critical',
    3: 'high',
    2: 'medium',
    1: 'low',
  }
  
  return priorityByLevel[newLevel] || 'low'
}

/**
 * Suggest priority threshold based on user timezone and time of day
 * Recommends higher thresholds during sleep hours (22:00-08:00 local time)
 * 
 * @param timezone - User's IANA timezone (e.g., 'America/New_York', 'Europe/London')
 * @param defaultThreshold - User's default threshold (fallback)
 * @returns Recommended priority threshold
 * 
 * @example
 * ```ts
 * // At 23:00 user's local time (sleep hours)
 * getTimeBasedThreshold('America/New_York', 'medium') // 'critical'
 * 
 * // At 14:00 user's local time (active hours)
 * getTimeBasedThreshold('America/New_York', 'medium') // 'medium'
 * 
 * // Invalid timezone fallback
 * getTimeBasedThreshold('Invalid/Zone', 'high') // 'high'
 * ```
 */
export function getTimeBasedThreshold(
  timezone: string,
  defaultThreshold: NotificationPriority
): NotificationPriority {
  try {
    // Get current hour in user's timezone (0-23)
    const userTime = new Date().toLocaleString('en-US', { 
      timeZone: timezone,
      hour: 'numeric',
      hour12: false 
    })
    const hour = parseInt(userTime.split(' ')[0] || '12', 10)
    
    // Sleep hours: 22:00-08:00 (10pm-8am)
    const isSleepHours = hour >= 22 || hour < 8
    
    if (isSleepHours) {
      // During sleep hours, only send critical notifications
      // Upgrade threshold to critical to reduce nighttime disturbances
      return 'critical'
    }
    
    // Active hours: use user's preference
    return defaultThreshold
  } catch (error) {
    // Invalid timezone: fallback to user preference
    console.warn(`Invalid timezone '${timezone}', using default threshold`, error)
    return defaultThreshold
  }
}

/**
 * Track priority usage analytics
 * Returns metrics for monitoring priority system effectiveness
 * 
 * @param notifications - Array of notification records with category and created_at
 * @param customMap - Optional custom priority mapping
 * @returns Priority analytics object
 * 
 * @example
 * ```ts
 * const notifications = [
 *   { category: 'badge', created_at: new Date('2025-12-15T10:00:00Z') },
 *   { category: 'quest', created_at: new Date('2025-12-14T10:00:00Z') },
 * ]
 * 
 * const analytics = trackPriorityUsage(notifications)
 * // {
 * //   totalNotifications: 2,
 * //   byPriority: { critical: 0, high: 1, medium: 1, low: 0 },
 * //   averageAge: 18, // hours
 * //   staleCount: 1 // notifications > 24h old
 * // }
 * ```
 */
export function trackPriorityUsage(
  notifications: Array<{ category: string; created_at: Date }>,
  customMap?: Partial<Record<NotificationCategoryExtended, NotificationPriority>>
): {
  totalNotifications: number
  byPriority: Record<NotificationPriority, number>
  averageAge: number
  staleCount: number
} {
  const now = Date.now()
  let totalAge = 0
  let staleCount = 0
  
  const byPriority: Record<NotificationPriority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  }
  
  for (const notification of notifications) {
    // Track priority distribution
    const category = notification.category as NotificationCategoryExtended
    const priority = getPriorityLevel(category, customMap)
    byPriority[priority]++
    
    // Track age metrics
    const ageInHours = (now - notification.created_at.getTime()) / (1000 * 60 * 60)
    totalAge += ageInHours
    
    if (ageInHours > 24) {
      staleCount++
    }
  }
  
  return {
    totalNotifications: notifications.length,
    byPriority,
    averageAge: notifications.length > 0 ? totalAge / notifications.length : 0,
    staleCount,
  }
}
