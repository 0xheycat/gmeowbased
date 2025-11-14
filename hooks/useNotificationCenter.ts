import { useMemo } from 'react'
import { useNotifications, type NotificationItem, type NotificationCategory } from '@/components/ui/live-notifications'

type NotificationCenterResult = {
  notifications: NotificationItem[]
  categories: NotificationCategory[]
  dismiss: (id: number) => void
  dismissAll: () => void
}

export function useNotificationCenter(): NotificationCenterResult {
  const { items, dismiss, dismissAll } = useNotifications()

  const notifications = useMemo(
    () => [...items].sort((a, b) => b.createdAt - a.createdAt),
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
    dismissAll,
  }
}
