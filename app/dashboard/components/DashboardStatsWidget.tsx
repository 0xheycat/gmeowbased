'use client'

/**
 * Dashboard Stats Widget
 * @template music/dashboard (adapted 30%)
 * Phase 2: Dashboard Migration - GraphQL-first scoring data
 * 
 * Displays user's scoring stats on dashboard using Subsquid GraphQL
 * Data Flow: useUserStats hook → Apollo Client → Subsquid (50-100ms) → Contract fallback (300-500ms)
 * 
 * Professional Patterns (from music template):
 * - Skeleton loading (wave animation, GPU-optimized)
 * - Framer Motion scale-fade transitions
 * - Accessible ARIA attributes
 * - Professional error UI with retry button
 * - Gradient backgrounds with grid overlay
 * 
 * Features:
 * - Level & XP progress
 * - Tier badge
 * - Total score
 * - Points breakdown (GM, Viral, Quest, Guild, Referral)
 * - Data source indicator (⚡ GraphQL / 🔗 Contract)
 * - Loading skeleton
 * - Error handling with retry
 */

import { useAuthContext } from '@/lib/contexts'
import { useUserStats } from '@/hooks/useUserStats'
import { TierBadge } from '@/components/score/TierBadge'
import { TotalScoreDisplay } from '@/components/score/TotalScoreDisplay'
import { Skeleton } from '@/components/ui/skeleton/Skeleton'
import { motion } from 'framer-motion'
import type { Address } from 'viem'

// Tier names mapping (0-11)
const TIER_NAMES = [
  'Iron', 'Bronze', 'Silver', 'Gold', 
  'Platinum', 'Diamond', 'Master', 'Grandmaster',
  'Challenger', 'Elite', 'Legend', 'Mythic'
]

export function DashboardStatsWidget() {
  const { address } = useAuthContext()
  
  // Fetch user stats with GraphQL-first strategy
  const { stats, loading, error, refetch, source } = useUserStats(address as Address | undefined, {
    variant: 'complete',
    enableFallback: true,
    pollInterval: 60000, // 60s polling
  })

  // Loading state (music template: Skeleton with wave animation)
  if (loading) {
    return (
      <div 
        className="bg-gray-900 dark:bg-gray-800 rounded-2xl p-6 mb-6"
        role="status"
        aria-live="polite"
        aria-label="Loading dashboard stats"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <Skeleton variant="text" className="h-4 w-24 mb-3 bg-white/20" animation="wave" />
              <Skeleton variant="rect" className="h-8 w-32 bg-white/20" animation="wave" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state (music template: professional error UI with animations)
  if (error || !stats) {
    return (
      <motion.div 
        className="bg-red-900/90 dark:bg-red-950/50 rounded-2xl p-6 mb-6"
        role="alert"
        aria-live="assertive"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="text-center text-white">
          <motion.svg
            className="w-12 h-12 mx-auto mb-3 text-white/80"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </motion.svg>
          <p className="text-xl font-bold mb-2">Failed to load stats</p>
          <p className="text-white/80 text-sm mb-4">{error?.message || 'Unable to fetch scoring data'}</p>
          <motion.button
            onClick={() => refetch()}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors shadow-lg shadow-white/10"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            Retry
          </motion.button>
        </div>
      </motion.div>
    )
  }

  const tierName = TIER_NAMES[stats.rankTier] || 'Unknown'
  const xpToNext = Number(stats.xpToNextLevel)
  const levelPercent = xpToNext > 0 
    ? Math.min((Number(stats.xpIntoLevel) / xpToNext) * 100, 100)
    : 100

  return (
    <motion.div 
      className="bg-gray-900 dark:bg-gray-800 rounded-2xl p-6 mb-6 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 bg-grid-white/10"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                           linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header with data source */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Your Stats</h2>
          <span className="text-xs text-white/60" title={source === 'subsquid' ? 'Data from Subsquid GraphQL' : 'Data from contract (fallback)'}>
            {source === 'subsquid' ? '⚡ Live' : '🔗 On-chain'}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Level & XP Progress */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-white/80 text-sm mb-2">Level</div>
            <div className="text-4xl font-bold text-white mb-3">
              {stats.level}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/60">
                <span>XP: {Number(stats.xpIntoLevel).toLocaleString()}</span>
                <span>{Number(stats.xpToNextLevel).toLocaleString()}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${levelPercent}%` }}
                />
              </div>
              <div className="text-xs text-white/60 text-center">
                {levelPercent.toFixed(1)}% to Level {stats.level + 1}
              </div>
            </div>
          </div>

          {/* Tier & Rank */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-white/80 text-sm mb-2">Rank Tier</div>
            <div className="flex items-center gap-3 mb-3">
              <TierBadge
                address={address as Address}
                variant="full"
                size="lg"
              />
            </div>
            <div className="text-lg font-semibold text-white mb-2">
              {tierName}
            </div>
            <div className="text-sm text-white/60">
              Tier {stats.rankTier}/11
            </div>
          </div>

          {/* Total Score */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-white/80 text-sm mb-2">Total Score</div>
            <TotalScoreDisplay
              address={address as Address}
              size="lg"
              showLabel={false}
            />
            <div className="mt-3 space-y-1 text-xs text-white/60">
              <div className="flex justify-between">
                <span>GM Points:</span>
                <span className="font-medium">{Number(stats.gmPoints).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Viral Points:</span>
                <span className="font-medium">{Number(stats.viralPoints).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Quest Points:</span>
                <span className="font-medium">{Number(stats.questPoints).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Points Breakdown */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 text-center">
            <div className="text-white/60 text-xs mb-1">GM</div>
            <div className="text-white font-bold">{Number(stats.gmPoints).toLocaleString()}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 text-center">
            <div className="text-white/60 text-xs mb-1">Viral</div>
            <div className="text-white font-bold">{Number(stats.viralPoints).toLocaleString()}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 text-center">
            <div className="text-white/60 text-xs mb-1">Quest</div>
            <div className="text-white font-bold">{Number(stats.questPoints).toLocaleString()}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 text-center">
            <div className="text-white/60 text-xs mb-1">Guild</div>
            <div className="text-white font-bold">{Number(stats.guildPoints).toLocaleString()}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 text-center">
            <div className="text-white/60 text-xs mb-1">Referral</div>
            <div className="text-white font-bold">{Number(stats.referralPoints).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
