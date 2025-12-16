/**
 * ReferralActivityFeed Component
 * 
 * Purpose: Timeline of referral events for a user
 * Template: trezoadmin-41/activity-feed (35%) + ActivityTimeline pattern (25%)
 * 
 * Features:
 * - Chronological activity timeline
 * - Event types: registered, referred, reward, badge
 * - Relative timestamps (e.g., "2 hours ago")
 * - Loading states
 * - Empty state
 * 
 * Usage:
 * <ReferralActivityFeed fid={12345} />
 */

'use client'

import { useState, useEffect } from 'react'
import { CheckCircleIcon, PeopleIcon, EmojiEventsIcon, StarIcon, Calendar } from '@/components/icons'

export interface ReferralActivityFeedProps {
  /** User's Farcaster ID */
  fid: number
  /** Maximum number of activities to show */
  limit?: number
  /** Custom CSS class */
  className?: string
}

interface Activity {
  id: string
  type: 'registered' | 'referred' | 'reward' | 'badge'
  timestamp: string
  data: {
    code?: string
    referredFid?: number
    referredUsername?: string
    points?: number
    badgeName?: string
  }
}

const getRelativeTime = (timestamp: string): string => {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`
}

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'registered':
      return <CheckCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
    case 'referred':
      return <PeopleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
    case 'reward':
      return <StarIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
    case 'badge':
      return <EmojiEventsIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
  }
}

const getActivityText = (activity: Activity): { title: string; description: string } => {
  switch (activity.type) {
    case 'registered':
      return {
        title: 'Referral Code Registered',
        description: `You registered the code "${activity.data.code}"`,
      }
    case 'referred':
      return {
        title: 'New Referral',
        description: `${activity.data.referredUsername || `User ${activity.data.referredFid}`} joined using your code`,
      }
    case 'reward':
      return {
        title: 'Reward Earned',
        description: `You earned ${activity.data.points} points from a referral`,
      }
    case 'badge':
      return {
        title: 'Badge Unlocked',
        description: `Earned the ${activity.data.badgeName} badge`,
      }
  }
}

export function ReferralActivityFeed({ fid, limit = 20, className = '' }: ReferralActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({
          limit: limit.toString(),
        })

        const response = await fetch(`/api/referral/activity/${fid}?${params}`)
        
        if (!response.ok) {
          throw new Error('Failed to load activity feed')
        }

        const data = await response.json()
        setActivities(data.activities || [])
      } catch (err) {
        console.error('Failed to load activity feed:', err)
        setError('Failed to load activity feed. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadActivities()
  }, [fid, limit])

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 ${className}`}>
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Activity Timeline
        </h2>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No activity yet. Start referring friends to see your timeline!
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />

          {/* Activities */}
          <div className="space-y-6">
            {activities.map((activity) => {
              const activityText = getActivityText(activity)
              if (!activityText) return null
              const { title, description } = activityText
              return (
                <div key={activity.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className="relative z-10 flex items-center justify-center w-10 h-10 bg-white dark:bg-gray-900 rounded-full border-2 border-gray-200 dark:border-gray-700">
                    {getActivityIcon(activity.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {title}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {getRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
