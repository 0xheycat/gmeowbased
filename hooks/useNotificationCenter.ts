import { useMemo } from 'react'
import { useNotifications, type NotificationItem, type NotificationCategory } from '@/components/ui/live-notifications'

type NotificationCenterResult = {
  notifications: NotificationItem[]
  categories: NotificationCategory[]
  dismiss: (id: string) => void
  dismissAll: () => void
}

export function useNotificationCenter(): NotificationCenterResult {
  const { items, dismiss, clearNotifications } = useNotifications()

  const notifications = useMemo(
    () => [...items].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
    [items],
  )

  const categories = useMemo(() => {
    const set = new Set<NotificationCategory>()
    for (const note of notifications) {
      if (note.category) set.add(note.category)
    }
    return Array.from(set.values())
  }, [notifications])

  return {
    notifications,
    categories,
    dismiss,
    dismissAll: clearNotifications,
  }
}
