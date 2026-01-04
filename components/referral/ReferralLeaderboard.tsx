/**
 * ReferralLeaderboard Component
 * 
 * Purpose: Display top referrers with ranking and filtering
 * Template: music/DataTables (25%) + trezoadmin-41/leaderboard (40%)
 * 
 * Features:
 * - Top referrers ranking table
 * - Time period filters (All-Time, Week, Month)
 * - Pagination (15 entries per page)
 * - User search by FID or address
 * - Rank change indicators
 * - Responsive mobile layout
 * 
 * Usage:
 * <ReferralLeaderboard currentUserFid={12345} />
 */

'use client'

import { useState, useEffect } from 'react'
import { EmojiEventsIcon, TrendingUpIcon, TrendingDownIcon, RemoveIcon, SearchIcon } from '@/components/icons'

export interface ReferralLeaderboardProps {
  /** Current user's FID for highlighting */
  currentUserFid?: number
  /** Custom CSS class */
  className?: string
}

interface LeaderboardEntry {
  fid: number
  address: string
  username?: string
  avatar?: string
  totalReferrals: number
  pointsEarned: bigint
  tier: number
  rank: number
  rankChange: number
}

type TimePeriod = 'all-time' | 'week' | 'month'

const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold']
const TIER_COLORS = {
  0: 'text-gray-400',
  1: 'text-amber-600',
  2: 'text-gray-300',
  3: 'text-yellow-400',
}

export function ReferralLeaderboard({ currentUserFid, className = '' }: ReferralLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<TimePeriod>('all-time')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  
  const pageSize = 15

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({
          period,
          page: currentPage.toString(),
          pageSize: pageSize.toString(),
        })

        if (searchQuery) {
          params.append('search', searchQuery)
        }

        const response = await fetch(`/api/referral/leaderboard?${params}`)
        
        if (!response.ok) {
          throw new Error('Failed to load leaderboard')
        }

        const data = await response.json()
        setEntries(data.entries || [])
        setTotalPages(data.pagination?.totalPages || 1)
      } catch (err) {
        console.error('Failed to load leaderboard:', err)
        setError('Failed to load leaderboard. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadLeaderboard()
  }, [period, currentPage, searchQuery])

  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setPeriod(newPeriod)
    setCurrentPage(1) // Reset to first page
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1) // Reset to first page
  }

  const getRankChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
          <TrendingUpIcon className="w-4 h-4" />
          +{change}
        </span>
      )
    } else if (change < 0) {
      return (
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
          <TrendingDownIcon className="w-4 h-4" />
          {change}
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
        <RemoveIcon className="w-4 h-4" />
        0
      </span>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 ${className}`}>
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Top Referrers
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            See who's leading the referral race
          </p>
        </div>

        {/* Period Filters */}
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => handlePeriodChange('all-time')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              period === 'all-time'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            All-Time
          </button>
          <button
            onClick={() => handlePeriodChange('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              period === 'month'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => handlePeriodChange('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              period === 'week'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            This Week
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by FID or address..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading leaderboard...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <EmojiEventsIcon className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? 'No results found' : 'No referrers yet. Be the first!'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Referrals
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Points
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tier
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {entries.map((entry) => {
                    const isCurrentUser = currentUserFid === entry.fid
                    return (
                      <tr
                        key={entry.fid}
                        className={`${
                          isCurrentUser
                            ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        } transition-colors`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {entry.rank <= 3 && (
                              <EmojiEventsIcon
                                className={`w-5 h-5 ${
                                  entry.rank === 1
                                    ? 'text-yellow-400'
                                    : entry.rank === 2
                                    ? 'text-gray-300'
                                    : 'text-amber-600'
                                }`}
                              />
                            )}
                            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              #{entry.rank}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {entry.avatar ? (
                              <img
                                src={entry.avatar}
                                alt={entry.username || `User ${entry.fid}`}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                                {entry.fid.toString().slice(0, 2)}
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {entry.username || `User ${entry.fid}`}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                FID: {entry.fid}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100 font-medium">
                          {entry.totalReferrals}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100 font-medium">
                          {entry.pointsEarned?.toString() || '0'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`${TIER_COLORS[entry.tier as keyof typeof TIER_COLORS]} font-medium`}>
                            {TIER_NAMES[entry.tier]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getRankChangeIndicator(entry.rankChange)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry) => {
                const isCurrentUser = currentUserFid === entry.fid
                return (
                  <div
                    key={entry.fid}
                    className={`p-4 ${
                      isCurrentUser
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {entry.avatar ? (
                          <img
                            src={entry.avatar}
                            alt={entry.username || `User ${entry.fid}`}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {entry.fid.toString().slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {entry.username || `User ${entry.fid}`}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            FID: {entry.fid}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.rank <= 3 && (
                          <EmojiEventsIcon
                            className={`w-6 h-6 ${
                              entry.rank === 1
                                ? 'text-yellow-400'
                                : entry.rank === 2
                                ? 'text-gray-300'
                                : 'text-amber-600'
                            }`}
                          />
                        )}
                        <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                          #{entry.rank}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Referrals:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                          {entry.totalReferrals}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Points:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                          {entry.pointsEarned?.toString() || '0'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Tier:</span>
                        <span className={`ml-2 font-medium ${TIER_COLORS[entry.tier as keyof typeof TIER_COLORS]}`}>
                          {TIER_NAMES[entry.tier]}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Change:</span>
                        <span className="ml-2">
                          {getRankChangeIndicator(entry.rankChange)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && entries.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <span className="text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
