/**
 * Notification Batching System - Phase 2 P6
 * 
 * Reduces notification fatigue by batching notifications during quiet hours
 * and throttling to max 3 notifications per hour per user.
 * 
 * FEATURES:
 * - Quiet hours detection (10pm-8am local time)
 * - Smart throttling (max 3 per hour, priority-based)
 * - Daily digest aggregation (sent at 8am local time)
 * - Timezone detection from user profile
 * 
 * QUALITY GATES:
 * - GI-7: Error handling with fallback
 * - GI-10: Efficient batch processing
 * - GI-11: Safe time calculations
 * - GI-13: Clear notification messages
 * 
 * PHASE: Phase 2 P6 - Notification Batching
 * DATE: December 16, 2025
 * GOAL: Reduce notification fatigue by 30%, increase open rate by 20%
 * 
 * @module lib/notification-batching
 */

import { getSupabaseServerClient } from '@/lib/supabase/edge'
import type { Database } from '@/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Type Definitions
// ============================================================================

export type NotificationBatchType =
  | 'achievement'
  | 'tip'
  | 'quest'
  | 'badge'
  | 'guild'
  | 'gm'
  | 'level'
  | 'rank'
  | 'social'
  | 'reward'

export type NotificationPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type NotificationPayload = {
  title: string
  body: string
  targetUrl?: string
  metadata?: Record<string, any>
}

export type BatchNotificationInput = {
  fid: number
  type: NotificationBatchType
  priority: NotificationPriority
  payload: NotificationPayload
}

export type BatchCheckResult = {
  shouldBatch: boolean
  reason: 'quiet_hours' | 'throttled' | 'immediate' | 'error'
  scheduledFor?: Date
  queuePosition?: number
}

export type ThrottleCheckResult = {
  isThrottled: boolean
  notificationsInLastHour: number
  nextAvailableSlot?: Date
}

export type DigestNotification = {
  type: NotificationBatchType
  count: number
  latestPayload: NotificationPayload
}

export type DailyDigest = {
  fid: number
  notifications: DigestNotification[]
  totalCount: number
  scheduledFor: Date
}

// ============================================================================
// Priority Mapping (matches lib/notifications/priority.ts)
// ============================================================================

const PRIORITY_MAP: Record<NotificationBatchType, NotificationPriority> = {
  achievement: 1, // Highest priority
  level: 2,
  tip: 3,
  reward: 4,
  quest: 5,
  badge: 7,
  guild: 8,
  rank: 9,
  gm: 10, // Lowest priority (can wait for digest)
  social: 10,
}

// ============================================================================
// Constants
// ============================================================================

const QUIET_HOURS_START = 22 // 10pm
const QUIET_HOURS_END = 8 // 8am
const DIGEST_SEND_HOUR = 8 // 8am local time
const MAX_NOTIFICATIONS_PER_HOUR = 3
const REDIS_THROTTLE_KEY_PREFIX = 'notif_throttle:'
const REDIS_THROTTLE_TTL = 3600 // 1 hour in seconds
const DEFAULT_TIMEZONE = 'UTC'

// ============================================================================
// Timezone Detection
// ============================================================================

/**
 * Get user's timezone from profile or default to UTC
 * 
 * Sources:
 * - notification_preferences.quiet_hours_timezone
 * - User profile metadata
 * - Default: UTC
 * 
 * Quality Gates:
 * - GI-11: Safe timezone handling with fallback
 * - GI-7: Error handling doesn't block notification flow
 */
export async function getUserTimezone(
  fid: number,
  supabase?: SupabaseClient
): Promise<string> {
  try {
    const client = supabase || getSupabaseServerClient()
    if (!client) {
      return DEFAULT_TIMEZONE
    }

    // Try notification_preferences first
    const { data: prefs, error: prefsError } = await client
      .from('notification_preferences')
      .select('quiet_hours_timezone')
      .eq('fid', fid)
      .single() as { data: Pick<Database['public']['Tables']['notification_preferences']['Row'], 'quiet_hours_timezone'>, error: any }

    if (!prefsError && prefs?.quiet_hours_timezone) {
      return prefs.quiet_hours_timezone
    }

    // Fallback to user_profiles metadata
    const { data: profile, error: profileError } = await client
      .from('user_profiles')
      .select('metadata')
      .eq('fid', fid)
      .single() as { data: Pick<Database['public']['Tables']['user_profiles']['Row'], 'metadata'>, error: any }

    if (!profileError && profile?.metadata) {
      const metadata = profile.metadata as any
      if (metadata.timezone) {
        return metadata.timezone
      }
    }

    // Default to UTC
    return DEFAULT_TIMEZONE
  } catch (error) {
    console.error('[Batching] Error getting timezone:', error)
    return DEFAULT_TIMEZONE
  }
}

/**
 * Check if current time is within quiet hours for user's timezone
 * 
 * Quiet hours: 10pm - 8am local time
 * 
 * Quality Gates:
 * - GI-11: Safe date/time arithmetic
 * - GI-7: Never throws, always returns boolean
 */
export function isQuietHours(timezone: string = DEFAULT_TIMEZONE): boolean {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })

    const hourStr = formatter.format(now)
    const hour = parseInt(hourStr, 10)

    // Quiet hours: 10pm (22) to 8am (8)
    // This means: hour >= 22 OR hour < 8
    return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END
  } catch (error) {
    console.error('[Batching] Error checking quiet hours:', error)
    // Default to false (allow notification) if timezone parsing fails
    return false
  }
}

/**
 * Calculate next 8am in user's timezone
 * 
 * Used for scheduling batched notifications
 * 
 * Quality Gates:
 * - GI-11: Safe date calculations
 */
export function getNext8AM(timezone: string = DEFAULT_TIMEZONE): Date {
  try {
    const now = new Date()

    // Get current hour in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    const hourStr = formatter.format(now)
    const currentHour = parseInt(hourStr, 10)

    // If before 8am, schedule for today at 8am
    // If after 8am, schedule for tomorrow at 8am
    const hoursUntil8AM =
      currentHour < DIGEST_SEND_HOUR
        ? DIGEST_SEND_HOUR - currentHour
        : 24 - currentHour + DIGEST_SEND_HOUR

    const next8AM = new Date(now.getTime() + hoursUntil8AM * 60 * 60 * 1000)
    return next8AM
  } catch (error) {
    console.error('[Batching] Error calculating next 8am:', error)
    // Fallback: 8 hours from now
    return new Date(Date.now() + 8 * 60 * 60 * 1000)
  }
}

// ============================================================================
// Throttling (Redis-based) - Phase 3 P10
// ============================================================================

/**
 * Check if user is throttled (exceeded 3 notifications per hour)
 * 
 * Uses Vercel KV (Redis) counter with 1-hour TTL
 * 
 * Implementation: Phase 3 P10 - Smart Notification Throttling
 * Date: December 16, 2025
 * 
 * Quality Gates:
 * - GI-7: Error handling with fallback (allow notification if Redis fails)
 * - GI-10: Efficient Redis operations (single GET)
 * - GI-11: Safe numeric operations
 */
export async function checkThrottle(fid: number): Promise<ThrottleCheckResult> {
  try {
    // Import KV dynamically to avoid server-only module issues
    const { kv } = await import('@vercel/kv')
    
    const throttleKey = `${REDIS_THROTTLE_KEY_PREFIX}${fid}`
    const count = await kv.get<number>(throttleKey)
    
    if (!count || count < MAX_NOTIFICATIONS_PER_HOUR) {
      return {
        isThrottled: false,
        notificationsInLastHour: count || 0,
      }
    }
    
    // User is throttled (>= 3 in last hour)
    // Calculate next available slot (end of current hour)
    const ttl = await kv.ttl(throttleKey)
    const nextSlot = ttl > 0 
      ? new Date(Date.now() + ttl * 1000) 
      : new Date(Date.now() + 3600 * 1000) // 1 hour fallback
    
    return {
      isThrottled: true,
      notificationsInLastHour: count,
      nextAvailableSlot: nextSlot,
    }
  } catch (error) {
    console.error('[Batching] Error checking throttle:', error)
    // Fail open: allow notification if throttle check fails
    // This prevents Redis outages from blocking all notifications
    return {
      isThrottled: false,
      notificationsInLastHour: 0,
    }
  }
}

/**
 * Increment throttle counter for user
 * 
 * Called after successfully sending a notification
 * Uses Redis INCR with 1-hour expiry on first increment
 * 
 * Implementation: Phase 3 P10 - Smart Notification Throttling
 * Date: December 16, 2025
 * 
 * Quality Gates:
 * - GI-7: Non-blocking (doesn't fail notification if increment fails)
 * - GI-10: Atomic INCR operation
 */
export async function incrementThrottle(fid: number): Promise<void> {
  try {
    // Import KV dynamically
    const { kv } = await import('@vercel/kv')
    
    const throttleKey = `${REDIS_THROTTLE_KEY_PREFIX}${fid}`
    
    // Increment counter (atomic operation)
    const newCount = await kv.incr(throttleKey)
    
    // Set TTL on first increment (newCount === 1)
    if (newCount === 1) {
      await kv.expire(throttleKey, REDIS_THROTTLE_TTL)
    }
    
    console.log(`[Batching] Throttle counter for FID ${fid}: ${newCount}/${MAX_NOTIFICATIONS_PER_HOUR}`)
  } catch (error) {
    console.error('[Batching] Error incrementing throttle:', error)
    // Non-blocking: don't fail notification send if throttle increment fails
    // Worst case: user gets one extra notification beyond limit
  }
}

// ============================================================================
// Batch Decision Logic
// ============================================================================

/**
 * Determine if notification should be batched or sent immediately
 * 
 * Decision tree:
 * 1. High priority (achievement, level) → always send immediately
 * 2. During quiet hours (10pm-8am) → batch until morning
 * 3. Throttled (3+ in last hour) → batch until next hour
 * 4. Otherwise → send immediately
 * 
 * Quality Gates:
 * - GI-7: Never throws, always returns decision
 * - GI-11: Safe time calculations
 * - GI-10: Efficient decision logic
 */
export async function shouldBatchNotification(
  input: BatchNotificationInput,
  supabase?: SupabaseClient
): Promise<BatchCheckResult> {
  try {
    const { fid, type, priority } = input

    // High priority notifications always send immediately (achievement, level)
    if (priority <= 2) {
      return {
        shouldBatch: false,
        reason: 'immediate',
      }
    }

    // Get user's timezone
    const timezone = await getUserTimezone(fid, supabase)

    // Check quiet hours (10pm-8am local time)
    if (isQuietHours(timezone)) {
      const scheduledFor = getNext8AM(timezone)
      return {
        shouldBatch: true,
        reason: 'quiet_hours',
        scheduledFor,
      }
    }

    // Check throttle (max 3 per hour)
    const throttleCheck = await checkThrottle(fid)
    if (throttleCheck.isThrottled) {
      // Schedule for next available hour or morning digest
      const scheduledFor =
        throttleCheck.nextAvailableSlot || getNext8AM(timezone)
      return {
        shouldBatch: true,
        reason: 'throttled',
        scheduledFor,
        queuePosition: throttleCheck.notificationsInLastHour,
      }
    }

    // Send immediately
    return {
      shouldBatch: false,
      reason: 'immediate',
    }
  } catch (error) {
    console.error('[Batching] Error in shouldBatchNotification:', error)
    // Fail open: send immediately if batching logic fails
    return {
      shouldBatch: false,
      reason: 'error',
    }
  }
}

/**
 * Queue notification for batched delivery
 * 
 * Inserts into notification_batch_queue table
 * 
 * Quality Gates:
 * - GI-7: Error handling with logging
 * - GI-11: Safe data validation
 */
export async function queueNotification(
  input: BatchNotificationInput,
  scheduledFor: Date,
  supabase?: SupabaseClient
): Promise<boolean> {
  try {
    const client = supabase || getSupabaseServerClient()
    if (!client) {
      console.error('[Batching] Supabase client not available')
      return false
    }

    const { fid, type, priority, payload } = input

    const { error } = await client.from('notification_batch_queue').insert({
      fid,
      notification_type: type,
      priority,
      scheduled_for: scheduledFor.toISOString(),
      payload,
    })

    if (error) {
      console.error('[Batching] Error queuing notification:', error)
      return false
    }

    console.log(
      `[Batching] Queued ${type} notification for FID ${fid} at ${scheduledFor.toISOString()}`
    )
    return true
  } catch (error) {
    console.error('[Batching] Error in queueNotification:', error)
    return false
  }
}

// ============================================================================
// Daily Digest
// ============================================================================

/**
 * Fetch pending notifications for a user's digest
 * 
 * Aggregates by type, counts, and returns grouped data
 */
export async function fetchPendingDigest(
  fid: number,
  supabase?: SupabaseClient
): Promise<DailyDigest | null> {
  try {
    const client = supabase || getSupabaseServerClient()
    if (!client) {
      return null
    }

    const result = await client
      .from('notification_batch_queue')
      .select('*')
      .eq('fid', fid)
      .is('delivered_at', null)
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
    
    const { data, error } = result

    if (error || !data || data.length === 0) {
      return null
    }

    // Group by notification type
    const grouped = new Map<NotificationBatchType, DigestNotification>()

    for (const item of data) {
      const type = item.notification_type as NotificationBatchType
      if (grouped.has(type)) {
        const existing = grouped.get(type)!
        existing.count++
      } else {
        grouped.set(type, {
          type,
          count: 1,
          latestPayload: item.payload as NotificationPayload,
        })
      }
    }

    return {
      fid,
      notifications: Array.from(grouped.values()),
      totalCount: data.length,
      scheduledFor: new Date(data[0].scheduled_for),
    }
  } catch (error) {
    console.error('[Batching] Error fetching pending digest:', error)
    return null
  }
}

/**
 * Build digest notification message
 * 
 * Aggregates multiple notifications into a single summary
 * 
 * Quality Gates:
 * - GI-13: Clear, concise digest format
 */
export function buildDigestMessage(digest: DailyDigest): NotificationPayload {
  const { notifications, totalCount } = digest

  // Single notification type → use original message
  if (notifications.length === 1 && totalCount === 1) {
    return notifications[0].latestPayload
  }

  // Multiple notifications → create summary
  const summary: string[] = []

  for (const notif of notifications) {
    const emoji = getNotificationEmoji(notif.type)
    if (notif.count === 1) {
      summary.push(`${emoji} ${notif.latestPayload.title}`)
    } else {
      summary.push(`${emoji} ${notif.count} ${notif.type} notifications`)
    }
  }

  return {
    title: `📬 ${totalCount} New Notification${totalCount > 1 ? 's' : ''}`,
    body: summary.slice(0, 3).join('\n') + (summary.length > 3 ? '\n...' : ''),
    targetUrl: '/notifications',
    metadata: {
      isDigest: true,
      notificationCount: totalCount,
      types: notifications.map((n) => n.type),
    },
  }
}

/**
 * Get emoji for notification type
 */
function getNotificationEmoji(type: NotificationBatchType): string {
  const emojiMap: Record<NotificationBatchType, string> = {
    achievement: '🏆',
    tip: '💰',
    quest: '🎯',
    badge: '🎖️',
    guild: '⚔️',
    gm: '☀️',
    level: '⬆️',
    rank: '📊',
    social: '👥',
    reward: '🎁',
  }
  return emojiMap[type] || '🔔'
}

/**
 * Mark notifications as delivered
 */
export async function markNotificationsDelivered(
  fid: number,
  supabase?: SupabaseClient
): Promise<boolean> {
  try {
    const client = supabase || getSupabaseServerClient()
    if (!client) {
      return false
    }

    const { error } = await client
      .from('notification_batch_queue')
      .update({ delivered_at: new Date().toISOString() })
      .eq('fid', fid)
      .is('delivered_at', null)
      .lte('scheduled_for', new Date().toISOString())

    if (error) {
      console.error('[Batching] Error marking delivered:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Batching] Error in markNotificationsDelivered:', error)
    return false
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Main entry point: Check if notification should batch, and queue if needed
 * 
 * Returns true if notification was queued, false if should send immediately
 */
export async function handleNotificationBatching(
  input: BatchNotificationInput,
  supabase?: SupabaseClient
): Promise<boolean> {
  const batchCheck = await shouldBatchNotification(input, supabase)

  if (batchCheck.shouldBatch && batchCheck.scheduledFor) {
    const queued = await queueNotification(
      input,
      batchCheck.scheduledFor,
      supabase
    )
    return queued
  }

  // Send immediately
  return false
}

/**
 * Send daily digest for a user
 * 
 * Called by cron job at 8am for each timezone
 */
export async function sendDailyDigest(
  fid: number,
  supabase?: SupabaseClient
): Promise<boolean> {
  try {
    const digest = await fetchPendingDigest(fid, supabase)
    if (!digest) {
      return false
    }

    const message = buildDigestMessage(digest)

    // TODO: Integrate with actual notification sender
    // For now, just mark as delivered
    console.log(`[Batching] Would send digest to FID ${fid}:`, message)

    const marked = await markNotificationsDelivered(fid, supabase)
    return marked
  } catch (error) {
    console.error('[Batching] Error sending daily digest:', error)
    return false
  }
}
