'use client'

/**
 * Recent Activity Component
 * @template music/activity-feed (adapted 35%)
 * Phase 2: Dashboard Migration - User history events
 * 
 * Displays recent level ups and rank ups from Subsquid events
 * Uses GraphQL useUserHistory hook for real-time event data
 * 
 * Professional Patterns (from music template):
 * - Skeleton avatar+text loading variants
 * - Framer Motion stagger animations for activity items
 * - Professional empty state with icon
 * - Accessible activity feed with ARIA labels
 */

import { useAuthContext } from '@/lib/contexts'
import { useUserHistory } from '@/hooks/useUserHistory'
import { Skeleton } from '@/components/ui/skeleton/Skeleton'
import { motion } from 'framer-motion'
import type { Address } from 'viem'
import { format, formatDistanceToNow } from 'date-fns'

// Tier names for rank up events
const TIER_NAMES = [
  'Iron', 'Bronze', 'Silver', 'Gold', 
  'Platinum', 'Diamond', 'Master', 'Grandmaster',
  'Challenger', 'Elite', 'Legend', 'Mythic'
]

export function RecentActivity() {
  const { address } = useAuthContext()
  const { levelUps, rankUps, loading, error } = useUserHistory(address as Address | undefined, {
    type: 'complete',
    limit: 10,
  })

  if (loading) {
    return (
      <div 
        className="bg-white rounded-lg p-6 shadow-sm"
        role="status"
        aria-live="polite"
        aria-label="Loading recent activity"
      >
        <h3 className="text-sm font-medium text-gray-700 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton variant="avatar" className="w-10 h-10" animation="wave" />
              <div className="flex-1">
                <Skeleton variant="text" className="h-4 w-32 mb-2" animation="wave" />
                <Skeleton variant="text" className="h-3 w-24" animation="wave" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <motion.div 
        className="bg-white rounded-lg p-6 shadow-sm"
        role="alert"
        aria-live="assertive"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h3 className="text-sm font-medium text-gray-700 mb-4">Recent Activity</h3>
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-900">Failed to load activity</p>
            <p className="text-xs text-red-600 mt-1">Unable to fetch recent events</p>
          </div>
        </div>
      </motion.div>
    )
  }

  // Combine level ups and rank ups (already sorted by hook)
  const recentLevelUps = levelUps.slice(0, 5)
  const recentRankUps = rankUps.slice(0, 5)
  
  // Combine and sort by timestamp, take top 8
  const recentEvents = [...recentLevelUps, ...recentRankUps]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8)

  if (recentEvents.length === 0) {
    return (
      <motion.div 
        className="bg-white rounded-lg p-6 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }}
      >
        <h3 className="text-sm font-medium text-gray-700 mb-4">Recent Activity</h3>
        <div 
          className="text-center py-8"
          role="status"
          aria-label="No recent activity"
        >
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <p className="text-gray-500 text-sm font-medium mb-1">No recent activity</p>
          <p className="text-gray-400 text-xs">Complete quests to level up!</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className="bg-white rounded-lg p-6 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">Recent Activity</h3>
        <span className="text-xs text-gray-500">⚡ Live</span>
      </div>

      <div className="space-y-3">
        {recentEvents.map((event, index) => {
          const isLevelUp = 'newLevel' in event // LevelUpEvent has newLevel, RankUpEvent has newTier
          const timestamp = new Date(event.timestamp)
          const levelUpEvent = isLevelUp ? (event as import('@/hooks/useUserHistory').LevelUpEvent) : null
          const rankUpEvent = !isLevelUp ? (event as import('@/hooks/useUserHistory').RankUpEvent) : null
          
          return (
            <motion.div
              key={`${event.id}-${index}`}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              {/* Icon */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                ${isLevelUp 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-purple-100 text-purple-600'
                }
              `}>
                {isLevelUp ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {isLevelUp && levelUpEvent ? (
                    <>
                      Reached <span className="text-blue-600 font-bold">Level {levelUpEvent.newLevel}</span>
                    </>
                  ) : rankUpEvent ? (
                    <>
                      Advanced to <span className="text-purple-600 font-bold">{TIER_NAMES[rankUpEvent.newTier || 0]}</span> tier
                    </>
                  ) : null}
                </p>
                <p className="text-xs text-gray-500 mt-1" title={format(timestamp, 'PPpp')}>
                  {formatDistanceToNow(timestamp, { addSuffix: true })}
                </p>
              </div>

              {/* Value badge */}
              {levelUpEvent && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Lv {levelUpEvent.newLevel}
                  </span>
                </div>
              )}
              {rankUpEvent && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    T{rankUpEvent.newTier}
                  </span>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* View All link */}
      {recentEvents.length >= 8 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <motion.button 
            className="text-sm text-blue-600 hover:text-blue-700 font-medium w-full text-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            View all activity →
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}
