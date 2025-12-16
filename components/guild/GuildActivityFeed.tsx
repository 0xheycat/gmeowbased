/**
 * GuildActivityFeed Component
 * 
 * Purpose: Display recent guild activity timeline with rich event cards
 * Features:
 * - Member joins/leaves
 * - Points deposits/withdrawals
 * - Member promotions/demotions
 * - Treasury claims
 * - Farcaster profile integration
 * - Real-time updates (optional)
 * 
 * Usage:
 * <GuildActivityFeed guildId={1} limit={20} />
 */

'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  UserPlus,
  UserMinus,
  TrendingUp,
  TrendingDown,
  Shield,
  Coins,
  Activity,
  Clock
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton/Skeleton'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogBackdrop, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/dialogs'
import { createKeyboardHandler, FOCUS_STYLES, WCAG_CLASSES, BUTTON_SIZES, LOADING_ARIA } from '@/lib/accessibility'

// Event Types (matching guild event logger)
export type GuildEventType =
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_PROMOTED'
  | 'MEMBER_DEMOTED'
  | 'POINTS_DEPOSITED'
  | 'POINTS_CLAIMED'
  | 'GUILD_CREATED'
  | 'GUILD_UPDATED'

export interface GuildActivity {
  id: string
  guild_id: string
  event_type: GuildEventType
  actor_address: string
  actor_farcaster?: {
    fid: number
    username: string
    displayName: string
    pfpUrl: string
  }
  target_address?: string
  target_farcaster?: {
    fid: number
    username: string
    displayName: string
    pfpUrl: string
  }
  amount?: string // bigint as string
  metadata?: {
    from_role?: string
    to_role?: string
    quest_name?: string
    reward_amount?: string
  }
  created_at: string
}

interface GuildActivityFeedProps {
  guildId: string
  limit?: number
  showHeader?: boolean
  className?: string
}

// Event icon mapping
const getEventIcon = (eventType: GuildEventType) => {
  switch (eventType) {
    case 'MEMBER_JOINED':
      return <UserPlus className="w-5 h-5 text-green-500" />
    case 'MEMBER_LEFT':
      return <UserMinus className="w-5 h-5 text-red-500" />
    case 'POINTS_DEPOSITED':
      return <TrendingUp className="w-5 h-5 text-blue-500" />
    case 'POINTS_CLAIMED':
      return <Coins className="w-5 h-5 text-yellow-500" />
    case 'MEMBER_PROMOTED':
      return <Shield className="w-5 h-5 text-purple-500" />
    case 'MEMBER_DEMOTED':
      return <Shield className="w-5 h-5 text-gray-500" />
    case 'GUILD_CREATED':
      return <Activity className="w-5 h-5 text-green-500" />
    case 'GUILD_UPDATED':
      return <Activity className="w-5 h-5 text-blue-500" />
    default:
      return <Activity className="w-5 h-5 text-gray-500" />
  }
}

// Format event description
const formatEventDescription = (activity: GuildActivity): string => {
  const actorName = activity.actor_farcaster?.displayName || 
                    activity.actor_farcaster?.username || 
                    `${activity.actor_address.slice(0, 6)}...${activity.actor_address.slice(-4)}`
  
  const targetName = activity.target_farcaster?.displayName || 
                     activity.target_farcaster?.username || 
                     (activity.target_address ? `${activity.target_address.slice(0, 6)}...${activity.target_address.slice(-4)}` : '')

  switch (activity.event_type) {
    case 'MEMBER_JOINED':
      return `${actorName} joined the guild`
    case 'MEMBER_LEFT':
      return `${actorName} left the guild`
    case 'POINTS_DEPOSITED':
      return `${actorName} deposited ${activity.amount ? Number(activity.amount).toLocaleString() : '0'} points`
    case 'POINTS_CLAIMED':
      return `${actorName} claimed ${activity.amount ? Number(activity.amount).toLocaleString() : '0'} from treasury`
    case 'MEMBER_PROMOTED':
      return `${actorName} promoted ${targetName} to officer`
    case 'MEMBER_DEMOTED':
      return `${actorName} demoted ${targetName} to member`
    case 'GUILD_CREATED':
      return `${actorName} created the guild`
    case 'GUILD_UPDATED':
      return `${actorName} updated guild settings`
    default:
      return `${actorName} performed an action`
  }
}

export default function GuildActivityFeed({
  guildId,
  limit = 20,
  showHeader = true,
  className = ''
}: GuildActivityFeedProps) {
  const [activities, setActivities] = useState<GuildActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/guild/${guildId}/events?limit=${limit}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch activities: ${response.statusText}`)
        }

        const data = await response.json()
        setActivities(data.events || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activities')
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [guildId, limit])

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`} role="status" aria-live="polite" aria-label="Loading activity feed">
        {showHeader && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </h3>
        )}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Skeleton variant="avatar" className="w-10 h-10" animation="wave" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="rect" className="h-4 w-3/4" animation="wave" />
                <Skeleton variant="rect" className="h-3 w-1/2" animation="wave" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <>
        <div className={`${className}`}>
          {showHeader && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5" />
              Recent Activity
            </h3>
          )}
        </div>
        <Dialog isOpen={errorDialogOpen} onClose={() => setErrorDialogOpen(false)}>
          <DialogBackdrop />
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Error Loading Activity</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p className="text-gray-700 dark:text-gray-300">{error}</p>
            </DialogBody>
            <DialogFooter>
              <button
                onClick={() => setErrorDialogOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                {...createKeyboardHandler(() => setErrorDialogOpen(false))}
              >
                Close
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  if (activities.length === 0) {
    return (
      <div className={`${className}`}>
        {showHeader && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5" />
            Recent Activity
          </h3>
        )}
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No recent activity</p>
          <p className="text-sm mt-1">Guild activities will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {showHeader && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5" />
          Recent Activity
        </h3>
      )}

      <div className="space-y-3" role="list" aria-label="Guild activity timeline">
        {activities.map((activity) => {
          const actorName = activity.actor_farcaster?.displayName || activity.actor_farcaster?.username || `${activity.actor_address.slice(0, 6)}...${activity.actor_address.slice(-4)}`
          const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })
          const ariaLabel = `${formatEventDescription(activity)}, ${timeAgo}`
          
          return (
            <div
              key={activity.id}
              className={`flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-smooth ${FOCUS_STYLES.ring}`}
              role="listitem"
              aria-label={ariaLabel}
            >
              {/* Event Icon */}
              <div className="flex-shrink-0 mt-1" aria-hidden="true">
                {getEventIcon(activity.event_type)}
              </div>

              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                {/* Description */}
                <p className={`text-sm ${WCAG_CLASSES.text.onLight.primary} font-medium`}>
                  {formatEventDescription(activity)}
                </p>

                {/* Timestamp */}
                <div className={`flex items-center gap-1 mt-1 text-xs ${WCAG_CLASSES.text.onLight.secondary}`}>
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <time dateTime={activity.created_at}>{timeAgo}</time>
                </div>
              </div>

              {/* Actor Avatar */}
              {activity.actor_farcaster && (
                <Avatar className="w-8 h-8 flex-shrink-0" aria-label={`${actorName}'s avatar`}>
                  <AvatarImage
                    src={activity.actor_farcaster.pfpUrl}
                    alt={actorName}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs">
                    {activity.actor_farcaster.username?.slice(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          )
        })}
      </div>

      {/* Load More (optional future enhancement) */}
      {activities.length >= limit && (
        <div className="text-center mt-4">
          <button 
            className={`text-sm text-wcag-text-link-light dark:text-wcag-text-link-dark hover:underline px-4 py-2 ${FOCUS_STYLES.ring} transition-fast`}
            aria-label="Load more guild activities"
            {...createKeyboardHandler(() => {
              // Future: Load more functionality
              console.log('Load more activities')
            })}
          >
            Load more activity
          </button>
        </div>
      )}
    </div>
  )
}

// Export named for convenience
export { GuildActivityFeed }
