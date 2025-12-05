import { cookies } from 'next/headers'
import { fetchNotifications } from '@/lib/notification-history'

export async function getNotificationData() {
  try {
    // Get FID from cookies (Next.js 15 requires await)
    const cookieStore = await cookies()
    const fidCookie = cookieStore.get('fid')
    const fid = fidCookie ? parseInt(fidCookie.value, 10) : null
    
    if (!fid) {
      return { notifications: [], unreadCount: 0 }
    }

    const notifications = await fetchNotifications({
      fid,
      limit: 10,
      includeDismissed: false,
    })

    // Count unread (not dismissed)
    const unreadCount = notifications.filter(n => !n.dismissed_at).length

    return {
      notifications,
      unreadCount,
    }
  } catch (error) {
    console.error('[getNotificationData] Error:', error)
    return { notifications: [], unreadCount: 0 }
  }
}
