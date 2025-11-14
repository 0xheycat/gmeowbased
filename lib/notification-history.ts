import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase-server'
import type { NotificationCategory, NotificationTone } from '@/components/ui/live-notifications'

const TABLE_NAME = 'user_notification_history'
const MAX_HISTORY_PER_USER = 100

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
    console.warn('[notification-history] No user identifier provided')
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
      metadata: input.metadata ?? null,
      action_label: input.actionLabel ?? null,
      action_href: input.actionHref ?? null,
    }

    const { error } = await client.from(TABLE_NAME).insert(payload)

    if (error) {
      console.error('[notification-history] Save failed:', error)
      return false
    }

    // Cleanup old notifications if we exceed the limit
    if (input.fid || input.walletAddress) {
      await cleanupOldNotifications(input.fid, input.walletAddress)
    }

    return true
  } catch (error) {
    console.error('[notification-history] Save error:', error)
    return false
  }
}

/**
 * Fetch notification history for a user
 */
export async function fetchNotifications(input: FetchNotificationsInput): Promise<NotificationHistoryItem[]> {
  if (!input.fid && !input.walletAddress) {
    console.warn('[notification-history] No user identifier provided')
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
      console.error('[notification-history] Fetch failed:', error)
      return []
    }

    return (data as NotificationHistoryItem[]) ?? []
  } catch (error) {
    console.error('[notification-history] Fetch error:', error)
    return []
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
      console.error('[notification-history] Dismiss failed:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[notification-history] Dismiss error:', error)
    return false
  }
}

/**
 * Dismiss all notifications for a user
 */
export async function dismissAllNotifications(fid?: number | null, walletAddress?: string | null): Promise<boolean> {
  if (!fid && !walletAddress) {
    console.warn('[notification-history] No user identifier provided')
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
      console.error('[notification-history] Dismiss all failed:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[notification-history] Dismiss all error:', error)
    return false
  }
}

/**
 * Clear notification history for a user (hard delete)
 */
export async function clearHistory(fid?: number | null, walletAddress?: string | null): Promise<boolean> {
  if (!fid && !walletAddress) {
    console.warn('[notification-history] No user identifier provided')
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
      console.error('[notification-history] Clear history failed:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[notification-history] Clear history error:', error)
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
    console.error('[notification-history] Cleanup error:', error)
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
    console.error('[notification-history] Get count error:', error)
    return 0
  }
}
