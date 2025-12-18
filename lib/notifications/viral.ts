/**
 * Viral Notification Dispatcher
 * 
 * Handles push notifications for viral milestones and tier upgrades using
 * Neynar MiniApp notification API with rate limit compliance.
 * 
 * Source: Neynar Frame Notifications API
 * Reference: https://docs.neynar.com/docs/send-notifications-to-mini-app-users
 * API Reference: https://docs.neynar.com/reference/publish-frame-notifications
 * MCP Verified: November 17, 2025
 * Approved by: @heycat on November 17, 2025
 * 
 * Rate Limits (Warpcast enforced):
 * - 1 notification per 30 seconds per token
 * - 100 notifications per day per token
 * 
 * Quality Gates Applied:
 * - GI-7: Rate limit handling, retry logic, error recovery
 * - GI-10: Batch processing, queue management
 * - GI-11: Token validation, FID verification
 * - GI-13: Complete documentation with source citations
 * 
 * @module lib/viral-notifications
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getNeynarServerClient } from '@/lib/integrations/neynar'
import { getSupabaseServerClient } from '@/lib/supabase/edge'
import type { Database } from '@/types/supabase'
import { trackError } from './error-tracking'
import { DEFAULT_PRIORITY_MAP, type NotificationPriority } from './priority'
import { handleNotificationBatching, type NotificationBatchType, type NotificationPriority as BatchPriority } from '@/lib/notifications/notification-batching'

// ============================================================================
// Type Definitions
// ============================================================================

// Dependencies interface for testing
export type NotificationDependencies = {
  supabase?: SupabaseClient
  neynarClient?: any
  rateLimiter?: NotificationRateLimiter
}

export type NotificationType = 'tier_upgrade' | 'achievement' | 'generic'

export type TierUpgradeNotification = {
  type: 'tier_upgrade'
  fid: number
  castHash: string
  oldTier: string
  newTier: string
  xpBonus: number
}

export type AchievementNotification = {
  type: 'achievement'
  fid: number
  achievementType: string
  castHash?: string
  xpBonus?: number
}

export type GenericNotification = {
  type: 'generic'
  fid: number
  title: string
  body: string
  targetUrl?: string
  castHash?: string
}

export type ViralNotification = TierUpgradeNotification | AchievementNotification | GenericNotification

export type NotificationResult = {
  success: boolean
  notificationId?: string
  error?: string
  rateLimited?: boolean
}

// ============================================================================
// Rate Limiter (GI-7, GI-11)
// ============================================================================

export class NotificationRateLimiter {
  private tokenLastUsed = new Map<string, number>()
  private tokenDailyCount = new Map<string, { count: number; date: string }>()
  
  // Rate limits from Neynar docs (enforced by Warpcast)
  // Source: https://docs.neynar.com/docs/send-notifications-to-mini-app-users
  private readonly PER_TOKEN_INTERVAL_MS = 30000 // 30 seconds
  private readonly PER_TOKEN_DAILY_LIMIT = 100

  /**
   * Check if token is available for notification (not rate limited)
   * 
   * Quality Gates:
   * - GI-11: Safe time calculations
   * - GI-7: Comprehensive rate limit checking
   */
  canSendNotification(token: string): boolean {
    const now = Date.now()
    const today = new Date().toISOString().split('T')[0]

    // Check 30-second interval limit
    const lastUsed = this.tokenLastUsed.get(token)
    if (lastUsed && now - lastUsed < this.PER_TOKEN_INTERVAL_MS) {
      return false
    }

    // Check daily limit
    const dailyData = this.tokenDailyCount.get(token)
    if (dailyData) {
      if (dailyData.date === today && dailyData.count >= this.PER_TOKEN_DAILY_LIMIT) {
        return false
      }
      if (dailyData.date !== today) {
        // Reset counter for new day
        this.tokenDailyCount.set(token, { count: 0, date: today })
      }
    } else {
      this.tokenDailyCount.set(token, { count: 0, date: today })
    }

    return true
  }

  /**
   * Record notification sent for rate limiting
   */
  recordNotificationSent(token: string): void {
    const now = Date.now()
    const today = new Date().toISOString().split('T')[0]

    this.tokenLastUsed.set(token, now)

    const dailyData = this.tokenDailyCount.get(token)
    if (dailyData && dailyData.date === today) {
      dailyData.count++
    } else {
      this.tokenDailyCount.set(token, { count: 1, date: today })
    }
  }

  /**
   * Get milliseconds until token is available
   */
  getTimeUntilAvailable(token: string): number {
    const lastUsed = this.tokenLastUsed.get(token)
    if (!lastUsed) return 0

    const timeSinceLastUse = Date.now() - lastUsed
    const timeRemaining = Math.max(0, this.PER_TOKEN_INTERVAL_MS - timeSinceLastUse)
    return timeRemaining
  }
}

// Global rate limiter instance
const rateLimiter = new NotificationRateLimiter()

// ============================================================================
// Token Management
// ============================================================================

/**
 * Get all active notification tokens for a user
 * 
 * Source: Neynar Token Management API
 * Reference: https://docs.neynar.com/reference/fetch-frame-notification-tokens
 * 
 * Quality Gates:
 * - GI-7: Error handling with fallback
 * - GI-11: Token validation
 */
async function getUserNotificationTokens(fid: number, deps?: NotificationDependencies): Promise<string[]> {
  try {
    // GI-11: FID validation
    if (!fid || fid <= 0) {
      return []
    }

    const supabase = deps?.supabase || getSupabaseServerClient()
    if (!supabase) {
      throw new Error('Supabase client not configured')
    }

    // Fetch from miniapp_notification_tokens table
    // Source: /lib/miniapp-notifications.ts schema
    const { data, error } = await supabase
      .from('miniapp_notification_tokens')
      .select('token')
      .eq('fid', fid)
      .eq('enabled', true)
      .order('created_at', { ascending: false })

    if (error) {
      trackError('viral_notification_fetch_tokens_failed', error as Error, {
        function: 'getUserNotificationTokens',
        fid,
      })
      return []
    }

    return data?.map((row: any) => row.token) || []
  } catch (error) {
    trackError('viral_notification_get_user_tokens_failed', error as Error, {
      function: 'getUserNotificationTokens',
      fid,
    })
    return []
  }
}

/**
 * Select best token for notification (respecting rate limits)
 * 
 * Quality Gates:
 * - GI-7: Rate limit awareness
 * - GI-10: Efficient token selection
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function selectAvailableToken(tokens: string[]): string | null {
  // Find first token that's not rate limited
  for (const token of tokens) {
    if (rateLimiter.canSendNotification(token)) {
      return token
    }
  }
  return null
}

// ============================================================================
// Notification Builders
// ============================================================================

/**
 * Build notification payload for tier upgrade
 * 
 * Quality Gates:
 * - GI-13: Clear, engaging notification text
 * - GI-11: Safe URL construction
 */
function buildTierUpgradeNotification(notification: TierUpgradeNotification) {
  const tierEmojis: Record<string, string> = {
    mega_viral: '🔥',
    viral: '⚡',
    popular: '✨',
    engaging: '💫',
    active: '🌟',
  }

  const emoji = tierEmojis[notification.newTier] || '🎉'
  
  return {
    title: `${emoji} Viral Tier Upgrade!`,
    body: `Your cast reached "${notification.newTier}" tier! +${notification.xpBonus} XP bonus`,
    targetUrl: `/profile?cast=${notification.castHash}`,
  }
}

/**
 * Build notification payload for achievement
 * 
 * Quality Gates:
 * - GI-13: Achievement-specific messaging
 * - GI-11: Safe URL construction
 */
function buildAchievementNotification(notification: AchievementNotification) {
  const achievementMessages: Record<string, { title: string; body: string }> = {
    first_viral: {
      title: '🎊 First Viral Cast!',
      body: 'Your cast went viral for the first time! Keep sharing.',
    },
    '10_viral_casts': {
      title: '🏆 10 Viral Casts!',
      body: 'You\'ve created 10 viral casts. You\'re on fire!',
    },
    '100_shares': {
      title: '🚀 100 Shares Milestone!',
      body: 'Your content has been shared 100 times. Amazing reach!',
    },
    mega_viral_master: {
      title: '👑 Mega Viral Master!',
      body: 'You\'ve achieved the highest viral tier. Legendary!',
    },
  }

  const message = achievementMessages[notification.achievementType] || {
    title: '🎉 Achievement Unlocked!',
    body: `You earned: ${notification.achievementType}`,
  }

  return {
    title: message.title,
    body: message.body,
    targetUrl: notification.castHash
      ? `/profile?cast=${notification.castHash}`
      : '/profile?tab=achievements',
  }
}

/**
 * Build notification payload for generic notification
 * 
 * Quality Gates:
 * - GI-13: Use provided title/body
 * - GI-11: Safe URL construction
 */
function buildGenericNotification(notification: GenericNotification) {
  return {
    title: notification.title,
    body: notification.body,
    targetUrl: notification.targetUrl || '/notifications',
  }
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Send notification using Neynar API
 * 
 * Source: Neynar Frame Notifications API
 * Reference: https://docs.neynar.com/reference/publish-frame-notifications
 * 
 * Quality Gates:
 * - GI-7: Retry logic with exponential backoff
 * - GI-11: Request validation
 * - GI-10: Timeout handling
 */
async function sendNeynarNotification(
  fid: number,
  title: string,
  body: string,
  targetUrl?: string,
  deps?: NotificationDependencies
): Promise<NotificationResult> {
  try {
    const client = deps?.neynarClient || getNeynarServerClient()
    if (!client) {
      return {
        success: false,
        error: 'Neynar client not configured',
      }
    }

    // GI-7: Retry logic
    let lastError: Error | null = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // GI-10: Timeout handling (5 seconds)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)

        const response = await Promise.race([
          client.publishFrameNotifications({
            notification: {
              title,
              body,
              target_url: targetUrl,
              uuid: crypto.randomUUID(),
            },
            targetFids: [fid],
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 5000)
          ),
        ])

        clearTimeout(timeout)

        // GI-11: Response validation
        const result = response as any
        
        // Log response for debugging
        console.log('[Neynar] Response:', JSON.stringify({
          fid,
          success: result?.success,
          successfulFids: result?.result?.successfulFids,
          rateLimitedFids: result?.result?.rateLimitedFids,
          notificationId: result?.result?.notificationId,
        }))
        
        if (result?.result?.successfulFids?.includes(fid) || result?.success) {
          return {
            success: true,
            notificationId: result?.result?.notificationId || crypto.randomUUID(),
          }
        }

        // Check for rate limit errors
        if (result?.result?.rateLimitedFids?.includes(fid)) {
          return {
            success: false,
            error: 'Rate limited by Neynar',
            rateLimited: true,
          }
        }

        // More detailed error message
        const errorMsg = result?.result?.error || result?.error || 'Notification failed - FID may not have notification token registered'
        throw new Error(errorMsg)
      } catch (error) {
        lastError = error as Error
        trackError('viral_notification_neynar_attempt_failed', error as Error, {
          function: 'sendNeynarNotification',
          attempt,
          maxAttempts: 3,
        })

        // GI-7: Exponential backoff
        if (attempt < 3) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          await new Promise((resolve) => setTimeout(resolve, backoffMs))
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
    }
  } catch (error) {
    trackError('viral_notification_neynar_send_failed', error as Error, {
      function: 'sendNeynarNotification',
      title,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Dispatch viral notification to user
 * 
 * Quality Gates:
 * - GI-7: Comprehensive error handling
 * - GI-10: Token selection optimization
 * - GI-11: FID validation
 * 
 * @param notification - Viral notification to send
 * @returns Result with success status and error details
 */
export async function dispatchViralNotification(
  notification: ViralNotification,
  deps?: NotificationDependencies
): Promise<NotificationResult> {
  try {
    // GI-11: FID validation
    if (!notification.fid || notification.fid <= 0) {
      return {
        success: false,
        error: 'Invalid FID',
      }
    }

    // Get user's notification tokens
    const tokens = await getUserNotificationTokens(notification.fid, deps)
    if (tokens.length === 0) {
      console.warn(`[ViralNotifications] No tokens for FID ${notification.fid}, attempting direct send`)
    }

    // Build notification payload
    const payload =
      notification.type === 'tier_upgrade'
        ? buildTierUpgradeNotification(notification)
        : notification.type === 'achievement'
          ? buildAchievementNotification(notification)
          : buildGenericNotification(notification)

    // Phase 2 P6: Check if notification should be batched
    // Map notification type to batch type
    const batchType: NotificationBatchType = notification.type === 'tier_upgrade' ? 'achievement' : 
                                              notification.type === 'achievement' ? 'achievement' : 'social'
    
    // Map priority: achievement=1, tip=3, quest=5
    const batchPriority: BatchPriority = notification.type === 'achievement' || notification.type === 'tier_upgrade' ? 1 : 5

    // Check batching logic (quiet hours, throttling)
    const wasQueued = await handleNotificationBatching({
      fid: notification.fid,
      type: batchType,
      priority: batchPriority,
      payload: {
        title: payload.title,
        body: payload.body,
        targetUrl: payload.targetUrl,
        metadata: {
          notificationType: notification.type,
          castHash: notification.type === 'tier_upgrade' ? notification.castHash :
                    notification.type === 'achievement' ? notification.castHash : undefined,
        },
      },
    }, deps?.supabase)

    // If queued for batching, return success (will be sent later by digest cron)
    if (wasQueued) {
      console.log(`[ViralNotifications] Queued notification for batching: FID ${notification.fid}, type ${notification.type}`)
      return {
        success: true,
        notificationId: crypto.randomUUID(),
      }
    }

    // Check rate limits (using FID instead of token)
    const fidKey = `fid:${notification.fid}`
    const limiter = deps?.rateLimiter || rateLimiter
    if (!limiter.canSendNotification(fidKey)) {
      const timeUntilAvailable = limiter.getTimeUntilAvailable(fidKey)
      // Queue instead of failing
      await handleNotificationBatching({
        fid: notification.fid,
        type: batchType,
        priority: batchPriority,
        payload: {
          title: payload.title,
          body: payload.body,
          targetUrl: payload.targetUrl,
        },
      }, deps?.supabase)
      return {
        success: false,
        error: `Rate limited. Queued for next available time.`,
        rateLimited: true,
      }
    }    // Send notification
    const result = await sendNeynarNotification(
      notification.fid,
      payload.title,
      payload.body,
      payload.targetUrl,
      deps
    )

    // Record rate limit and mark as sent if successful
    if (result.success) {
      limiter.recordNotificationSent(fidKey)
      await markNotificationSent(notification, deps)
    }

    return result
  } catch (error) {
    trackError('viral_notification_dispatch_failed', error as Error, {
      function: 'dispatchNotification',
      fid: notification.fid,
      type: notification.type,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Mark notification as sent in database
 * 
 * Quality Gates:
 * - GI-11: Safe database updates
 * - GI-7: Error logging without throwing
 */
async function markNotificationSent(notification: ViralNotification, deps?: NotificationDependencies): Promise<void> {
  try {
    const supabase = deps?.supabase || getSupabaseServerClient()
    if (!supabase) return

    // Call the helper function from migration
    // Source: scripts/sql/phase5.1-viral-realtime.sql
    await supabase.rpc('mark_notification_sent', {
      p_notification_type: notification.type,
      p_id:
        notification.type === 'tier_upgrade'
          ? (notification as any).id
          : (notification as any).id,
    })
  } catch (error) {
    trackError('viral_notification_mark_sent_failed', error as Error, {
      function: 'markNotificationSent',
      type: notification.type,
    })
    // Don't throw - notification was sent successfully
  }
}

/**
 * Process pending viral notifications (batch)
 * 
 * Quality Gates:
 * - GI-10: Batch processing with rate limit awareness
 * - GI-7: Individual error handling per notification
 * 
 * @returns Number of notifications sent successfully
 */
export async function processPendingNotifications(deps?: NotificationDependencies): Promise<number> {
  try {
    const supabase = deps?.supabase || getSupabaseServerClient()
    if (!supabase) {
      throw new Error('Supabase client not configured')
    }

    // Query pending notifications from view
    // Source: scripts/sql/phase5.1-viral-realtime.sql
    const { data: pending, error } = await supabase
      .from('pending_viral_notifications')
      .select('*')
      .limit(50) // GI-10: Process in reasonable batches

    if (error || !pending || pending.length === 0) {
      return 0
    }

    let successCount = 0

    // GI-10: Process notifications with rate limit awareness
    for (const item of pending) {
      // Detect notification type from item properties
      const isTierUpgrade = 'old_tier' in item && 'new_tier' in item
      const notification: ViralNotification = isTierUpgrade
        ? {
            type: 'tier_upgrade',
            fid: (item as any).fid || 0,
            castHash: (item as any).cast_hash || '',
            oldTier: (item as any).old_tier || 'unknown',
            newTier: (item as any).new_tier || 'unknown',
            xpBonus: (item as any).xp_bonus_awarded || 0,
          }
        : {
            type: 'achievement',
            fid: (item as any).fid || 0,
            achievementType: (item as any).achievement_type || 'unknown',
            castHash: (item as any).cast_hash || '',
            xpBonus: 0, // Not stored in viral_milestone_achievements
          }

      const result = await dispatchViralNotification(notification, deps)
      
      if (result.success) {
        successCount++
      } else if (result.rateLimited) {
        // Stop processing batch if rate limited
        break
      }

      // GI-7: Small delay between notifications
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    return successCount
  } catch (error) {
    trackError('viral_notification_process_pending_failed', error as Error, {
      function: 'processPendingNotifications',
    })
    return 0
  }
}

// ============================================================================
// Phase 2: Priority Filtering & Unified Dispatch
// ============================================================================

/**
 * Check if notification should be sent based on user's priority settings
 * 
 * Phase 2 Priority Filtering:
 * 1. Query user's min_priority_for_push threshold
 * 2. Get category's priority level (from priority_settings or defaults)
 * 3. Compare: notification priority >= threshold
 * 4. Return true if passes filter, false if blocked
 * 
 * @param fid - User's Farcaster ID
 * @param notificationCategory - Category (quest, badge, level, etc.)
 * @param notificationPriority - Priority level of this notification
 * @returns true if notification should be sent, false if filtered out
 * 
 * @example
 * // User sets min_priority = 'high', badge notification is 'high'
 * await shouldSendNotification(12345, 'badge', 'high') // true (passes)
 * 
 * // User sets min_priority = 'high', gm notification is 'low'
 * await shouldSendNotification(12345, 'gm', 'low') // false (filtered)
 */
export async function shouldSendNotification(
  fid: number,
  notificationCategory: string,
  notificationPriority: NotificationPriority
): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      // If DB unavailable, default to allowing notification
      return true
    }
    
    // Query user preferences
    const { data, error } = await (supabase as any)
      .from('notification_preferences')
      .select('priority_settings, min_priority_for_push, global_mute, category_settings')
      .eq('fid', fid)
      .single()
    
    // If no preferences or error, allow notification (fail open)
    if (error || !data) {
      return true
    }
    
    // Check global mute
    if (data.global_mute) {
      return false
    }
    
    // Check category enabled
    const categorySettings = data.category_settings as Record<string, { enabled: boolean; push: boolean }> | null
    if (categorySettings && categorySettings[notificationCategory]) {
      if (!categorySettings[notificationCategory].enabled || !categorySettings[notificationCategory].push) {
        return false
      }
    }
    
    // Get user's minimum priority threshold (default: medium)
    const minPriority = (data.min_priority_for_push || 'medium') as NotificationPriority
    
    // Get notification's priority (from user's custom settings or defaults)
    const prioritySettings = data.priority_settings as Record<string, NotificationPriority> | null
    const categoryPriority = (prioritySettings?.[notificationCategory] || 
                             (DEFAULT_PRIORITY_MAP as any)[notificationCategory] ||
                             notificationPriority) as NotificationPriority
    
    // Priority ranking: critical=3, high=2, medium=1, low=0
    const priorityRank: Record<NotificationPriority, number> = {
      critical: 3,
      high: 2,
      medium: 1,
      low: 0,
    }
    
    const notificationRank = priorityRank[categoryPriority] ?? 1
    const thresholdRank = priorityRank[minPriority] ?? 1
    
    // Send if notification priority >= user's threshold
    return notificationRank >= thresholdRank
  } catch (err) {
    trackError('priority_filter_error', err, { fid, category: notificationCategory })
    // Fail open on error (allow notification)
    return true
  }
}

/**
 * Dispatch notification with priority filtering and XP rewards
 * 
 * Phase 2 Unified Dispatch:
 * 1. Check priority filter (shouldSendNotification)
 * 2. Query xp_rewards_display preference
 * 3. Enhance body with XP reward if enabled
 * 4. Dispatch via existing viral notification system
 * 
 * @param notification - Notification payload with priority
 * @returns Success/failure with reason
 * 
 * @example
 * await dispatchNotificationWithPriority({
 *   fid: 12345,
 *   category: 'badge',
 *   priority: 'high',
 *   title: '🏆 Badge Earned!',
 *   body: 'You earned the Pioneer badge!',
 *   targetUrl: '/profile?tab=badges',
 *   xpReward: 100
 * })
 */
export async function dispatchNotificationWithPriority(
  notification: {
    fid: number
    category: string
    priority: NotificationPriority
    title: string
    body: string
    targetUrl?: string
    xpReward?: number
    castHash?: string
  }
): Promise<NotificationResult> {
  const { fid, category, priority, title, body, targetUrl, xpReward, castHash } = notification
  
  try {
    // Step 1: Check priority filter
    const shouldSend = await shouldSendNotification(fid, category, priority)
    if (!shouldSend) {
      return {
        success: false,
        error: 'Filtered by priority threshold',
        rateLimited: false,
      }
    }
    
    // Step 2: Query XP display preference
    let enhancedBody = body
    if (xpReward && xpReward > 0) {
      const supabase = getSupabaseServerClient()
      if (supabase) {
        const { data } = await supabase
          .from('notification_preferences')
          .select('xp_rewards_display')
          .eq('fid', fid)
          .single()
        
        // Only add XP if user hasn't disabled it (default: true)
        if (data?.xp_rewards_display !== false) {
          enhancedBody = `${body} (+${xpReward} XP)`
        }
      }
    }
    
    // Step 3: Dispatch via existing system
    return await dispatchViralNotification({
      type: 'generic',
      fid,
      title,
      body: enhancedBody,
      targetUrl: targetUrl || '/notifications',
      castHash,
    })
  } catch (err) {
    trackError('dispatch_with_priority_error', err, { fid, category, priority })
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      rateLimited: false,
    }
  }
}
