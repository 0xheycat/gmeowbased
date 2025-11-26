/**
 * Viral Leaderboard Component
 * 
 * Displays top users ranked by viral engagement XP with real-time updates.
 * 
 * Quality Gates Applied:
 * - GI-11: Safe data fetching with pagination and error boundaries
 * - GI-13: Accessible (ARIA labels, semantic table, keyboard navigation)
 * - GI-13: Mobile-responsive (card layout on mobile, table on desktop)
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

type LeaderboardEntry = {
  rank: number
  fid: number
  username: string | null
  displayName: string | null
  pfpUrl: string | null
  totalViralXp: number
  viralCasts: number
  topTier: string
  topTierEmoji: string
}

type LeaderboardData = {
  leaderboard: LeaderboardEntry[]
  totalUsers: number
  chain: string
  season: string
  limit: number
  generatedAt: string
  message?: string
}

type ViralLeaderboardProps = {
  limit?: number
  chain?: string
  season?: string
  className?: string
  showFilters?: boolean
}

export function ViralLeaderboard({
  limit = 50,
  chain = 'all',
  season = 'current',
  className = '',
  showFilters = true,
}: ViralLeaderboardProps) {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedChain, setSelectedChain] = useState(chain)
  const [selectedSeason, setSelectedSeason] = useState(season)

  // GI-11: Safe data fetching with error handling
  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          limit: limit.toString(),
          chain: selectedChain,
          season: selectedSeason,
        })

        const response = await fetch(`/api/viral/leaderboard?${params}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch leaderboard: ${response.statusText}`)
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('[ViralLeaderboard] Error fetching leaderboard:', err)
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [limit, selectedChain, selectedSeason])

  // GI-13: Loading state
  if (loading) {
    return (
      <div
        className={`bg-slate-100/90 dark:bg-white/5 rounded-2xl p-6 shadow-lg ${className}`}
        role="status"
        aria-label="Loading leaderboard"
      >
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  // GI-13: Error state
  if (error) {
    return (
      <div
        className={`bg-slate-100/90 dark:bg-white/5 rounded-2xl p-6 shadow-lg ${className}`}
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
              bg-blue-500 hover:bg-blue-600 text-slate-950 dark:text-white font-medium
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

  // GI-13: Empty state
  if (!data || data.leaderboard.length === 0) {
    return (
      <div
        className={`bg-slate-100/90 dark:bg-white/5 rounded-2xl p-6 shadow-lg ${className}`}
        role="status"
      >
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="text-6xl">🏆</div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            No Leaders Yet
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-sm">
            {data?.message || 'Be the first to share a badge and claim the top spot!'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-slate-100/90 dark:bg-white/5 rounded-2xl p-6 shadow-lg space-y-6 ${className}`}>
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Viral Leaderboard
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {data.totalUsers} total users • Updated{' '}
            {new Date(data.generatedAt).toLocaleTimeString()}
          </p>
        </div>

        {/* GI-13: Accessible filters */}
        {showFilters && (
          <div className="flex gap-2">
            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
              className="
                px-3 py-2 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600
                bg-slate-100/90 dark:bg-white/5 text-gray-900 dark:text-gray-100
                text-sm font-medium
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
              aria-label="Filter by chain"
            >
              <option value="all">All Chains</option>
              <option value="base">Base</option>
              <option value="optimism">Optimism</option>
              <option value="ethereum">Ethereum</option>
            </select>

            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="
                px-3 py-2 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600
                bg-slate-100/90 dark:bg-white/5 text-gray-900 dark:text-gray-100
                text-sm font-medium
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
              aria-label="Filter by season"
            >
              <option value="current">Current Season</option>
              <option value="all-time">All Time</option>
            </select>
          </div>
        )}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Top Tier
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Viral XP
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Casts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.leaderboard.map((entry) => {
              const isTopThree = entry.rank <= 3

              return (
                <tr
                  key={entry.fid}
                  className={`
                    hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                    ${isTopThree ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}
                  `}
                >
                  {/* Rank */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {isTopThree && (
                        <span className="text-2xl">
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      )}
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        #{entry.rank}
                      </span>
                    </div>
                  </td>

                  {/* User */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {entry.pfpUrl ? (
                        <Image
                          src={entry.pfpUrl}
                          alt={entry.displayName || `User ${entry.fid}`}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-lg">👤</span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {entry.displayName || `User ${entry.fid}`}
                        </div>
                        {entry.username && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            @{entry.username}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Top Tier */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{entry.topTierEmoji}</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {entry.topTier}
                      </span>
                    </div>
                  </td>

                  {/* Viral XP */}
                  <td className="px-4 py-4 text-right">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {entry.totalViralXp.toLocaleString()}
                    </span>
                  </td>

                  {/* Casts */}
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {entry.viralCasts}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: Card Layout */}
      <div className="md:hidden space-y-3">
        {data.leaderboard.map((entry) => {
          const isTopThree = entry.rank <= 3

          return (
            <div
              key={entry.fid}
              className={`
                p-4 rounded-xl border-2
                ${isTopThree 
                  ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' 
                  : 'border-gray-200 dark:border-gray-700'
                }
              `}
            >
              <div className="flex items-start gap-3">
                {/* Rank Badge */}
                <div className="flex-shrink-0">
                  {isTopThree ? (
                    <div className="text-3xl">
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                    </div>
                  ) : (
                    <div className="
                      w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700
                      flex items-center justify-center
                      text-sm font-bold text-gray-700 dark:text-gray-300
                    ">
                      #{entry.rank}
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {entry.pfpUrl ? (
                      <Image
                        src={entry.pfpUrl}
                        alt={entry.displayName || `User ${entry.fid}`}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-sm">👤</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {entry.displayName || `User ${entry.fid}`}
                      </div>
                      {entry.username && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          @{entry.username}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{entry.topTierEmoji}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {entry.topTier}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {entry.totalViralXp.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {entry.viralCasts} casts
                      </div>
                    </div>
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
