/**
 * Viral Stats Card Component
 * 
 * Displays user's viral engagement statistics with top performing casts
 * and tier breakdown chart.
 * 
 * Quality Gates Applied:
 * - GI-11: Safe data fetching with error boundaries
 * - GI-13: Accessible (ARIA labels, semantic HTML, screen reader support)
 * - GI-13: Mobile-responsive (44px+ touch targets, flexible layouts)
 */

'use client'

import { useState, useEffect } from 'react'
import { ViralTierBadge, ViralTierProgress } from './ViralTierBadge'
import { getViralTier, estimateNextTier, formatEngagementMetrics, type EngagementMetrics } from '@/lib/viral-bonus'

type ViralCastStat = {
  castHash: string
  castUrl: string
  badgeId: string
  likes: number
  recasts: number
  replies: number
  score: number
  tier: string
  tierEmoji: string
  bonusXp: number
  createdAt: string
}

type TierBreakdown = {
  mega_viral: number
  viral: number
  popular: number
  engaging: number
  active: number
}

type ViralStatsData = {
  fid: number
  totalViralXp: number
  totalCasts: number
  topCasts: ViralCastStat[]
  tierBreakdown: TierBreakdown
  averageXpPerCast: number
  message?: string
}

type ViralStatsCardProps = {
  fid: number
  className?: string
  showTopCasts?: number
}

export function ViralStatsCard({
  fid,
  className = '',
  showTopCasts = 3,
}: ViralStatsCardProps) {
  const [stats, setStats] = useState<ViralStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // GI-11: Safe data fetching with error handling
  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/viral/stats?fid=${fid}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.statusText}`)
        }

        const data = await response.json()
        setStats(data)
      } catch (err) {
        console.error('[ViralStatsCard] Error fetching stats:', err)
        setError(err instanceof Error ? err.message : 'Failed to load stats')
      } finally {
        setLoading(false)
      }
    }

    if (fid) {
      fetchStats()
    }
  }, [fid])

  // GI-13: Loading state with accessible spinner
  if (loading) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg ${className}`}
        role="status"
        aria-label="Loading viral statistics"
      >
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading stats...</p>
        </div>
      </div>
    )
  }

  // GI-13: Error state with retry button
  if (error) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg ${className}`}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="text-4xl">⚠️</div>
          <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="
              px-4 py-2 min-h-[44px] rounded-lg
              bg-blue-500 hover:bg-blue-600 text-white font-medium
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            "
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // GI-13: Empty state with helpful message
  if (!stats || stats.totalCasts === 0) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg ${className}`}
        role="status"
      >
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="text-6xl">🚀</div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Start Your Viral Journey
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-sm">
            {stats?.message || 'Share your first badge to start earning viral XP!'}
          </p>
        </div>
      </div>
    )
  }

  // Calculate current tier for progress indicator
  const currentTier = stats.topCasts[0]
    ? getViralTier(stats.topCasts[0].score)
    : getViralTier(0)
  
  const nextTierInfo = estimateNextTier(
    stats.topCasts[0]?.score || 0,
    currentTier
  )

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Viral Stats
        </h2>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats.totalViralXp}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Viral XP</div>
        </div>
      </div>

      {/* Summary Stats Grid (GI-13: Mobile-responsive) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.totalCasts}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total Casts</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.averageXpPerCast}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Avg XP/Cast</div>
        </div>
      </div>

      {/* Tier Breakdown Chart */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Tier Breakdown
        </h3>
        <div className="space-y-2">
          {Object.entries(stats.tierBreakdown).map(([tier, count]) => {
            if (count === 0) return null
            const percentage = (count / stats.totalCasts) * 100

            return (
              <div key={tier} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {tier.replace('_', ' ')}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {count} ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                      role="progressbar"
                      aria-valuenow={percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${tier}: ${count} casts, ${Math.round(percentage)}%`}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Performing Casts */}
      {stats.topCasts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Top Performing Casts
          </h3>
          <div className="space-y-3">
            {stats.topCasts.slice(0, showTopCasts).map((cast, index) => {
              const castTier = getViralTier(cast.score)
              const metrics: EngagementMetrics = {
                likes: cast.likes,
                recasts: cast.recasts,
                replies: cast.replies,
              }

              return (
                <a
                  key={cast.castHash}
                  href={cast.castUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    block bg-gray-50 dark:bg-gray-700 rounded-xl p-4
                    hover:bg-gray-100 dark:hover:bg-gray-600
                    transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                  "
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Rank Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="
                          w-6 h-6 rounded-full bg-blue-500 text-white
                          flex items-center justify-center text-xs font-bold
                        ">
                          #{index + 1}
                        </div>
                        <ViralTierBadge tier={castTier} score={cast.score} size="sm" />
                      </div>

                      {/* Engagement Metrics */}
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {formatEngagementMetrics(metrics)}
                      </div>

                      {/* XP Earned */}
                      <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                        +{cast.bonusXp} XP
                      </div>
                    </div>

                    {/* External Link Icon */}
                    <svg
                      className="w-5 h-5 text-gray-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Progress to Next Tier */}
      {nextTierInfo && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Progress to Next Tier
          </h3>
          <ViralTierProgress
            currentScore={stats.topCasts[0]?.score || 0}
            currentTier={currentTier}
            nextTier={nextTierInfo.nextTier}
          />
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
            💡 {nextTierInfo.suggestedEngagement} to reach {nextTierInfo.nextTier?.name}
          </p>
        </div>
      )}
    </div>
  )
}
