/**
 * Social Activity Feed - Layer3-Inspired
 * 
 * Shows recent activity from friends/community
 * Inspired by Layer3's social features
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Activity {
  id: string
  user: {
    fid: number
    username: string
    displayName: string
    pfpUrl: string
  }
  action: 'quest-complete' | 'badge-earned' | 'rank-up' | 'streak-milestone'
  details: string
  timestamp: string
  href?: string
}

interface SocialActivityProps {
  fid?: number | null
  limit?: number
}

const activityIcons = {
  'quest-complete': '\uD83C\uDFAF', // 🎯
  'badge-earned': '\uD83C\uDFC6', // 🏆
  'rank-up': '\u2B06\uFE0F', // ⬆️
  'streak-milestone': '\uD83D\uDD25', // 🔥
}

const activityColors = {
  'quest-complete': 'from-purple-500/10 to-purple-600/20 dark:from-purple-500/20 dark:to-purple-600/30',
  'badge-earned': 'from-yellow-500/10 to-orange-500/20 dark:from-yellow-500/20 dark:to-orange-500/30',
  'rank-up': 'from-green-500/10 to-emerald-500/20 dark:from-green-500/20 dark:to-emerald-500/30',
  'streak-milestone': 'from-red-500/10 to-pink-500/20 dark:from-red-500/20 dark:to-pink-500/30',
}

export function SocialActivity({ fid, limit = 10 }: SocialActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCount, setActiveCount] = useState(0)

  useEffect(() => {
    // Mock data for now - replace with real API call
    const mockActivities: Activity[] = [
      {
        id: '1',
        user: {
          fid: 12345,
          username: 'alice',
          displayName: 'Alice',
          pfpUrl: '/api/placeholder/40/40',
        },
        action: 'quest-complete',
        details: 'completed "Multi-Chain GM Quest"',
        timestamp: '2m ago',
        href: '/app/quests',
      },
      {
        id: '2',
        user: {
          fid: 67890,
          username: 'bob',
          displayName: 'Bob',
          pfpUrl: '/api/placeholder/40/40',
        },
        action: 'badge-earned',
        details: 'earned "Guild Master" badge',
        timestamp: '15m ago',
        href: '/app/badges',
      },
      {
        id: '3',
        user: {
          fid: 11111,
          username: 'charlie',
          displayName: 'Charlie',
          pfpUrl: '/api/placeholder/40/40',
        },
        action: 'streak-milestone',
        details: 'reached 30 day streak!',
        timestamp: '1h ago',
      },
    ]

    setTimeout(() => {
      setActivities(mockActivities.slice(0, limit))
      setActiveCount(47) // Mock active users count
      setLoading(false)
    }, 500)
  }, [fid, limit])

  if (loading) {
    return (
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-purple-500/5 to-sky-500/5 dark:from-purple-500/10 dark:to-sky-500/10 border border-purple-500/20 dark:border-purple-500/30 animate-pulse">
        <div className="h-6 bg-white/10 dark:bg-gray-800/20 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white/10 dark:bg-gray-800/20 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold theme-text-primary">{'\uD83D\uDC65'} Community Activity</h2>
          <p className="text-sm theme-text-secondary mt-1">
            <span className="font-semibold text-purple-600 dark:text-purple-400">{activeCount} pilots</span> active right now
          </p>
        </div>
        <Link 
          href="/app/leaderboard"
          className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
        >
          View All →
        </Link>
      </div>

      {/* Activity Feed */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/5 to-sky-500/5 dark:from-purple-500/10 dark:to-sky-500/10 border border-purple-500/20 dark:border-purple-500/30 space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 opacity-20">{'\uD83D\uDC65'}</div>
            <p className="theme-text-secondary">No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`
                group p-4 rounded-xl transition-all duration-300
                bg-gradient-to-br ${activityColors[activity.action]}
                hover:scale-[1.02] hover:shadow-lg cursor-pointer
                border border-white/10 dark:border-gray-800/30
              `}
            >
              <div className="flex items-center gap-4">
                {/* User Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-purple-500/30 dark:ring-purple-400/30 group-hover:ring-purple-500/60 dark:group-hover:ring-purple-400/60 transition-all">
                    <img
                      src={activity.user.pfpUrl}
                      alt={activity.user.displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Activity Icon Badge */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-sm shadow-lg">
                    {activityIcons[activity.action]}
                  </div>
                </div>

                {/* Activity Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold theme-text-primary truncate">
                      {activity.user.displayName}
                    </span>
                    <span className="text-sm theme-text-secondary">
                      {activity.details}
                    </span>
                  </div>
                  <div className="text-xs theme-text-muted mt-0.5">
                    {activity.timestamp}
                  </div>
                </div>

                {/* Action Button */}
                {activity.href && (
                  <Link
                    href={activity.href}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-purple-500 text-white hover:bg-purple-600 transition-colors shadow-lg shadow-purple-500/30 dark:shadow-purple-500/20"
                  >
                    Do Same
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
