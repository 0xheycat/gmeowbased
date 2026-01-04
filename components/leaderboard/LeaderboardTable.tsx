'use client'

/**
 * LeaderboardTable Component
 * 
 * Professional leaderboard with:
 * - 12-tier rank system
 * - Trophy icons for top 3
 * - Time period filtering (24h, 7d, all-time)
 * - Search by name/FID
 * - Pagination (15 per page)
 * - Mobile responsive
 * - NO EMOJIS - SVG icons only
 * - NO HARDCODED COLORS - Tailwind config only
 * - WCAG AA contrast compliant
 * 
 * Pattern: Based on components/ui/data-table.tsx (production-tested)
 */

import { useState, useMemo } from 'react'
import { DataTable, type Column } from '@/components/ui/data-table'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import StarIcon from '@mui/icons-material/Star'
import { cn } from '@/lib/utils/utils'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { BadgeDisplay, BadgeDisplaySkeleton } from './BadgeDisplay'
import { useLeaderboardBadges } from '@/lib/hooks/useLeaderboardBadges'
import { ComparisonModal } from './ComparisonModal'
import BarChartIcon from '@mui/icons-material/BarChart'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { TierBadge } from '@/components/score/TierBadge'
import { TotalScoreDisplay } from '@/components/score/TotalScoreDisplay'
import { ScoreDetailsModal } from '@/components/modals/ScoreDetailsModal'

// LeaderboardCalculation from database
export interface LeaderboardEntry {
  id: string
  address: string
  farcaster_fid: number | null
  points_balance: number
  viral_xp: number
  guild_bonus: number
  referral_bonus: number
  streak_bonus: number
  badge_prestige: number
  total_score: number
  global_rank: number
  rank_change: number
  rank_tier: string
  period: 'daily' | 'weekly' | 'all_time'
  calculated_at: string
  updated_at: string
  // Optional user metadata (joined from profiles)
  username?: string
  display_name?: string
  pfp_url?: string
  // Added for comparison modal
  tip_points?: number
  nft_points?: number
  // Task 4.1: Guild integration
  guild_id?: number | null
  guild_name?: string | null
  is_guild_officer?: boolean
  guild_bonus_points?: number
}

type TimePeriod = 'daily' | 'weekly' | 'all_time'

interface LeaderboardTableProps {
  data: LeaderboardEntry[]
  loading?: boolean
  currentPage: number
  totalPages: number
  totalCount: number
  onPageChange: (page: number) => void
  onPeriodChange: (period: TimePeriod) => void
  onSearch: (query: string) => void
  period: TimePeriod
  searchQuery?: string
  currentUserFid?: number | null // For highlighting user's rank
}

export function LeaderboardTable({
  data,
  loading = false,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  onPeriodChange,
  onSearch,
  period,
  searchQuery = '',
  currentUserFid,
}: LeaderboardTableProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const [comparisonFids, setComparisonFids] = useState<number[]>([])
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [detailsAddress, setDetailsAddress] = useState<`0x${string}` | null>(null)
  const [detailsDisplayName, setDetailsDisplayName] = useState<string | null>(null)
  
  // Find current user's entry for "Your Rank" feature
  const currentUserEntry = useMemo(
    () => currentUserFid ? data.find(entry => entry.farcaster_fid === currentUserFid) : null,
    [data, currentUserFid]
  )
  
  // Fetch badges for all users in current page
  const fids = useMemo(() => data.map(entry => entry.farcaster_fid).filter((fid): fid is number => fid !== null), [data])
  const { badgesByFid, loading: badgesLoading } = useLeaderboardBadges(fids)

  // Get selected pilots for comparison
  const comparisonPilots = useMemo(() => {
    return data.filter(entry => 
      entry.farcaster_fid && 
      comparisonFids.includes(entry.farcaster_fid)
    )
  }, [data, comparisonFids])

  // Handlers for comparison
  const toggleComparison = (fid: number) => {
    setComparisonFids(prev => {
      if (prev.includes(fid)) {
        return prev.filter(f => f !== fid)
      }
      if (prev.length >= 3) {
        return prev
      }
      return [...prev, fid]
    })
  }

  const removeFromComparison = (fid: number) => {
    setComparisonFids(prev => prev.filter(f => f !== fid))
  }

  const openComparisonModal = () => {
    if (comparisonFids.length > 0) {
      setShowComparisonModal(true)
    }
  }

  const closeComparisonModal = () => {
    setShowComparisonModal(false)
  }

  // Columns definition
  const columns: Column<LeaderboardEntry>[] = [
    {
      key: 'global_rank',
      label: 'Rank',
      sortable: false,
      headerClassName: 'w-20',
      className: 'font-bold',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.global_rank === 1 && <EmojiEventsIcon className="w-5 h-5 text-yellow-500" />}
          {row.global_rank === 2 && <EmojiEventsIcon className="w-5 h-5 text-gray-400" />}
          {row.global_rank === 3 && <EmojiEventsIcon className="w-5 h-5 text-orange-600" />}
          <span className="text-base">{row.global_rank}</span>
        </div>
      ),
    },
    {
      key: 'rank_change',
      label: 'Change',
      sortable: false,
      headerClassName: 'w-20',
      render: (row) => {
        if (row.rank_change === 0) {
          return <span className="rank-change neutral">-</span>
        }
        if (row.rank_change > 0) {
          return (
            <div className="rank-change up">
              <TrendingUpIcon className="w-3.5 h-3.5" />
              <span>{row.rank_change}</span>
            </div>
          )
        }
        return (
          <div className="rank-change down">
            <TrendingDownIcon className="w-3.5 h-3.5 rotate-180" />
            <span>{Math.abs(row.rank_change)}</span>
          </div>
        )
      },
    },
    {
      key: 'username',
      label: 'Pilot',
      sortable: false,
      headerClassName: 'min-w-[200px]',
      render: (row) => {
        const userBadges = row.farcaster_fid ? badgesByFid[row.farcaster_fid] || [] : []
        return (
          <div className="flex items-center gap-3">
            {row.pfp_url ? (
              <img
                src={row.pfp_url}
                alt={row.display_name || row.username || 'Pilot'}
                className="w-10 h-10 rounded-full border-2 border-gray-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-dark-bg-elevated border-2 border-gray-300 dark:border-gray-700 flex items-center justify-center">
                <StarIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base">
                  {row.display_name || row.username || `Pilot #${row.farcaster_fid}`}
                </span>
                {/* On-chain Tier Badge */}
                {row.address && (
                  <TierBadge 
                    address={row.address as `0x${string}`}
                    variant="compact"
                    size="sm"
                  />
                )}
                {/* Guild Badge (Task 4.1) */}
                {row.guild_name && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-medium">
                      {row.guild_name}
                    </span>
                    {row.is_guild_officer && (
                      <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full font-medium">
                        Officer
                      </span>
                    )}
                  </div>
                )}
              </div>
              {/* Removed old tier badge - now using TierBadge component */}
              {/* Badges */}
              {row.farcaster_fid && (
                <div className="mt-1.5">
                  {badgesLoading ? (
                    <BadgeDisplaySkeleton count={3} />
                  ) : (
                    <BadgeDisplay badges={userBadges} maxDisplay={5} fid={row.farcaster_fid} />
                  )}
                </div>
              )}
            </div>
            {/* Comparison Checkbox */}
            {row.farcaster_fid && (
              <div className="ml-2 relative group">
                <input
                  type="checkbox"
                  checked={comparisonFids.includes(row.farcaster_fid)}
                  onChange={() => toggleComparison(row.farcaster_fid!)}
                  disabled={!comparisonFids.includes(row.farcaster_fid) && comparisonFids.length >= 3}
                  className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 text-brand focus:ring-2 focus:ring-brand focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  aria-label={comparisonFids.includes(row.farcaster_fid) ? 'Remove from comparison' : 'Add to comparison'}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50">
                  <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg py-2 px-3 shadow-xl whitespace-nowrap">
                    {comparisonFids.includes(row.farcaster_fid) 
                      ? 'Remove from comparison' 
                      : comparisonFids.length >= 3 
                        ? 'Max 3 pilots selected' 
                        : 'Add to comparison'}
                    <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'total_score',
      label: 'Total Score',
      sortable: true,
      headerClassName: 'text-right min-w-[140px]',
      className: 'text-right',
      render: (row) => (
        row.address ? (
          <TotalScoreDisplay 
            address={row.address as `0x${string}`}
            size="sm"
            showLabel={false}
          />
        ) : (
          <span className="font-bold text-brand">
            {row.total_score.toLocaleString()}
          </span>
        )
      ),
    },
    {
      key: 'actions',
      label: 'Details',
      sortable: false,
      headerClassName: 'text-center w-32',
      className: 'text-center',
      render: (row) => (
        row.address ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDetailsAddress(row.address as `0x${string}`)
              setDetailsDisplayName(row.display_name || row.username || null)
            }}
            className="gap-2"
          >
            <VisibilityIcon className="w-4 h-4" />
            View
          </Button>
        ) : null
      ),
    },
  ]

  // Mobile card render
  const mobileCardRender = (row: LeaderboardEntry) => {
    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {row.global_rank <= 3 && (
              <div>
                {row.global_rank === 1 && <EmojiEventsIcon className="w-6 h-6 text-yellow-500" />}
                {row.global_rank === 2 && <EmojiEventsIcon className="w-6 h-6 text-gray-400" />}
                {row.global_rank === 3 && <EmojiEventsIcon className="w-6 h-6 text-orange-600" />}
              </div>
            )}
            <div className="text-2xl font-bold">#{row.global_rank}</div>
          </div>
          <div>
            {row.rank_change !== 0 && (
              <div className={cn('rank-change', row.rank_change > 0 ? 'up' : 'down')}>
                {row.rank_change > 0 ? (
                  <TrendingUpIcon className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDownIcon className="w-3.5 h-3.5 rotate-180" />
                )}
                <span>{Math.abs(row.rank_change)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pilot Info */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-700">
          {row.pfp_url ? (
            <img
              src={row.pfp_url}
              alt={row.display_name || row.username || 'Pilot'}
              className="w-12 h-12 rounded-full border-2 border-gray-700"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-bg-elevated border-2 border-gray-300 dark:border-gray-700 flex items-center justify-center">
              <StarIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-semibold text-lg">
                {row.display_name || row.username || `Pilot #${row.farcaster_fid}`}
              </div>
              {row.address && (
                <TierBadge 
                  address={row.address as `0x${string}`}
                  variant="compact"
                  size="sm"
                />
              )}
            </div>
            {/* Badges in mobile view */}
            {row.farcaster_fid && (
              <div className="mt-2">
                {badgesLoading ? (
                  <BadgeDisplaySkeleton count={3} />
                ) : (
                  <BadgeDisplay badges={badgesByFid[row.farcaster_fid] || []} maxDisplay={5} fid={row.farcaster_fid} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <div className="text-xs text-gray-900 dark:text-gray-300 uppercase font-medium">Total Score</div>
            <div className="text-2xl font-bold text-brand">{row.total_score.toLocaleString()}</div>
          </div>
          {row.address && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDetailsAddress(row.address as `0x${string}`)
                setDetailsDisplayName(row.display_name || row.username || null)
              }}
              className="gap-2 w-full"
            >
              <VisibilityIcon className="w-4 h-4" />
              View Score Breakdown
            </Button>
          )}
        </div>

        {/* Comparison Checkbox (Mobile) */}
        {row.farcaster_fid && (
          <label className="mt-3 flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <input
              type="checkbox"
              checked={comparisonFids.includes(row.farcaster_fid)}
              onChange={() => toggleComparison(row.farcaster_fid!)}
              disabled={!comparisonFids.includes(row.farcaster_fid) && comparisonFids.length >= 3}
              className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 text-brand focus:ring-2 focus:ring-brand focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {comparisonFids.includes(row.farcaster_fid) ? 'Selected for comparison' : 'Add to comparison'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {comparisonFids.length >= 3 && !comparisonFids.includes(row.farcaster_fid) ? 'Max 3 pilots' : 'Compare performance across categories'}
              </div>
            </div>
            <BarChartIcon className="w-5 h-5 text-blue-500" />
          </label>
        )}
      </div>
    )
  }

  const handleSearchSubmit = () => {
    onSearch(localSearch)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit()
    }
  }

  return (
    <div className="space-y-6 pb-32 md:pb-6">
      {/* Comparison Feature Info Panel - Gamified */}
      <motion.div
        className="bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-orange-900/30 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-4 shadow-md"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <BarChartIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-extrabold text-transparent bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text mb-2">
              Who's The Best gmeowers?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
              Pick up to <span className="font-bold text-purple-600 dark:text-purple-400">3 friends</span> and see who dominates in each category!
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-[11px] shadow">1</span>
                <span className="font-medium">Pick your rivals to compare </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 text-white font-bold text-[11px] shadow">2</span>
                <span className="font-medium">Hit "Battle Stats" at the bottom</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 text-white font-bold text-[11px] shadow">3</span>
                <span className="font-medium">See who wins the trophy </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Your Rank - Sticky Header */}
      {currentUserEntry && (
        <motion.div 
          className="sticky top-16 z-10 bg-gradient-to-r from-brand/20 to-purple-500/20 border-2 border-brand/50 rounded-lg p-4 backdrop-blur-md shadow-lg"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StarIcon className="w-6 h-6 text-yellow-500" />
              <div>
                <div className="text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wide font-medium">Your Rank</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">#{currentUserEntry.global_rank}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {currentUserEntry.rank_change !== 0 && (
                <div className={cn('flex items-center gap-1', currentUserEntry.rank_change > 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500')}>
                  {currentUserEntry.rank_change > 0 ? (
                    <TrendingUpIcon className="w-5 h-5" />
                  ) : (
                    <TrendingDownIcon className="w-5 h-5 rotate-180" />
                  )}
                  <span className="text-lg font-bold">{Math.abs(currentUserEntry.rank_change)}</span>
                </div>
              )}
              <div className="text-right">
                <div className="text-xs text-gray-700 dark:text-gray-300 uppercase font-medium">Total Score</div>
                <div className="text-xl font-bold text-brand">{currentUserEntry.total_score.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Time Period Selector */}
        <div className="flex gap-2">
          <Button
            variant={period === 'daily' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPeriodChange('daily')}
            className="min-w-[80px]"
          >
            24 Hours
          </Button>
          <Button
            variant={period === 'weekly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPeriodChange('weekly')}
            className="min-w-[80px]"
          >
            7 Days
          </Button>
          <Button
            variant={period === 'all_time' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPeriodChange('all_time')}
            className="min-w-[80px]"
          >
            All Time
          </Button>
        </div>

        {/* Search */}
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search by name or FID..."
            value={localSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full sm:w-64 px-3 py-2 bg-white dark:bg-dark-bg-card border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          <Button variant="outline" size="sm" onClick={handleSearchSubmit}>
            Search
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
        Showing {data.length} of {totalCount.toLocaleString()} pilots
      </div>

      {/* Table */}
      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="No leaderboard entries found. Complete quests to appear on the leaderboard!"
        pagination={{
          currentPage,
          totalPages,
          onPageChange,
          pageSize: 15,
        }}
        mobileCardRender={mobileCardRender}
        className="leaderboard-table-wrapper"
      />

      {/* Selection Bar (sticky bottom - mobile full width, desktop right) */}
      {comparisonFids.length > 0 && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-6 z-[60] md:w-auto shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="bg-gradient-to-br from-white via-purple-50 to-pink-50 dark:from-dark-bg-card dark:via-purple-900/20 dark:to-pink-900/20 border-t-2 md:border-2 border-purple-400 dark:border-purple-600 md:rounded-lg backdrop-blur-md p-4 shadow-xl">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
                  <span className="text-white font-extrabold text-lg">{comparisonFids.length}</span>
                </div>
                <div>
                  <div className="text-sm font-extrabold text-transparent bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text">
                    {comparisonFids.length === 1 ? 'Pick 2 More Rivals' : comparisonFids.length === 2 ? 'Pick 1 More Rival' : 'Battle Ready!'}
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                    {comparisonFids.length < 3 ? `${comparisonFids.length}/3 rivals selected` : 'Let the battle begin'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setComparisonFids([])}
                className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-bold underline flex-shrink-0"
              >
                Reset
              </button>
            </div>
            <Button
              variant="default"
              size="lg"
              onClick={openComparisonModal}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 shadow-xl font-extrabold text-base"
            >
              <EmojiEventsIcon className="w-5 h-5 mr-2" />
              {comparisonFids.length < 2 ? 'Pick More Pilots' : 'Battle Stats'}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Comparison Modal */}
      <ComparisonModal
        pilots={comparisonPilots}
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        onRemovePilot={removeFromComparison}
      />

      {/* Score Details Modal */}
      <ScoreDetailsModal
        address={detailsAddress || undefined}
        displayName={detailsDisplayName || undefined}
        isOpen={!!detailsAddress}
        onClose={() => {
          setDetailsAddress(null)
          setDetailsDisplayName(null)
        }}
      />
    </div>
  )
}
