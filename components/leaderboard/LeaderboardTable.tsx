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
import { TrophyGold, TrophySilver, TrophyBronze } from '@/components/icons/trophy'
import { ArrowUp, ArrowDown, Star } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getImprovedRankTierByPoints } from '@/lib/rank'

// LeaderboardCalculation from database
export interface LeaderboardEntry {
  id: string
  address: string
  farcaster_fid: number | null
  base_points: number
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
}: LeaderboardTableProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery)

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
          {row.global_rank === 1 && <TrophyGold className="w-5 h-5" />}
          {row.global_rank === 2 && <TrophySilver className="w-5 h-5" />}
          {row.global_rank === 3 && <TrophyBronze className="w-5 h-5" />}
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
              <ArrowUp size={14} weight="bold" />
              <span>{row.rank_change}</span>
            </div>
          )
        }
        return (
          <div className="rank-change down">
            <ArrowDown size={14} weight="bold" />
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
        const tier = getImprovedRankTierByPoints(row.total_score)
        return (
          <div className="flex items-center gap-3">
            {row.pfp_url ? (
              <img
                src={row.pfp_url}
                alt={row.display_name || row.username || 'Pilot'}
                className="w-10 h-10 rounded-full border-2 border-gray-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-dark-bg-elevated border-2 border-gray-700 flex items-center justify-center">
                <Star size={20} className="text-gray-400" />
              </div>
            )}
            <div>
              <div className="font-semibold text-base">
                {row.display_name || row.username || `Pilot #${row.farcaster_fid}`}
              </div>
              {tier && (
                <div className={cn('rank-badge text-xs mt-1', tier.tier)}>
                  {tier.name}
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'total_score',
      label: 'Total Points',
      sortable: true,
      headerClassName: 'text-right',
      className: 'text-right font-bold text-brand',
      render: (row) => row.total_score.toLocaleString(),
    },
    {
      key: 'base_points',
      label: 'Quest Points',
      sortable: true,
      headerClassName: 'text-right',
      className: 'text-right text-gray-400',
      render: (row) => row.base_points.toLocaleString(),
    },
    {
      key: 'guild_bonus',
      label: 'Guild Bonus',
      sortable: true,
      headerClassName: 'text-right',
      className: 'text-right text-gold',
      render: (row) => (row.guild_bonus > 0 ? `+${row.guild_bonus}` : '0'),
    },
    {
      key: 'referral_bonus',
      label: 'Referrals',
      sortable: true,
      headerClassName: 'text-right',
      className: 'text-right text-accent-green',
      render: (row) => (row.referral_bonus > 0 ? `+${row.referral_bonus}` : '0'),
    },
    {
      key: 'badge_prestige',
      label: 'Badge Prestige',
      sortable: true,
      headerClassName: 'text-right',
      className: 'text-right text-purple-400',
      render: (row) => (row.badge_prestige > 0 ? `+${row.badge_prestige}` : '0'),
    },
    {
      key: 'viral_xp',
      label: 'Viral XP',
      sortable: true,
      headerClassName: 'text-right',
      className: 'text-right text-blue-400',
      render: (row) => (row.viral_xp > 0 ? `+${row.viral_xp}` : '0'),
    },
  ]

  // Mobile card render
  const mobileCardRender = (row: LeaderboardEntry) => {
    const tier = getImprovedRankTierByPoints(row.total_score)
    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {row.global_rank <= 3 && (
              <div>
                {row.global_rank === 1 && <TrophyGold className="w-6 h-6" />}
                {row.global_rank === 2 && <TrophySilver className="w-6 h-6" />}
                {row.global_rank === 3 && <TrophyBronze className="w-6 h-6" />}
              </div>
            )}
            <div className="text-2xl font-bold">#{row.global_rank}</div>
          </div>
          <div>
            {row.rank_change !== 0 && (
              <div className={cn('rank-change', row.rank_change > 0 ? 'up' : 'down')}>
                {row.rank_change > 0 ? (
                  <ArrowUp size={14} weight="bold" />
                ) : (
                  <ArrowDown size={14} weight="bold" />
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
            <div className="w-12 h-12 rounded-full bg-dark-bg-elevated border-2 border-gray-700 flex items-center justify-center">
              <Star size={24} className="text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base truncate">
              {row.display_name || row.username || `Pilot #${row.farcaster_fid}`}
            </div>
            {tier && (
              <div className={cn('rank-badge text-xs mt-1 inline-block', tier.tier)}>
                {tier.name}
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-400 uppercase">Total Points</div>
            <div className="text-lg font-bold text-brand">{row.total_score.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase">Quest Points</div>
            <div className="text-lg font-semibold">{row.base_points.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase">Guild Bonus</div>
            <div className="text-base font-medium text-gold">
              {row.guild_bonus > 0 ? `+${row.guild_bonus}` : '0'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase">Referrals</div>
            <div className="text-base font-medium text-accent-green">
              {row.referral_bonus > 0 ? `+${row.referral_bonus}` : '0'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase">Badges</div>
            <div className="text-base font-medium text-purple-400">
              {row.badge_prestige > 0 ? `+${row.badge_prestige}` : '0'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase">Viral XP</div>
            <div className="text-base font-medium text-blue-400">
              {row.viral_xp > 0 ? `+${row.viral_xp}` : '0'}
            </div>
          </div>
        </div>
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
    <div className="space-y-6">
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
            className="w-full sm:w-64 px-3 py-2 bg-dark-bg-card border border-gray-700 rounded-lg text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          <Button variant="outline" size="sm" onClick={handleSearchSubmit}>
            Search
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="text-sm text-gray-400">
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
    </div>
  )
}
