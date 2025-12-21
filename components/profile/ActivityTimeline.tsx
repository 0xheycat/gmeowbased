'use client'

import { useMemo } from 'react'
import clsx from 'clsx'
import { TargetIcon } from '@/components/icons/target-icon'
import { TrophyIcon } from '@/components/icons/trophy-icon'
import { RocketIcon } from '@/components/icons/rocket-icon'
import { FlameIcon } from '@/components/icons/flame-icon'
import { CastleIcon } from '@/components/icons/castle-icon'
import { FlashIcon } from '@/components/icons/flash'
import { DiamondIcon } from '@/components/icons/diamond-icon'
import { ScrollIcon } from '@/components/icons/scroll-icon'

// Activity types
export type ActivityType = 'quest' | 'badge' | 'level' | 'streak' | 'guild' | 'tip' | 'reward'

// Activity item interface
export interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description?: string | null
  timestamp: string
  metadata?: {
    quest_name?: string
    badge_name?: string
    badge_tier?: string
    level?: number
    streak_days?: number
    guild_name?: string
    tip_amount?: number
    reward_points?: number
    xp_earned?: number
    xp_amount?: number
    action_type?: string
    source?: 'on-chain' | 'off-chain' // TRUE HYBRID: Layer 1 vs Layer 2
    txHash?: string // On-chain transaction hash
  } | null
}

export interface ActivityTimelineProps {
  activities: ActivityItem[]
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  className?: string
}

// Activity type configurations
const ACTIVITY_CONFIG: Record<ActivityType, { icon: React.ComponentType<React.SVGAttributes<{}>>; color: string; bgGradient: string }> = {
  quest: {
    icon: TargetIcon,
    color: '#10B981',
    bgGradient: 'from-emerald-500/20 to-green-500/20',
  },
  badge: {
    icon: TrophyIcon,
    color: '#9C27FF',
    bgGradient: 'from-purple-500/20 to-violet-500/20',
  },
  level: {
    icon: RocketIcon,
    color: '#3B82F6',
    bgGradient: 'from-blue-500/20 to-cyan-500/20',
  },
  streak: {
    icon: FlameIcon,
    color: '#F97316',
    bgGradient: 'from-orange-500/20 to-amber-500/20',
  },
  guild: {
    icon: CastleIcon,
    color: '#8B5CF6',
    bgGradient: 'from-violet-500/20 to-purple-500/20',
  },
  tip: {
    icon: FlashIcon,
    color: '#FACC15',
    bgGradient: 'from-yellow-500/20 to-amber-500/20',
  },
  reward: {
    icon: DiamondIcon,
    color: '#06B6D4',
    bgGradient: 'from-cyan-500/20 to-teal-500/20',
  },
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  
  // Format as date (e.g., "Nov 15")
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Get formatted detail text based on activity type
 */
function getActivityDetail(activity: ActivityItem): string | null {
  const { type, metadata } = activity
  if (!metadata) return null

  switch (type) {
    case 'quest':
      if (metadata.xp_earned) return `+${metadata.xp_earned} XP`
      if (metadata.reward_points) return `+${metadata.reward_points} points`
      return null

    case 'badge':
      return metadata.badge_tier ? `${metadata.badge_tier} tier` : null

    case 'level':
      return metadata.level ? `Level ${metadata.level}` : null

    case 'streak':
      return metadata.streak_days ? `${metadata.streak_days} day streak` : null

    case 'guild':
      return metadata.guild_name || null

    case 'tip':
      return metadata.tip_amount ? `+${metadata.tip_amount} points` : null

    case 'reward':
      return metadata.reward_points ? `+${metadata.reward_points} points` : null

    default:
      return null
  }
}

/**
 * ActivityTimeline Component
 * 
 * Professional activity feed for profile pages
 * Template: trezoadmin-41 RecentActivity pattern
 * Adaptation: 40% (timeline structure + profile-specific content)
 * 
 * Features:
 * - Activity feed with timeline connector
 * - Type-specific icons and colors
 * - Relative timestamps (Just now, 5m ago, etc.)
 * - Load more pagination
 * - Empty state with CTA
 * - Responsive layout
 * 
 * @example
 * ```tsx
 * <ActivityTimeline
 *   activities={userActivities}
 *   loading={loading}
 *   onLoadMore={handleLoadMore}
 *   hasMore={hasMore}
 * />
 * ```
 */
export default function ActivityTimeline({
  activities,
  loading = false,
  onLoadMore,
  hasMore = false,
  className,
}: ActivityTimelineProps) {
  // Sort activities by timestamp (newest first)
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }, [activities])

  // Loading skeleton
  if (loading && activities.length === 0) {
    return (
      <div className={clsx('space-y-4', className)}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-10 w-10 rounded-full bg-white/5 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 rounded bg-white/5 animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <div className={clsx('flex flex-col items-center justify-center py-16 text-center', className)}>
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
          <ScrollIcon className="h-10 w-10 text-white/60" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">No activity yet</h2>
        <p className="mb-6 max-w-md text-sm text-white/60">
          Complete quests, earn badges, and level up to see your activity here!
        </p>
      </div>
    )
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Activity items */}
      <div className="relative space-y-6">
        {/* Timeline connector line */}
        <div className="absolute left-5 top-10 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent" />

        {sortedActivities.map((activity, index) => {
          const config = ACTIVITY_CONFIG[activity.type]
          const detail = getActivityDetail(activity)
          const relativeTime = formatRelativeTime(activity.timestamp)
          const isLast = index === sortedActivities.length - 1
          const IconComponent = config.icon

          return (
            <div key={activity.id} className="relative flex gap-4">
              {/* Icon badge */}
              <div
                className={clsx(
                  'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 backdrop-blur transition-all duration-300',
                  'bg-gradient-to-br',
                  config.bgGradient
                )}
                style={{
                  borderColor: config.color,
                  boxShadow: `0 0 12px ${config.color}40`,
                }}
              >
                <IconComponent 
                  className="h-5 w-5"
                  style={{ color: config.color }}
                  aria-label={activity.type}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white line-clamp-1">
                      {activity.title}
                    </h4>
                    {/* Layer Source Badge (TRUE HYBRID) */}
                    {activity.metadata?.source && (
                      <span className={clsx(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
                        activity.metadata.source === 'on-chain'
                          ? "bg-blue-500/20 text-blue-400 border border-blue-400/30"
                          : "bg-purple-500/20 text-purple-400 border border-purple-400/30"
                      )}>
                        {activity.metadata.source === 'on-chain' ? '⛓️ On-Chain' : '💬 Off-Chain'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-white/40 shrink-0">
                    {relativeTime}
                  </span>
                </div>

                {activity.description && (
                  <p className="text-sm text-white/60 line-clamp-2 mb-1">
                    {activity.description}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {detail && (
                    <div
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur"
                      style={{
                        backgroundColor: `${config.color}20`,
                        color: config.color,
                      }}
                    >
                      {detail}
                    </div>
                  )}
                  
                  {/* Transaction Hash Link (if on-chain) */}
                  {activity.metadata?.source === 'on-chain' && activity.metadata?.txHash && (
                    <a
                      href={`https://basescan.org/tx/${activity.metadata.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View Tx
                    </a>
                  )}
                </div>
              </div>

              {/* Hide connector line for last item */}
              {isLast && (
                <div className="absolute left-5 top-10 h-full w-px bg-gradient-to-b from-transparent to-transparent" />
              )}
            </div>
          )
        })}
      </div>

      {/* Load more button */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className={clsx(
              'rounded-xl border border-white/10 bg-white/5 px-6 py-3 min-h-[44px] text-sm font-medium text-white',
              'transition-all duration-200 hover:bg-white/10 hover:border-white/20 focus:ring-2 focus:ring-blue-500 focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : (
              'Load more activity'
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// Export named for consistency
export { ActivityTimeline }
