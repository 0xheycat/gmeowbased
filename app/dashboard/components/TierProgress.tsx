'use client'

/**
 * Tier Progress Component
 * @template music/progress-bar (adapted 30%)
 * Phase 2: Dashboard Migration - Rank tier advancement
 * 
 * Displays user's rank tier progression with points bar
 * Uses GraphQL useUserStats hook for real-time tier data
 * 
 * Professional Patterns (from music template):
 * - Skeleton loading (wave animation)
 * - Framer Motion gradient animations
 * - Tier-specific color gradients
 * - Accessible ARIA progress attributes
 */

import { useAuthContext } from '@/lib/contexts'
import { useUserStats } from '@/hooks/useUserStats'
import { TierBadge } from '@/components/score/TierBadge'
import { Skeleton } from '@/components/ui/skeleton/Skeleton'
import { motion } from 'framer-motion'
import type { Address } from 'viem'

const TIER_NAMES = [
  'Iron', 'Bronze', 'Silver', 'Gold', 
  'Platinum', 'Diamond', 'Master', 'Grandmaster',
  'Challenger', 'Elite', 'Legend', 'Mythic'
]

const TIER_COLORS = [
  'from-gray-400 to-gray-500',       // Iron
  'from-orange-600 to-orange-700',   // Bronze
  'from-gray-300 to-gray-400',       // Silver
  'from-yellow-400 to-yellow-600',   // Gold
  'from-cyan-400 to-cyan-600',       // Platinum
  'from-blue-400 to-blue-600',       // Diamond
  'from-purple-500 to-purple-700',   // Master
  'from-red-500 to-red-700',         // Grandmaster
  'from-pink-500 to-purple-600',     // Challenger
  'from-indigo-500 to-purple-700',   // Elite
  'from-orange-500 to-red-600',      // Legend
  'from-yellow-400 to-pink-600',     // Mythic
]

export function TierProgress() {
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
        aria-label="Loading tier progress"
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
            <p className="text-sm font-medium text-red-900">Failed to load tier data</p>
            <p className="text-xs text-red-600 mt-1">Unable to fetch tier information</p>
          </div>
        </div>
      </motion.div>
    )
  }

  const currentPoints = Number(stats.pointsIntoTier)
  const nextTierPoints = Number(stats.pointsToNextTier)
  const tierPercent = nextTierPoints > 0 
    ? Math.min((currentPoints / nextTierPoints) * 100, 100)
    : 100

  const currentTier = stats.rankTier
  const nextTier = Math.min(currentTier + 1, 11)
  const tierColor = TIER_COLORS[currentTier] || TIER_COLORS[0]
  const isMaxTier = currentTier >= 11

  return (
    <motion.div 
      className="bg-white rounded-lg p-6 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">Rank Tier</h3>
        <span className="text-xs text-gray-500">Tier {currentTier}/11</span>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <TierBadge
          address={address as Address}
          variant="full"
          size="md"
        />
        {!isMaxTier && (
          <>
            <span className="text-gray-400">→</span>
            <div className="text-sm text-gray-600">
              <div className="font-semibold">{TIER_NAMES[nextTier]}</div>
              <div className="text-xs text-gray-500">Next Tier</div>
            </div>
          </>
        )}
      </div>

      {!isMaxTier ? (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>{currentPoints.toLocaleString()} pts</span>
            <span>{nextTierPoints.toLocaleString()} pts</span>
          </div>
          <div 
            className="w-full bg-gray-200 rounded-full h-3 overflow-hidden"
            role="progressbar"
            aria-valuenow={tierPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Tier progress: ${tierPercent.toFixed(1)}% to ${TIER_NAMES[nextTier]}`}
          >
            <motion.div
              className={`bg-gradient-to-r ${tierColor} h-full rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${tierPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            />
          </div>
          <div className="text-xs text-center text-gray-500">
            {tierPercent.toFixed(1)}% to {TIER_NAMES[nextTier]}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-gradient-to-r from-yellow-50 to-pink-50 rounded-lg">
          <p className="text-xs text-center font-semibold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-pink-600">
            ⭐ Max Tier Reached!
          </p>
        </div>
      )}

      {!isMaxTier && (
        <div className="mt-4 p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-700">
            <span className="font-semibold">{(nextTierPoints - currentPoints).toLocaleString()} points</span>
            {' '}needed for {TIER_NAMES[nextTier]} tier
          </p>
        </div>
      )}
    </motion.div>
  )
}
