/**
 * Notification History - Supabase Storage
 * 
 * Saves user notifications to Supabase for persistence and history tracking.
 * Used by the live-notifications system to store notification events.
 */

import { getSupabaseEdgeClient } from '@/lib/supabase'

export interface SaveNotificationParams {
  fid?: number
  walletAddress?: string
  category: string
  title: string
  description?: string | null
  tone: 'success' | 'error' | 'info' | 'warning'
  metadata?: {
    mentionedUser?: string
    rewardAmount?: number
    streakCount?: number
    [key: string]: any
  }
  actionLabel?: string | null
  actionHref?: string | null
}

export interface NotificationHistoryItem {
  id: string
  fid: number | null
  walletAddress: string | null
  category: string
  title: string
  description: string | null
  tone: 'success' | 'error' | 'info' | 'warning'
  metadata: Record<string, any> | null
  actionLabel: string | null
  actionHref: string | null
  dismissedAt: string | null
  createdAt: string
}

export interface FetchNotificationsParams {
  fid?: number
  walletAddress?: string
  category?: string
  limit?: number
  includeDismissed?: boolean
}

/**
 * Save a notification to Supabase user_notification_history table
 */
export async function saveNotification(params: SaveNotificationParams): Promise<void> {
  try {
    const supabase = getSupabaseEdgeClient()
    if (!supabase) return
    
    const { error } = await supabase
      .from('user_notification_history')
      .insert({
        fid: params.fid,
        wallet_address: params.walletAddress,
        category: params.category,
        title: params.title,
        description: params.description,
        tone: params.tone,
        metadata: params.metadata || {},
        action_label: params.actionLabel,
        action_href: params.actionHref,
        created_at: new Date().toISOString(),
      })
    
    // Silent fail in production - don't spam logs
    if (error && process.env.NODE_ENV === 'development') {
      console.warn('[saveNotification] Failed:', error.message)
    }
  } catch (err) {
    // Silent fail - notifications shouldn't block UI
  }
}

/**
 * Fetch notification history for a user
 */
export async function fetchNotifications(params: FetchNotificationsParams = {}): Promise<NotificationHistoryItem[]> {
  try {
    const supabase = getSupabaseEdgeClient()
    if (!supabase) return []

    let query = supabase
      .from('user_notification_history')
      .select('*')
      .order('created_at', { ascending: false })

    // Filter by user
    if (params.fid) {
      query = query.eq('fid', params.fid)
    } else if (params.walletAddress) {
      query = query.eq('wallet_address', params.walletAddress.toLowerCase())
    }

    // Filter by category
    if (params.category) {
      query = query.eq('category', params.category)
    }

    // Filter dismissed
    if (!params.includeDismissed) {
      query = query.is('dismissed_at', null)
    }

    // Limit results
    if (params.limit) {
      query = query.limit(params.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('[fetchNotifications] Query error:', error.message)
      return []
    }

    return (data || []).map(row => ({
      id: row.id,
      fid: row.fid,
      walletAddress: row.wallet_address,
      category: row.category,
      title: row.title,
      description: row.description,
      tone: row.tone as 'success' | 'error' | 'info' | 'warning',
      metadata: row.metadata as Record<string, any> | null,
      actionLabel: row.action_label,
      actionHref: row.action_href,
      dismissedAt: row.dismissed_at,
      createdAt: row.created_at,
    }))
  } catch (err) {
    console.error('[fetchNotifications] Error:', err instanceof Error ? err.message : 'Unknown error')
    return []
  }
}

/**
 * Dismiss a single notification
 */
export async function dismissNotification(notificationId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseEdgeClient()
    if (!supabase) return false

    const { error } = await supabase
      .from('user_notification_history')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) {
      console.error('[dismissNotification] Update error:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('[dismissNotification] Error:', err instanceof Error ? err.message : 'Unknown error')
    return false
  }
}

/**
 * Dismiss all notifications for a user
 */
export async function dismissAllNotifications(fid?: number, walletAddress?: string): Promise<boolean> {
  try {
    const supabase = getSupabaseEdgeClient()
    if (!supabase) return false

    if (!fid && !walletAddress) {
      console.error('[dismissAllNotifications] Must provide fid or walletAddress')
      return false
    }

    let query = supabase
      .from('user_notification_history')
      .update({ dismissed_at: new Date().toISOString() })
      .is('dismissed_at', null)

    if (fid) {
      query = query.eq('fid', fid)
    } else if (walletAddress) {
      query = query.eq('wallet_address', walletAddress.toLowerCase())
    }

    const { error } = await query

    if (error) {
      console.error('[dismissAllNotifications] Update error:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('[dismissAllNotifications] Error:', err instanceof Error ? err.message : 'Unknown error')
    return false
  }
}

/**
 * Get unread notification count for a user
 */
export async function getNotificationCount(fid?: number, walletAddress?: string): Promise<number> {
  try {
    const supabase = getSupabaseEdgeClient()
    if (!supabase) {
      return 0
    }

    let query = supabase
      .from('user_notification_history')
      .select('id', { count: 'exact', head: true })
      .is('dismissed_at', null)

    if (fid) {
      query = query.eq('fid', fid)
    } else if (walletAddress) {
      query = query.eq('wallet_address', walletAddress.toLowerCase())
    } else {
      return 0
    }

    const { count, error } = await query

    if (error) {
      console.error('[getNotificationCount] Query error:', error.message)
      return 0
    }

    return count || 0
  } catch (err) {
    console.error('[getNotificationCount] Error:', err instanceof Error ? err.message : 'Unknown error')
    return 0
  }
}
