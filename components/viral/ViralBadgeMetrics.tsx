/**
 * Viral Badge Metrics Component
 * 
 * Displays per-badge viral performance with engagement breakdown.
 * Shows which badges are driving the most viral XP and engagement.
 * 
 * Quality Gates Applied:
 * - GI-11: Safe data fetching with error boundaries
 * - GI-13: Accessible (ARIA labels, semantic HTML, keyboard navigation)
 * - GI-13: Mobile-responsive (stacked layout on mobile, grid on desktop)
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ViralTierBadge } from './ViralTierBadge'
import { getViralTier, type ViralTier } from '@/lib/viral-bonus'

type BadgeMetric = {
  badgeId: string
  badgeName: string
  badgeImage?: string
  castCount: number
  totalViralXp: number
  averageXp: number
  topTier: ViralTier
  engagementBreakdown: {
    likes: number
    recasts: number
    replies: number
  }
  lastCastAt: string
}

type BadgeMetricsData = {
  badges: BadgeMetric[]
  totalBadges: number
  totalCasts: number
  totalXp: number
  fid: number
  message?: string
}

type ViralBadgeMetricsProps = {
  fid: number
  className?: string
  showTopN?: number
  sortBy?: 'xp' | 'casts' | 'engagement'
}

export function ViralBadgeMetrics({
  fid,
  className = '',
  showTopN = 10,
  sortBy = 'xp',
}: ViralBadgeMetricsProps) {
  const [data, setData] = useState<BadgeMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSort, setSelectedSort] = useState(sortBy)

  // GI-11: Safe data fetching with error handling
  useEffect(() => {
    async function fetchBadgeMetrics() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          fid: fid.toString(),
          limit: showTopN.toString(),
          sortBy: selectedSort,
        })

        const response = await fetch(`/api/viral/badge-metrics?${params}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch badge metrics: ${response.statusText}`)
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('[ViralBadgeMetrics] Error fetching badge metrics:', err)
        setError(err instanceof Error ? err.message : 'Failed to load badge metrics')
      } finally {
        setLoading(false)
      }
    }

    if (fid) {
      fetchBadgeMetrics()
    }
  }, [fid, showTopN, selectedSort])

  // GI-13: Loading state
  if (loading) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg ${className}`}
        role="status"
        aria-label="Loading badge metrics"
      >
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading badge metrics...</p>
        </div>
      </div>
    )
  }

  // GI-13: Error state
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
              bg-purple-500 hover:bg-purple-600 text-white font-medium
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
            "
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // GI-13: Empty state
  if (!data || data.badges.length === 0) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg ${className}`}
        role="status"
      >
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="text-6xl">🎖️</div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            No Badge Activity
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-sm">
            {data?.message || 'Share a badge to start tracking viral performance!'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg space-y-6 ${className}`}>
      {/* Header with Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Badge Performance
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {data.totalBadges} badges • {data.totalCasts} total casts • {data.totalXp.toLocaleString()} XP
          </p>
        </div>

        {/* GI-13: Accessible sort control */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedSort('xp')}
            className={`
              px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
              ${selectedSort === 'xp'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
            type="button"
            aria-label="Sort by viral XP"
            aria-pressed={selectedSort === 'xp'}
          >
            By XP
          </button>
          <button
            onClick={() => setSelectedSort('casts')}
            className={`
              px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
              ${selectedSort === 'casts'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
            type="button"
            aria-label="Sort by cast count"
            aria-pressed={selectedSort === 'casts'}
          >
            By Casts
          </button>
          <button
            onClick={() => setSelectedSort('engagement')}
            className={`
              px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
              ${selectedSort === 'engagement'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
            type="button"
            aria-label="Sort by engagement"
            aria-pressed={selectedSort === 'engagement'}
          >
            By Engagement
          </button>
        </div>
      </div>

      {/* Badge Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.badges.map((badge, index) => {
          const totalEngagement =
            badge.engagementBreakdown.likes +
            badge.engagementBreakdown.recasts +
            badge.engagementBreakdown.replies

          return (
            <div
              key={badge.badgeId}
              className="
                p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700
                hover:border-purple-400 dark:hover:border-purple-500
                transition-all duration-200
                bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850
              "
            >
              {/* Badge Header */}
              <div className="flex items-start gap-3 mb-4">
                {/* Badge Image or Placeholder */}
                {badge.badgeImage ? (
                  <Image
                    src={badge.badgeImage}
                    alt={badge.badgeName}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-lg object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-sm">
                    <span className="text-2xl">🎖️</span>
                  </div>
                )}

                {/* Badge Name and Tier */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate mb-1">
                    {badge.badgeName}
                  </h3>
                  <ViralTierBadge tier={getViralTier(badge.totalViralXp)} score={badge.totalViralXp} size="sm" showTooltip={false} />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Last cast: {new Date(badge.lastCastAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Rank Badge */}
                {index < 3 && (
                  <div className="flex-shrink-0">
                    <div className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Total Viral XP */}
                <div className="bg-white dark:bg-gray-750 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total XP</div>
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {badge.totalViralXp.toLocaleString()}
                  </div>
                </div>

                {/* Cast Count */}
                <div className="bg-white dark:bg-gray-750 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Casts</div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {badge.castCount}
                  </div>
                </div>

                {/* Average XP per Cast */}
                <div className="bg-white dark:bg-gray-750 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg XP/Cast</div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {badge.averageXp.toFixed(1)}
                  </div>
                </div>

                {/* Total Engagement */}
                <div className="bg-white dark:bg-gray-750 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Engagement</div>
                  <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    {totalEngagement}
                  </div>
                </div>
              </div>

              {/* Engagement Breakdown */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Engagement Breakdown
                </div>
                <div className="flex items-center gap-4">
                  {/* Likes */}
                  <div className="flex items-center gap-1">
                    <span className="text-lg">❤️</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {badge.engagementBreakdown.likes}
                    </span>
                  </div>
                  {/* Recasts */}
                  <div className="flex items-center gap-1">
                    <span className="text-lg">🔄</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {badge.engagementBreakdown.recasts}
                    </span>
                  </div>
                  {/* Replies */}
                  <div className="flex items-center gap-1">
                    <span className="text-lg">💬</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {badge.engagementBreakdown.replies}
                    </span>
                  </div>
                </div>

                {/* Engagement Breakdown Bar */}
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="flex h-full">
                    <div
                      className="bg-red-500"
                      style={{
                        width: `${(badge.engagementBreakdown.likes / totalEngagement) * 100}%`,
                      }}
                      role="progressbar"
                      aria-label="Likes percentage"
                      aria-valuenow={(badge.engagementBreakdown.likes / totalEngagement) * 100}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                    <div
                      className="bg-green-500"
                      style={{
                        width: `${(badge.engagementBreakdown.recasts / totalEngagement) * 100}%`,
                      }}
                      role="progressbar"
                      aria-label="Recasts percentage"
                      aria-valuenow={(badge.engagementBreakdown.recasts / totalEngagement) * 100}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                    <div
                      className="bg-blue-500"
                      style={{
                        width: `${(badge.engagementBreakdown.replies / totalEngagement) * 100}%`,
                      }}
                      role="progressbar"
                      aria-label="Replies percentage"
                      aria-valuenow={(badge.engagementBreakdown.replies / totalEngagement) * 100}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
