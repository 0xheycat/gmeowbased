'use client'

/**
 * Level Progress Component
 * @template music/progress-bar (adapted 25%)
 * Phase 2: Dashboard Migration - Level XP tracking
 * 
 * Displays user's level progression with XP bar
 * Uses GraphQL useUserStats hook for real-time level data
 * 
 * Professional Patterns (from music template):
 * - Skeleton loading (wave animation)
 * - Framer Motion progress bar animation
 * - Accessible ARIA progress attributes
 * - Professional error state with retry
 */

import { useAuthContext } from '@/lib/contexts'
import { useUserStats } from '@/hooks/useUserStats'
import { Skeleton } from '@/components/ui/skeleton/Skeleton'
import { motion } from 'framer-motion'
import type { Address } from 'viem'

export function LevelProgress() {
  const { address } = useAuthContext()
  const { stats, loading, error } = useUserStats(address as Address | undefined, {
    variant: 'complete',
    enableFallback: true,
  })

  if (loading) {
    return (
      <div 
        className="bg-white rounded-lg p-6 shadow-sm"
        role="status"
        aria-live="polite"
        aria-label="Loading level progress"
      >
        <Skeleton variant="text" className="h-4 w-24 mb-4" animation="wave" />
        <Skeleton variant="rect" className="h-12 mb-3" animation="wave" />
        <Skeleton variant="rect" className="h-3" animation="wave" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <motion.div 
        className="bg-white rounded-lg p-6 shadow-sm"
        role="alert"
        aria-live="assertive"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-900">Failed to load level data</p>
            <p className="text-xs text-red-600 mt-1">Unable to fetch XP information</p>
          </div>
        </div>
      </motion.div>
    )
  }

  const currentXP = Number(stats.xpIntoLevel)
  const nextLevelXP = Number(stats.xpToNextLevel)
  const levelPercent = nextLevelXP > 0 
    ? Math.min((currentXP / nextLevelXP) * 100, 100)
    : 100

  return (
    <motion.div 
      className="bg-white rounded-lg p-6 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">Level Progress</h3>
        <span className="text-xs text-gray-500">XP System</span>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            {stats.level}
          </span>
          <span className="text-lg text-gray-400">
            → {stats.level + 1}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-600">
          <span>{currentXP.toLocaleString()} XP</span>
          <span>{nextLevelXP.toLocaleString()} XP</span>
        </div>
        <div 
          className="w-full bg-gray-200 rounded-full h-3 overflow-hidden"
          role="progressbar"
          aria-valuenow={levelPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Level progress: ${levelPercent.toFixed(1)}% complete`}
        >
          <motion.div
            className="bg-gray-900 dark:bg-gray-700 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${levelPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          />
        </div>
        <div className="text-xs text-center text-gray-500">
          {levelPercent.toFixed(1)}% complete
        </div>
      </div>

      {stats.level < 100 && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-700 dark:text-gray-300">
            <span className="font-semibold">{(nextLevelXP - currentXP).toLocaleString()} XP</span>
            {' '}needed to reach Level {stats.level + 1}
          </p>
        </div>
      )}
    </motion.div>
  )
}
