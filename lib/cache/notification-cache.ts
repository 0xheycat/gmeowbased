/**
 * Notification Cache
 * Phase 7 Priority 4: Notification Caching Layer
 * 
 * PURPOSE:
 * - Prevent duplicate notifications (spam prevention)
 * - Cache notification preferences (reduce DB queries)
 * - Track recent notifications for user experience
 * - Rate limit notification frequency per user
 * 
 * FEATURES:
 * ✅ Duplicate notification prevention
 * ✅ Per-user rate limiting (max 1/hour per type)
 * ✅ Notification history tracking (24 hours)
 * ✅ Preference caching (1 hour TTL)
 * 
 * PERFORMANCE TARGETS:
 * - Duplicate check: <5ms (Redis lookup)
 * - Preference cache hit: 90%+
 * - Rate limit check: <5ms
 * - Overall notification latency: <10ms (cached)
 * 
 * TTL STRATEGY:
 * - Notification sent: 24 hours (prevent duplicates)
 * - User preferences: 1 hour (allow updates)
 * - Rate limit window: 1 hour (per type)
 * - Notification history: 7 days (analytics)
 * 
 * Created: December 19, 2025 (Phase 7 Priority 4)
 * Reference: PHASE-7-PERFORMANCE-OPTIMIZATION-PLAN.md
 */

import redis from './redis-client'

// ============================================================================
// Notification Deduplication
// ============================================================================

export type NotificationType =
  | 'viral_milestone'
  | 'xp_reward'
  | 'achievement_unlocked'
  | 'leaderboard_rank'
  | 'tip_received'
  | 'mention_reply'
  | 'badge_earned'

/**
 * Check if notification was recently sent
 * 
 * Prevents duplicate notifications within a time window.
 * 
 * @param userId - User identifier (FID)
 * @param notificationType - Type of notification
 * @param uniqueId - Optional unique identifier (e.g., cast hash)
 * @returns true if notification was already sent
 */
export async function wasNotificationSent(
  userId: string | number,
  notificationType: NotificationType,
  uniqueId?: string
): Promise<boolean> {
  try {
    const key = `notification:sent:${userId}:${notificationType}${uniqueId ? `:${uniqueId}` : ''}`
    const exists = await redis.exists(key)
    
    if (exists) {
      console.log(`[Notification Cache] DUPLICATE: ${notificationType} for user ${userId}`)
    }
    
    return exists === 1
  } catch (error) {
    console.error('[Notification Cache] Error checking sent status:', error)
    // Fail open - allow notification on cache error
    return false
  }
}

/**
 * Mark notification as sent
 * 
 * @param userId - User identifier (FID)
 * @param notificationType - Type of notification
 * @param uniqueId - Optional unique identifier
 * @param ttl - Time to live in seconds (default: 24 hours)
 */
export async function markNotificationSent(
  userId: string | number,
  notificationType: NotificationType,
  uniqueId?: string,
  ttl: number = 24 * 60 * 60
): Promise<void> {
  try {
    const key = `notification:sent:${userId}:${notificationType}${uniqueId ? `:${uniqueId}` : ''}`
    const timestamp = Date.now()
    await redis.setex(key, ttl, timestamp.toString())
    console.log(`[Notification Cache] MARKED: ${notificationType} for user ${userId} (TTL: ${ttl}s)`)
  } catch (error) {
    console.error('[Notification Cache] Error marking sent:', error)
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Check if user can receive notification (rate limit)
 * 
 * Prevents notification spam by enforcing rate limits per type.
 * Default: 1 notification per hour per type.
 * 
 * @param userId - User identifier (FID)
 * @param notificationType - Type of notification
 * @returns true if notification can be sent
 */
export async function canSendNotification(
  userId: string | number,
  notificationType: NotificationType
): Promise<boolean> {
  try {
    const key = `notification:ratelimit:${userId}:${notificationType}`
    const count = await redis.get(key)
    
    if (count && parseInt(count) > 0) {
      console.log(`[Notification Cache] RATE LIMITED: ${notificationType} for user ${userId}`)
      return false
    }
    
    return true
  } catch (error) {
    console.error('[Notification Cache] Error checking rate limit:', error)
    // Fail open - allow notification on cache error
    return true
  }
}

/**
 * Record notification sent (for rate limiting)
 * 
 * @param userId - User identifier (FID)
 * @param notificationType - Type of notification
 * @param windowSeconds - Rate limit window (default: 1 hour)
 */
export async function recordNotificationSent(
  userId: string | number,
  notificationType: NotificationType,
  windowSeconds: number = 60 * 60
): Promise<void> {
  try {
    const key = `notification:ratelimit:${userId}:${notificationType}`
    await redis.setex(key, windowSeconds, '1')
    console.log(`[Notification Cache] RATE LIMIT SET: ${notificationType} for user ${userId} (${windowSeconds}s)`)
  } catch (error) {
    console.error('[Notification Cache] Error recording rate limit:', error)
  }
}

// ============================================================================
// Notification Preferences
// ============================================================================

export type NotificationPreferences = {
  enabled: boolean
  types: {
    [K in NotificationType]?: boolean
  }
  cachedAt: number
}

/**
 * Get cached notification preferences
 * 
 * @param userId - User identifier (FID)
 * @returns Cached preferences or null
 */
export async function getCachedNotificationPreferences(
  userId: string | number
): Promise<NotificationPreferences | null> {
  try {
    const key = `notification:prefs:${userId}`
    const cached = await redis.get(key)
    
    if (cached) {
      console.log(`[Notification Cache] Preferences HIT: user ${userId}`)
      return JSON.parse(cached)
    }
    
    return null
  } catch (error) {
    console.error('[Notification Cache] Error getting preferences:', error)
    return null
  }
}

/**
 * Cache notification preferences
 * 
 * @param userId - User identifier (FID)
 * @param preferences - User notification preferences
 * @param ttl - Time to live in seconds (default: 1 hour)
 */
export async function setCachedNotificationPreferences(
  userId: string | number,
  preferences: Omit<NotificationPreferences, 'cachedAt'>,
  ttl: number = 60 * 60
): Promise<void> {
  try {
    const key = `notification:prefs:${userId}`
    const cacheData: NotificationPreferences = {
      ...preferences,
      cachedAt: Date.now(),
    }
    
    await redis.setex(key, ttl, JSON.stringify(cacheData))
    console.log(`[Notification Cache] Preferences SET: user ${userId} (TTL: ${ttl}s)`)
  } catch (error) {
    console.error('[Notification Cache] Error caching preferences:', error)
  }
}

/**
 * Invalidate notification preferences cache
 * 
 * Call this when user updates their notification settings.
 * 
 * @param userId - User identifier (FID)
 */
export async function invalidateNotificationPreferences(
  userId: string | number
): Promise<void> {
  try {
    const key = `notification:prefs:${userId}`
    await redis.del(key)
    console.log(`[Notification Cache] Preferences INVALIDATED: user ${userId}`)
  } catch (error) {
    console.error('[Notification Cache] Error invalidating preferences:', error)
  }
}

// ============================================================================
// Notification History
// ============================================================================

export type NotificationHistoryEntry = {
  type: NotificationType
  sentAt: number
  uniqueId?: string
  metadata?: Record<string, unknown>
}

/**
 * Get recent notifications for user
 * 
 * @param userId - User identifier (FID)
 * @param limit - Max number of notifications to return (default: 20)
 * @returns Array of recent notifications
 */
export async function getRecentNotifications(
  userId: string | number,
  limit: number = 20
): Promise<NotificationHistoryEntry[]> {
  try {
    const key = `notification:history:${userId}`
    const entries = await redis.lrange(key, 0, limit - 1)
    
    return entries.map((entry: string) => JSON.parse(entry) as NotificationHistoryEntry)
  } catch (error) {
    console.error('[Notification Cache] Error getting history:', error)
    return []
  }
}

/**
 * Add notification to history
 * 
 * @param userId - User identifier (FID)
 * @param entry - Notification entry to add
 * @param ttl - Time to live for history list (default: 7 days)
 */
export async function addToNotificationHistory(
  userId: string | number,
  entry: NotificationHistoryEntry,
  ttl: number = 7 * 24 * 60 * 60
): Promise<void> {
  try {
    const key = `notification:history:${userId}`
    
    // Add to front of list (most recent first)
    await redis.lpush(key, JSON.stringify(entry))
    
    // Trim to last 100 notifications
    await redis.ltrim(key, 0, 99)
    
    // Set expiration
    await redis.expire(key, ttl)
    
    console.log(`[Notification Cache] History ADD: ${entry.type} for user ${userId}`)
  } catch (error) {
    console.error('[Notification Cache] Error adding to history:', error)
  }
}

// ============================================================================
// Cache Statistics
// ============================================================================

export type NotificationCacheStats = {
  sentNotifications: number
  rateLimitedUsers: number
  cachedPreferences: number
  historyEntries: number
}

/**
 * Get notification cache statistics
 * 
 * @returns Cache statistics object
 */
export async function getNotificationCacheStats(): Promise<NotificationCacheStats> {
  try {
    const [sentKeys, rateLimitKeys, prefsKeys, historyKeys] = await Promise.all([
      redis.keys('notification:sent:*'),
      redis.keys('notification:ratelimit:*'),
      redis.keys('notification:prefs:*'),
      redis.keys('notification:history:*'),
    ])
    
    return {
      sentNotifications: sentKeys.length,
      rateLimitedUsers: rateLimitKeys.length,
      cachedPreferences: prefsKeys.length,
      historyEntries: historyKeys.length,
    }
  } catch (error) {
    console.error('[Notification Cache] Error getting stats:', error)
    return {
      sentNotifications: 0,
      rateLimitedUsers: 0,
      cachedPreferences: 0,
      historyEntries: 0,
    }
  }
}

/**
 * Clear all notification caches
 * 
 * Dangerous operation - use with caution.
 * 
 * @returns Number of keys deleted
 */
export async function clearNotificationCaches(): Promise<number> {
  try {
    console.log('[Notification Cache] Clearing all notification caches...')
    
    const keys = await redis.keys('notification:*')
    
    if (keys.length === 0) {
      return 0
    }
    
    const deleted = await redis.del(...keys)
    console.log(`[Notification Cache] Cleared ${deleted} notification cache keys`)
    return deleted
  } catch (error) {
    console.error('[Notification Cache] Error clearing caches:', error)
    return 0
  }
}
