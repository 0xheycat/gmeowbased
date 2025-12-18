/**
 * @file lib/notifications/history.ts
 * @description Notification history persistence and retrieval using user_notification_history table
 * 
 * PHASE: Phase 7.7 - Notifications Module (December 18, 2025)
 * 
 * FEATURES:
 *   - Save notifications to persistent history (user_notification_history table)
 *   - Fetch notifications with filtering (category, read/dismissed status)
 *   - Mark notifications as read/dismissed with timestamp tracking
 *   - Auto-cleanup old notifications (max 100 per user)
 *   - Support both FID and wallet address identification
 *   - Notification count aggregation (unread, by category)
 *   - Comprehensive error tracking with silent production mode
 *   - Type-safe notification categories (11 types)
 *   - Notification tones for UI styling (7 severity levels)
 *   - Flexible metadata storage (JSONB for extensibility)
 * 
 * REFERENCE DOCUMENTATION:
 *   - Database Schema: user_notification_history table (types/supabase.ts)
 *   - Error Tracking: lib/notifications/error-tracking.ts
 *   - API Usage: app/api/user/notifications/[fid]/route.ts
 *   - Batching System: lib/notifications/notification-batching.ts
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Base blockchain (for wallet address tracking)
 *   - NO EMOJIS in production code
 *   - NO HARDCODED COLORS (use tone for styling)
 *   - Supabase client must be configured (isSupabaseConfigured check)
 *   - Either fid OR walletAddress required (not both)
 * 
 * TODO:
 *   - [ ] Add bulk operations (markAllAsRead, dismissByCriteria)
 *   - [ ] Implement notification expiration policy (auto-delete after 30 days)
 *   - [ ] Add notification search/filtering by text content
 *   - [ ] Support notification threading (parent/child relationships)
 *   - [ ] Add notification importance scoring (ML-based)
 *   - [ ] Implement cross-device notification sync
 *   - [ ] Add notification delivery receipts (sent/delivered/read)
 *   - [ ] Support rich media attachments (images, embeds)
 * 
 * CRITICAL:
 *   - MAX_HISTORY_PER_USER = 100 enforced via cleanupOldNotifications
 *   - Always lowercase wallet addresses before storage (address.toLowerCase())
 *   - Metadata must be typed as Json for Supabase JSONB compatibility
 *   - read_at and dismissed_at are mutually exclusive states (dismissed = removed from UI)
 *   - Category must match NotificationCategory enum (11 types)
 *   - Tone must match NotificationTone enum (7 types)
 *   - Error tracking uses silent mode in production (no console.error pollution)
 *   - Use ensureSupabase() for client initialization with proper error handling
 * 
 * SUGGESTIONS:
 *   - Consider implementing notification priority queue (high-priority first)
 *   - Add notification deduplication (same title/category within 5 min)
 *   - Implement read receipts with timestamp precision (milliseconds)
 *   - Add notification analytics (open rate, click-through rate)
 *   - Support notification preferences per category (opt-in/opt-out)
 *   - Add notification templates for consistent messaging
 *   - Implement push notification integration (FCM, APNs)
 *   - Add notification archiving (export to JSON/CSV)
 * 
 * AVOID:
 *   - ❌ DON'T store large blobs in metadata (use reference URLs instead)
 *   - ❌ DON'T save notifications without fid or walletAddress
 *   - ❌ DON'T use console.error directly (use trackError for silent production)
 *   - ❌ DON'T forget to cleanup old notifications (leads to bloat)
 *   - ❌ DON'T mix read and dismissed states (dismissed = permanent removal)
 *   - ❌ DON'T use uppercase wallet addresses (always lowercase)
 *   - ❌ DON'T return sensitive data in metadata (sanitize before storage)
 *   - ❌ DON'T allow unlimited history per user (enforce MAX_HISTORY_PER_USER)
 */

import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/edge'
import { trackError } from '@/lib/notifications/error-tracking'
import type { Json } from '@/types/supabase'

const TABLE_NAME = 'user_notification_history'
const MAX_HISTORY_PER_USER = 100

// Enhanced notification categories for all event types
export type NotificationCategory = 'gm' | 'quest' | 'badge' | 'level' | 'streak' | 'tip' | 'achievement' | 'reward' | 'guild' | 'system' | 'social'

// Notification tone/severity
export type NotificationTone = 'success' | 'error' | 'info' | 'warning' | 'achievement' | 'reward' | 'quest_added'

export type NotificationHistoryItem = {
  id: string
  fid: number | null
  wallet_address: string | null
  category: NotificationCategory
  title: string
  description: string | null
  tone: NotificationTone
  metadata: Record<string, any> | null
  action_label: string | null
  action_href: string | null
  dismissed_at: string | null
  read_at: string | null  // Phase 6.1: Mark as read tracking
  created_at: string
}

export type SaveNotificationInput = {
  fid?: number | null
  walletAddress?: string | null
  category: NotificationCategory
  title: string
  description?: string | null
  tone: NotificationTone
  metadata?: Record<string, unknown> | null
  actionLabel?: string | null
  actionHref?: string | null
}

export type FetchNotificationsInput = {
  fid?: number | null
  walletAddress?: string | null
  category?: NotificationCategory
  limit?: number
  offset?: number
  includeDismissed?: boolean
}

function ensureSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client is not configured')
  }
  const client = getSupabaseServerClient()
  if (!client) {
    throw new Error('Failed to initialize Supabase client')
  }
  return client
}

/**
 * Save a notification to history
 */
export async function saveNotification(input: SaveNotificationInput): Promise<boolean> {
  if (!input.fid && !input.walletAddress) {
    return false
  }

  try {
    const client = ensureSupabase()
    
    const payload = {
      fid: input.fid ?? null,
      wallet_address: input.walletAddress ? input.walletAddress.toLowerCase() : null,
      category: input.category,
      title: input.title,
      description: input.description ?? null,
      tone: input.tone,
      metadata: (input.metadata ?? null) as Json,
      action_label: input.actionLabel ?? null,
      action_href: input.actionHref ?? null,
    }

    const { error } = await client.from(TABLE_NAME).insert(payload)

    if (error) {
      trackError('notification_save_failed', error, {
        function: 'saveNotification',
        fid: input.fid,
        category: input.category,
      })
      return false
    }

    // Cleanup old notifications if we exceed the limit
    if (input.fid || input.walletAddress) {
      await cleanupOldNotifications(input.fid, input.walletAddress)
    }

    return true
  } catch (error) {
    trackError('notification_save_error', error, {
      function: 'saveNotification',
      fid: input.fid,
    })
    return false
  }
}

/**
 * Fetch notification history for a user
 */
export async function fetchNotifications(input: FetchNotificationsInput): Promise<NotificationHistoryItem[]> {
  if (!input.fid && !input.walletAddress) {
    return []
  }

  try {
    const client = ensureSupabase()
    
    let query = client
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(input.limit ?? 50)

    // Filter by user
    if (input.fid) {
      query = query.eq('fid', input.fid)
    } else if (input.walletAddress) {
      query = query.eq('wallet_address', input.walletAddress.toLowerCase())
    }

    // Filter by category
    if (input.category) {
      query = query.eq('category', input.category)
    }

    // Filter dismissed
    if (!input.includeDismissed) {
      query = query.is('dismissed_at', null)
    }

    // Pagination
    if (input.offset) {
      query = query.range(input.offset, input.offset + (input.limit ?? 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      trackError('notification_fetch_failed', error, {
        function: 'getNotifications',
        fid: input.fid,
        walletAddress: input.walletAddress,
      })
      return []
    }

    return (data as NotificationHistoryItem[]) ?? []
  } catch (error) {
    trackError('notification_fetch_error', error, {
      function: 'getNotifications',
      fid: input.fid,
    })
    return []
  }
}

/**
 * Mark notification as read or unread
 * 
 * PHASE: Phase 6.1 - Week 1 Day 2 (December 15, 2025)
 * REFERENCE: NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md (Phase 6.2)
 * 
 * @param notificationId - UUID of notification to update
 * @param read - true = mark as read, false = mark as unread
 * @param fid - Farcaster ID for authorization (optional)
 * @param walletAddress - Wallet address for authorization (optional)
 * @returns Promise<boolean> - Success status
 */
export async function markAsRead(
  notificationId: string,
  read: boolean,
  fid?: number | null,
  walletAddress?: string | null
): Promise<boolean> {
  if (!notificationId) {
    return false
  }

  try {
    const client = ensureSupabase()
    
    const read_at = read ? new Date().toISOString() : null
    
    let query = client
      .from(TABLE_NAME)
      .update({ read_at })
      .eq('id', notificationId)

    // Add FID or wallet filter for authorization
    if (fid) {
      query = query.eq('fid', fid)
    } else if (walletAddress) {
      query = query.eq('wallet_address', walletAddress.toLowerCase())
    }

    const { error } = await query

    if (error) {
      trackError('notification_mark_read_failed', error, {
        function: 'markAsRead',
        notificationId,
        read,
        fid,
      })
      return false
    }

    return true
  } catch (error) {
    trackError('notification_mark_read_error', error, {
      function: 'markAsRead',
      notificationId,
      read,
    })
    return false
  }
}

/**
 * Mark a notification as dismissed
 */
export async function dismissNotification(notificationId: string): Promise<boolean> {
  try {
    const client = ensureSupabase()
    
    const { error } = await client
      .from(TABLE_NAME)
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) {
      trackError('notification_dismiss_failed', error, {
        function: 'dismissNotification',
        notificationId,
      })
      return false
    }

    return true
  } catch (error) {
    trackError('notification_dismiss_error', error, {
      function: 'dismissNotification',
      notificationId,
    })
    return false
  }
}

/**
 * Dismiss all notifications for a user
 */
export async function dismissAllNotifications(fid?: number | null, walletAddress?: string | null): Promise<boolean> {
  if (!fid && !walletAddress) {
    return false
  }

  try {
    const client = ensureSupabase()
    
    let query = client
      .from(TABLE_NAME)
      .update({ dismissed_at: new Date().toISOString() })
      .is('dismissed_at', null)

    if (fid) {
      query = query.eq('fid', fid)
    } else if (walletAddress) {
      query = query.eq('wallet_address', walletAddress.toLowerCase())
    }

    const { error } = await query

    if (error) {
      trackError('notification_dismiss_all_failed', error, {
        function: 'dismissAllNotifications',
        fid,
        walletAddress,
      })
      return false
    }

    return true
  } catch (error) {
    trackError('notification_dismiss_all_error', error, {
      function: 'dismissAllNotifications',
      fid,
    })
    return false
  }
}

/**
 * Clear notification history for a user (hard delete)
 */
export async function clearHistory(fid?: number | null, walletAddress?: string | null): Promise<boolean> {
  if (!fid && !walletAddress) {
    return false
  }

  try {
    const client = ensureSupabase()
    
    let query = client.from(TABLE_NAME).delete()

    if (fid) {
      query = query.eq('fid', fid)
    } else if (walletAddress) {
      query = query.eq('wallet_address', walletAddress.toLowerCase())
    }

    const { error } = await query

    if (error) {
      trackError('notification_clear_failed', error, {
        function: 'clearNotificationHistory',
        fid,
        walletAddress,
      })
      return false
    }

    return true
  } catch (error) {
    trackError('notification_clear_error', error, {
      function: 'clearNotificationHistory',
      fid,
    })
    return false
  }
}

/**
 * Cleanup old notifications to keep under MAX_HISTORY_PER_USER
 */
async function cleanupOldNotifications(fid?: number | null, walletAddress?: string | null): Promise<void> {
  try {
    const client = ensureSupabase()
    
    // Get count of notifications for this user
    let countQuery = client.from(TABLE_NAME).select('id', { count: 'exact', head: true })

    if (fid) {
      countQuery = countQuery.eq('fid', fid)
    } else if (walletAddress) {
      countQuery = countQuery.eq('wallet_address', walletAddress.toLowerCase())
    }

    const { count } = await countQuery

    if (!count || count <= MAX_HISTORY_PER_USER) {
      return
    }

    // Delete oldest notifications beyond the limit
    const toDelete = count - MAX_HISTORY_PER_USER

    let query = client
      .from(TABLE_NAME)
      .select('id')
      .order('created_at', { ascending: true })
      .limit(toDelete)

    if (fid) {
      query = query.eq('fid', fid)
    } else if (walletAddress) {
      query = query.eq('wallet_address', walletAddress.toLowerCase())
    }

    const { data: oldNotifications } = await query

    if (oldNotifications && oldNotifications.length > 0) {
      const idsToDelete = oldNotifications.map((n: any) => n.id)
      await client.from(TABLE_NAME).delete().in('id', idsToDelete)
    }
  } catch (error) {
    trackError('notification_cleanup_error', error, {
      function: 'cleanupOldNotifications',
      fid,
    })
  }
}

/**
 * Get notification count for a user
 */
export async function getNotificationCount(
  fid?: number | null,
  walletAddress?: string | null,
  includeDismissed = false,
): Promise<number> {
  if (!fid && !walletAddress) {
    return 0
  }

  try {
    const client = ensureSupabase()
    
    let query = client.from(TABLE_NAME).select('id', { count: 'exact', head: true })

    if (fid) {
      query = query.eq('fid', fid)
    } else if (walletAddress) {
      query = query.eq('wallet_address', walletAddress.toLowerCase())
    }

    if (!includeDismissed) {
      query = query.is('dismissed_at', null)
    }

    const { count } = await query

    return count ?? 0
  } catch (error) {
    trackError('notification_count_error', error, {
      function: 'getUnreadCount',
      fid,
    })
    return 0
  }
}
