'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody } from '@/components/ui/tailwick-primitives'
import { Badge } from '@/components/ui/tailwick-primitives'
import type { CommunityEventSummary } from '@/lib/community-event-types'

/**
 * Notifications Page
 * 
 * Displays user activity feed using community events
 * - Quest completions
 * - GM streaks
 * - Tips received
 * - Badge awards
 * - Guild activities
 * 
 * UI Pattern: Tailwick v2.0 Card + List
 * Icons: Gmeowbased v0.1 SVG set
 * Source: Reused event logic from old foundation
 * Created: Nov 27, 2025
 * Updated: Added back navigation button
 */

interface NotificationResponse {
  ok: boolean
  notifications: CommunityEventSummary[]
  meta: {
    totalCount: number
    unreadCount: number
    userFid: number | null
  }
  fetchedAt: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<CommunityEventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'quests' | 'gm' | 'tips'>('all')
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
  }, [filter])

  useEffect(() => {
    // Keyboard navigation: ESC to go back
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/app')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const types = filter === 'all' ? '' : 
        filter === 'quests' ? 'quest-verify,quest-create' :
        filter === 'gm' ? 'gm' :
        filter === 'tips' ? 'tip' : ''
      
      const url = `/api/notifications?limit=30${types ? `&types=${types}` : ''}`
      const response = await fetch(url)
      
      if (response.ok) {
        const data: NotificationResponse = await response.json()
        setNotifications(data.notifications)
        setUnreadCount(data.meta.unreadCount)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'gm':
        return '/assets/gmeow-icons/Success Box Icon.svg'
      case 'quest-verify':
      case 'quest-create':
        return '/assets/gmeow-icons/Quests Icon.svg'
      case 'tip':
        return '/assets/gmeow-icons/Trophy Icon.svg'
      case 'stake':
      case 'unstake':
        return '/assets/gmeow-icons/Wallet Icon.svg'
      default:
        return '/assets/gmeow-icons/Notifications Icon.svg'
    }
  }

  const getEventColor = (emphasis: string) => {
    switch (emphasis) {
      case 'positive':
        return 'text-success'
      case 'negative':
        return 'text-danger'
      default:
        return 'text-default-600'
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

  const getActorLabel = (actor: CommunityEventSummary['actor']) => {
    if (actor.displayName) return actor.displayName
    if (actor.username) return `@${actor.username}`
    if (actor.fid) return `pilot #${actor.fid}`
    if (actor.walletAddress) return `${actor.walletAddress.slice(0, 6)}…${actor.walletAddress.slice(-4)}`
    return 'A pilot'
  }

  return (
    <div className="page-bg-notifications">
      {/* Header */}
      <div className="border-b theme-border-default theme-bg-overlay backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          {/* Back Button Row */}
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/app"
              className="flex items-center justify-center w-10 h-10 rounded-lg theme-bg-subtle hover:theme-bg-hover transition-all group"
            >
              <svg 
                className="w-5 h-5 theme-text-secondary group-hover:theme-text-primary transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold theme-text-primary">Notifications</h1>
              <p className="text-xs text-default-600">Activity feed from your community</p>
            </div>
            {unreadCount > 0 && (
              <Badge variant="danger" size="md" className="ml-auto">
                {unreadCount} new
              </Badge>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-4">
            {(['all', 'quests', 'gm', 'tips'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-primary theme-text-inverse'
                    : 'theme-bg-subtle theme-text-primary hover:theme-bg-hover'
                }`}
              >
                {f === 'all' ? 'All' : f === 'quests' ? 'Quests' : f === 'gm' ? 'GM Streaks' : 'Tips'}
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
          <Card className="text-center py-12">
            <CardBody>
              <Image
                src="/assets/gmeow-icons/Notifications Icon.svg"
                alt="No notifications"
                width={64}
                height={64}
                className="opacity-50 mx-auto mb-4"
              />
              <h3 className="text-lg font-semibold theme-text-primary mb-2">No notifications yet</h3>
              <p className="text-default-600 mb-6 max-w-md mx-auto">
                Complete quests, log GM streaks, and engage with the community to see activity here.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link
                  href="/app/quests"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-600 theme-text-inverse rounded-lg font-medium transition-all"
                >
                  <Image src="/assets/gmeow-icons/Quests Icon.svg" alt="Quests" width={20} height={20} className="brightness-0 invert" />
                  Explore Quests
                </Link>
                <Link
                  href="/app/daily-gm"
                  className="inline-flex items-center gap-2 px-6 py-3 theme-bg-hover hover:theme-bg-active theme-text-primary rounded-lg font-medium transition-all"
                >
                  <Image src="/assets/gmeow-icons/Success Box Icon.svg" alt="Daily GM" width={20} height={20} className="brightness-0 invert" />
                  Daily GM
                </Link>
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 px-6 py-3 theme-bg-subtle hover:theme-bg-hover theme-text-primary rounded-lg font-medium transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Dashboard
                </Link>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification, index) => {
              const ctaHref = notification.cta?.href || '/app'
              return (
                <Link key={`${notification.createdAt}-${index}`} href={ctaHref}>
                  <Card className="hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group">
                    <CardBody className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                          <Image
                            src={getEventIcon(notification.eventType)}
                            alt={notification.eventType}
                            width={20}
                            height={20}
                            className="opacity-90 group-hover:scale-110 transition-transform"
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Actor Avatar & Name */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold theme-text-primary group-hover:text-primary transition-colors">
                              {getActorLabel(notification.actor)}
                            </span>
                            <span className="text-xs text-default-600">
                              {getTimeSince(notification.createdAt)}
                            </span>
                          </div>

                          {/* Headline */}
                          <h3 className="text-sm theme-text-primary mb-1">
                            {notification.headline}
                          </h3>

                          {/* Context */}
                          {notification.context && (
                            <p className={`text-xs ${getEventColor(notification.emphasis)}`}>
                              {notification.context}
                            </p>
                          )}

                          {/* CTA */}
                          {notification.cta && (
                            <div className="inline-flex items-center gap-1 mt-2 text-xs text-primary group-hover:text-primary-600 font-medium">
                              {notification.cta.label}
                              <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Chain Badge */}
                        {notification.chain && (
                          <Badge variant="info" size="sm">
                            {notification.chain.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        {/* Load More */}
        {notifications.length >= 30 && (
          <div className="text-center mt-6">
            <button
              onClick={fetchNotifications}
              className="px-6 py-3 theme-bg-subtle hover:theme-bg-hover theme-text-primary rounded-lg font-medium transition-all"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
