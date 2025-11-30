'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, X } from '@phosphor-icons/react'
import { fetchNotifications, dismissNotification, dismissAllNotifications } from '@/lib/notification-history'
import type { NotificationHistoryItem } from '@/lib/notification-history'

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'quest' | 'badge' | 'guild' | 'reward'>('all')

  useEffect(() => {
    loadNotifications()
  }, [filter])

  useEffect(() => {
    // ESC key to go back
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await fetchNotifications({
        category: filter === 'all' ? undefined : filter,
        limit: 50,
        includeDismissed: false,
      })
      setNotifications(data)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async (id: string) => {
    const success = await dismissNotification(id)
    if (success) {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }
  }

  const handleDismissAll = async () => {
    // Note: This requires FID from context - simplified for now
    setNotifications([])
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'quest':
        return '📜'
      case 'badge':
        return '🏅'
      case 'guild':
        return '👥'
      case 'reward':
        return '💰'
      case 'level':
        return '⬆️'
      case 'streak':
        return '🔥'
      case 'tip':
        return '💎'
      default:
        return '🔔'
    }
  }

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'success':
        return 'text-green-500'
      case 'warning':
        return 'text-yellow-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'theme-text-secondary'
    }
  }

  const getTimeSince = (createdAt: string) => {
    const now = new Date()
    const eventDate = new Date(createdAt)
    const seconds = Math.floor((now.getTime() - eventDate.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return eventDate.toLocaleDateString()
  }

  return (
    <div className="min-h-screen theme-bg-default pb-20 lg:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b theme-border-default theme-bg-raised backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          {/* Back Button + Title */}
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/"
              className="flex items-center justify-center w-10 h-10 rounded-lg theme-hover-bg-subtle transition-all group"
            >
              <ArrowLeft size={20} className="theme-text-secondary group-hover:theme-text-primary" weight="bold" />
            </Link>
            <div>
              <h1 className="text-xl font-bold theme-text-primary">Notifications</h1>
              <p className="text-xs text-default-600">Your activity feed</p>
            </div>
            {notifications.length > 0 && (
              <button
                onClick={handleDismissAll}
                className="ml-auto text-xs theme-text-secondary hover:theme-text-primary transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'quest', 'badge', 'guild', 'reward'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'theme-bg-subtle theme-text-primary hover:theme-bg-hover'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-default-600">Loading notifications...</p>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 theme-bg-subtle rounded-lg">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-lg font-bold theme-text-primary mb-2">No notifications yet</h3>
            <p className="text-default-600">
              {filter === 'all' 
                ? "When you receive notifications, they'll appear here"
                : `No ${filter} notifications to show`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="theme-bg-raised border theme-border-default rounded-lg p-4 relative group hover:theme-bg-hover transition-all"
              >
                <button
                  onClick={() => handleDismiss(notification.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded theme-hover-bg-subtle"
                  aria-label="Dismiss"
                >
                  <X size={16} className="theme-text-secondary" />
                </button>

                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="text-2xl flex-shrink-0">
                    {getCategoryIcon(notification.category)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`font-bold ${getToneColor(notification.tone)}`}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-default-600 whitespace-nowrap">
                        {getTimeSince(notification.createdAt)}
                      </span>
                    </div>

                    {notification.description && (
                      <p className="text-sm theme-text-secondary mb-2">
                        {notification.description}
                      </p>
                    )}

                    {notification.actionHref && notification.actionLabel && (
                      <Link
                        href={notification.actionHref}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        {notification.actionLabel} →
                      </Link>
                    )}

                    {/* Metadata badges */}
                    {notification.metadata && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {notification.metadata.xp_awarded && (
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                            +{notification.metadata.xp_awarded} XP
                          </span>
                        )}
                        {notification.metadata.streak_count && (
                          <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-500">
                            🔥 {notification.metadata.streak_count} day streak
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
