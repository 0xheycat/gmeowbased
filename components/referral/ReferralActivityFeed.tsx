/**
 * ReferralActivityFeed Component - Phase 5: Hybrid Architecture Migration
 * 
 * Purpose: Timeline of referral events from Subsquid GraphQL
 * Template: music/* loading states + ActivityTimeline pattern
 * 
 * @architecture Hybrid Data Layer
 * - Referral activity: Subsquid GraphQL (useRecentReferralActivity hook)
 * - Real-time data with 30s polling
 * - Client-side timestamp formatting
 * 
 * Features:
 * - Chronological activity timeline from ReferralUse events
 * - Event types: Code creation, Referral uses
 * - Relative timestamps (e.g., "2 hours ago")
 * - Skeleton wave loading
 * - Empty state
 * 
 * Usage:
 * <ReferralActivityFeed address="0x..." />
 */

'use client'

import type { Address } from 'viem'
import { CheckCircleIcon, PeopleIcon, StarIcon, Calendar } from '@/components/icons'
import { useRecentReferralActivity } from '@/hooks/useReferralSubsquid'
import { Skeleton } from '@/components/ui/skeleton/Skeleton'
import { formatReferralTimestamp } from '@/hooks/useReferralSubsquid'
import { motion } from 'framer-motion'

export interface ReferralActivityFeedProps {
  /** User's wallet address */
  address?: Address
  /** Maximum number of activities to show */
  limit?: number
  /** Custom CSS class */
  className?: string
}

const getActivityIcon = (isReferralUse: boolean) => {
  return isReferralUse ? (
    <PeopleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
  ) : (
    <CheckCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
  )
}

export function ReferralActivityFeed({ address, limit = 20, className = '' }: ReferralActivityFeedProps) {
  // Fetch activity from Subsquid (ReferralUse events with 30s polling)
  const { activity, loading: isLoading, error, refetch } = useRecentReferralActivity(limit)

  if (error) {
    return (
      <motion.div 
        className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 ${className}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        role="alert"
        aria-live="assertive"
      >
        <p className="text-red-700 dark:text-red-300 mb-4">
          Failed to load activity feed. Please try again.
        </p>
        <motion.button
          onClick={() => refetch()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none shadow-lg shadow-red-500/30"
        >
          Retry
        </motion.button>
      </motion.div>
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
        <div 
          className="space-y-4"
          role="status"
          aria-live="polite"
          aria-label="Loading activity feed"
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton variant="avatar" className="w-10 h-10" animation="wave" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" className="h-4 w-1/3" animation="wave" />
                <Skeleton variant="text" className="h-3 w-2/3" animation="wave" />
              </div>
            </div>
          ))}
        </div>
      ) : activity.length === 0 ? (
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
            {activity.map((use) => {
              const title = 'New Referral'
              const description = `${use.referee.slice(0, 6)}...${use.referee.slice(-4)} used code "${use.code.id}" and earned ${Number(use.reward)} points`
              
              return (
                <motion.div 
                  key={use.id} 
                  className="relative flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Icon */}
                  <div className="relative z-10 flex items-center justify-center w-10 h-10 bg-white dark:bg-gray-900 rounded-full border-2 border-gray-200 dark:border-gray-700">
                    {getActivityIcon(true)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {title}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatReferralTimestamp(use.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {description}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
