/**
 * Viral Achievement System
 * 
 * Tracks and awards viral milestones like first viral cast, 10 viral casts,
 * 100 shares, and mega viral master.
 * 
 * Source: Custom achievement logic for Gmeowbased viral system
 * Database: viral_milestone_achievements table
 * MCP Verified: November 17, 2025
 * Approved by: @heycat on November 17, 2025
 * 
 * Achievement Types:
 * - first_viral: First cast to reach "viral" tier or higher
 * - 10_viral_casts: 10 casts reaching "viral" tier or higher
 * - 100_shares: Total recasts across all casts reaches 100
 * - mega_viral_master: First cast to reach "mega_viral" tier
 * 
 * Quality Gates Applied:
 * - GI-7: Error handling, duplicate prevention
 * - GI-10: Efficient database queries
 * - GI-11: Safe calculations, data validation
 * - GI-13: Complete documentation
 * 
 * @module lib/viral-achievements
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/edge'
import type { Json, Database } from '@/types/supabase'

// ============================================================================
// Type Definitions
// ============================================================================

export type AchievementType =
  | 'first_viral'
  | '10_viral_casts'
  | '100_shares'
  | 'mega_viral_master'

// Dependencies interface for testing
export type AchievementDependencies = {
  supabase?: SupabaseClient
  dispatchNotification?: (notification: AchievementNotification) => Promise<{ success: boolean; error?: string }>
}

export type AchievementConfig = {
  type: AchievementType
  name: string
  description: string
  icon: string
  xpReward: number
}

export type UserAchievement = {
  id: string
  fid: number
  achievementType: AchievementType
  achievedAt: Date
  castHash?: string
  xpAwarded: number
}

export type AchievementCheckResult = {
  unlocked: AchievementType[]
  alreadyHas: AchievementType[]
}

export type AchievementNotification = {
  type: 'achievement' | 'tier_upgrade'
  fid: number
  achievementType?: AchievementType
  tierName?: string
  castHash?: string
  xpBonus: number
}

// ============================================================================
// Achievement Configurations
// ============================================================================

export const ACHIEVEMENTS: Record<AchievementType, AchievementConfig> = {
  first_viral: {
    type: 'first_viral',
    name: 'First Viral',
    description: 'Your first cast reached viral status',
    icon: '⚡',
    xpReward: 100,
  },
  '10_viral_casts': {
    type: '10_viral_casts',
    name: 'Viral Creator',
    description: 'Created 10 viral casts',
    icon: '🔥',
    xpReward: 500,
  },
  '100_shares': {
    type: '100_shares',
    name: 'Share Master',
    description: 'Your casts have been shared 100 times',
    icon: '🚀',
    xpReward: 250,
  },
  mega_viral_master: {
    type: 'mega_viral_master',
    name: 'Mega Viral Master',
    description: 'Reached the legendary mega_viral tier',
    icon: '👑',
    xpReward: 1000,
  },
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Check which achievements a user has already earned
 * 
 * Quality Gates:
 * - GI-11: FID validation
 * - GI-10: Efficient single query
 * 
 * @param fid - User's Farcaster ID
 * @param deps - Optional dependencies for testing
 * @returns Array of achievement types user has
 */
export async function getUserAchievements(
  fid: number,
  deps?: AchievementDependencies
): Promise<AchievementType[]> {
  try {
    // GI-11: FID validation
    if (!fid || fid <= 0) {
      return []
    }

    const supabase = deps?.supabase || getSupabaseServerClient()
    if (!supabase) {
      throw new Error('Supabase client not configured')
    }

    const { data, error } = await supabase
      .from('viral_milestone_achievements')
      .select('achievement_type')
      .eq('fid', fid)

    if (error) {
      console.error('[Achievements] Error fetching user achievements:', error)
      return []
    }

    return (data?.map((row) => row.achievement_type as AchievementType) || [])
  } catch (error) {
    console.error('[Achievements] Error in getUserAchievements:', error)
    return []
  }
}

/**
 * Check if user qualifies for any new achievements
 * 
 * Quality Gates:
 * - GI-7: Safe error handling per achievement type
 * - GI-10: Parallel queries for efficiency
 * - GI-11: Safe aggregation calculations
 * 
 * @param fid - User's Farcaster ID
 * @param castHash - Optional cast hash that triggered the check
 * @param deps - Optional dependencies for testing
 * @returns List of newly unlocked achievements
 */
export async function checkAchievements(
  fid: number,
  castHash?: string,
  deps?: AchievementDependencies
): Promise<AchievementCheckResult> {
  const result: AchievementCheckResult = {
    unlocked: [],
    alreadyHas: [],
  }

  try {
    // GI-11: FID validation
    if (!fid || fid <= 0) {
      return result
    }

    const supabase = deps?.supabase || getSupabaseServerClient()
    if (!supabase) {
      throw new Error('Supabase client not configured')
    }

    // Get existing achievements
    const existingAchievements = await getUserAchievements(fid, deps)
    result.alreadyHas = existingAchievements

    // GI-10: Run all achievement checks in parallel
    const [viralCastsCount, totalRecasts, hasMegaViral] = await Promise.all([
      // Count viral-tier or higher casts
      supabase
        .from('badge_casts')
        .select('cast_hash', { count: 'exact', head: true })
        .eq('fid', fid)
        .in('viral_tier', ['viral', 'mega_viral', 'popular', 'engaging'])
        .then((res) => res.count || 0),

      // Sum total recasts across all casts
      supabase
        .from('badge_casts')
        .select('recasts_count')
        .eq('fid', fid)
        .then((res) => {
          if (res.error || !res.data) return 0
          // GI-11: Safe aggregation
          return res.data.reduce((sum, row) => sum + (row.recasts_count || 0), 0)
        }),

      // Check if user has any mega_viral casts
      supabase
        .from('badge_casts')
        .select('cast_hash')
        .eq('fid', fid)
        .eq('viral_tier', 'mega_viral')
        .limit(1)
        .then((res) => (res.data?.length || 0) > 0),
    ])

    // Check each achievement type
    // 1. First Viral
    if (
      !existingAchievements.includes('first_viral') &&
      viralCastsCount >= 1
    ) {
      result.unlocked.push('first_viral')
    }

    // 2. 10 Viral Casts
    if (
      !existingAchievements.includes('10_viral_casts') &&
      viralCastsCount >= 10
    ) {
      result.unlocked.push('10_viral_casts')
    }

    // 3. 100 Shares
    if (
      !existingAchievements.includes('100_shares') &&
      totalRecasts >= 100
    ) {
      result.unlocked.push('100_shares')
    }

    // 4. Mega Viral Master
    if (
      !existingAchievements.includes('mega_viral_master') &&
      hasMegaViral
    ) {
      result.unlocked.push('mega_viral_master')
    }

    return result
  } catch (error) {
    console.error('[Achievements] Error checking achievements:', error)
    return result
  }
}

/**
 * Award achievement to user and send notification
 * 
 * Quality Gates:
 * - GI-7: Duplicate prevention with UNIQUE constraint
 * - GI-11: Safe XP updates with atomic operations
 * - GI-10: Notification dispatch async (non-blocking)
 * 
 * @param fid - User's Farcaster ID
 * @param achievementType - Achievement to award
 * @param castHash - Optional cast hash that triggered achievement
 * @param deps - Optional dependencies for testing
 * @returns Success status
 */
export async function awardAchievement(
  fid: number,
  achievementType: AchievementType,
  castHash?: string,
  deps?: AchievementDependencies
): Promise<boolean> {
  try {
    // GI-11: Input validation
    if (!fid || fid <= 0) {
      throw new Error('Invalid FID')
    }

    if (!ACHIEVEMENTS[achievementType]) {
      throw new Error(`Unknown achievement type: ${achievementType}`)
    }

    const supabase = deps?.supabase || getSupabaseServerClient()
    const notificationFn = deps?.dispatchNotification || dispatchViralNotification
    
    if (!supabase) {
      throw new Error('Supabase client not configured')
    }

    const config = ACHIEVEMENTS[achievementType]

    // GI-7: Insert achievement (UNIQUE constraint prevents duplicates)
    const { error: insertError } = await supabase
      .from('viral_milestone_achievements')
      .insert({
        fid,
        achievement_type: achievementType,
        cast_hash: castHash,
        metadata: {
          xp_awarded: config.xpReward,
          achievement_name: config.name,
          timestamp: new Date().toISOString(),
        },
      })
      .select()
      .single() as { data: Database['public']['Tables']['viral_milestone_achievements']['Row'], error: any }

    if (insertError) {
      // GI-7: Handle duplicate gracefully
      if (insertError.code === '23505') {
        console.log(`[Achievements] User ${fid} already has ${achievementType}`)
        return false
      }
      throw insertError
    }

    // GI-11: Award XP (atomic increment)
    const { error: xpError } = await supabase.rpc('increment_user_xp', {
      p_fid: fid,
      p_xp_amount: config.xpReward,
    })

    if (xpError) {
      console.error('[Achievements] Failed to award XP:', xpError)
      // Don't rollback achievement - XP update is secondary
    }

    // ⚠️ DEPRECATED - Event logging disabled (table dropped in Phase 3)
    // gmeow_rank_events table was dropped - event logging moved to Subsquid
    /* await supabase.from('gmeow_rank_events').insert({
      fid,
      event_type: 'achievement',
      chain: 'base',
      wallet_address: '0x0000000000000000000000000000000000000000',
      quest_id: null,
      delta: config.xpReward,
      total_points: 0,
      previous_points: null,
      level: 0,
      tier_name: 'none',
      tier_percent: 0,
      metadata: {
        achievement_type: achievementType,
        achievement_name: config.name,
        cast_hash: castHash,
        xp_awarded: config.xpReward,
      } as Json,
    }) */

    // GI-10: Send notification async (non-blocking)
    const notification: AchievementNotification = {
      type: 'achievement',
      fid,
      achievementType,
      castHash,
      xpBonus: config.xpReward,
    }

    // Fire and forget - don't block on notification
    if (notificationFn) {
      notificationFn(notification).catch((error: Error) => {
        console.error('[Achievements] Notification dispatch failed:', error)
      })
    }

    console.log(
      `[Achievements] Awarded ${achievementType} to user ${fid} (+${config.xpReward} XP)`
    )
    return true
  } catch (error) {
    console.error('[Achievements] Error awarding achievement:', error)
    return false
  }
}

/**
 * Check and award all applicable achievements for a user
 * 
 * Quality Gates:
 * - GI-10: Batch award multiple achievements
 * - GI-7: Individual error handling per achievement
 * 
 * @param fid - User's Farcaster ID
 * @param castHash - Optional cast hash that triggered check
 * @param deps - Optional dependencies for testing
 * @returns Number of achievements awarded
 */
export async function checkAndAwardAchievements(
  fid: number,
  castHash?: string,
  deps?: AchievementDependencies
): Promise<number> {
  try {
    const checkResult = await checkAchievements(fid, castHash, deps)

    if (checkResult.unlocked.length === 0) {
      return 0
    }

    // GI-10: Award all unlocked achievements in parallel
    const awardResults = await Promise.allSettled(
      checkResult.unlocked.map((achievementType) =>
        awardAchievement(fid, achievementType, castHash, deps)
      )
    )

    const successCount = awardResults.filter(
      (result) => result.status === 'fulfilled' && result.value === true
    ).length

    return successCount
  } catch (error) {
    console.error('[Achievements] Error in checkAndAwardAchievements:', error)
    return 0
  }
}

/**
 * Get full achievement details for display
 * 
 * @param fid - User's Farcaster ID
 * @param deps - Optional dependencies for testing
 * @returns Array of achievements with full config data
 */
export async function getUserAchievementDetails(
  fid: number,
  deps?: AchievementDependencies
): Promise<Array<UserAchievement & AchievementConfig>> {
  try {
    const supabase = deps?.supabase || getSupabaseServerClient()
    if (!supabase) {
      throw new Error('Supabase client not configured')
    }

    const { data, error } = await supabase
      .from('viral_milestone_achievements')
      .select('*')
      .eq('fid', fid)
      .order('achieved_at', { ascending: false })

    if (error || !data) {
      return []
    }

    return data.map((row) => ({
      id: row.id,
      fid: row.fid,
      achievementType: row.achievement_type as AchievementType,
      achievedAt: new Date(row.achieved_at || new Date()),
      castHash: row.cast_hash || undefined,
      xpAwarded: (typeof row.metadata === 'object' && row.metadata && 'xp_awarded' in row.metadata ? row.metadata.xp_awarded as number : null) || 0,
      ...ACHIEVEMENTS[row.achievement_type as AchievementType],
    }))
  } catch (error) {
    console.error('[Achievements] Error fetching achievement details:', error)
    return []
  }
}

/**
 * Dispatch viral notification to user_notification_history
 * Integrated with existing notification system to prevent duplicates
 */
export async function dispatchViralNotification(
  notification: AchievementNotification
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return { success: false, error: 'Supabase client not available' }
    }

    // Map notification type to category
    const category = notification.type === 'achievement' ? 'achievement' : 'viral'
    
    // Build title and description
    let title: string
    let description: string
    
    if (notification.type === 'achievement' && notification.achievementType) {
      const config = ACHIEVEMENTS[notification.achievementType]
      title = `${config.icon} ${config.name}!`
      description = `${config.description} +${notification.xpBonus} XP`
    } else if (notification.type === 'tier_upgrade' && notification.tierName) {
      title = `🔥 Viral Tier Upgrade!`
      description = `Your cast reached '${notification.tierName}' tier! +${notification.xpBonus} XP bonus`
    } else {
      return { success: false, error: 'Invalid notification type' }
    }

    // Insert into user_notification_history
    const { error } = await supabase
      .from('user_notification_history')
      .insert({
        fid: notification.fid,
        category,
        title,
        description,
        tone: 'success',  // Required field for notifications
        metadata: {
          type: notification.type,
          achievement_type: notification.achievementType,
          tier_name: notification.tierName,
          cast_hash: notification.castHash,
          xp_bonus: notification.xpBonus,
        },
      })

    if (error) {
      console.error('[ViralNotifications] Insert failed:', error)
      return { success: false, error: error.message }
    }

    console.log(
      `[ViralNotifications] Sent ${notification.type} notification to FID ${notification.fid}`
    )
    return { success: true }
  } catch (error) {
    console.error('[ViralNotifications] Error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
