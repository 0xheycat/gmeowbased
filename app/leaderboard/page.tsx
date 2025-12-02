'use client'

/**
 * Leaderboard Page
 * 
 * Features:
 * - 12-tier rank system with trophy icons
 * - Time period filtering (24h, 7d, all-time)
 * - Search by name/FID
 * - Pagination (15 per page)
 * - Mobile responsive
 * - Real-time updates from API
 */

import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'
import { useLeaderboard } from '@/lib/hooks/useLeaderboard'
import { Trophy } from '@phosphor-icons/react'

export default function LeaderboardPage() {
  const {
    data,
    loading,
    error,
    currentPage,
    totalPages,
    totalCount,
    period,
    search,
    setPage,
    setPeriod,
    setSearch,
  } = useLeaderboard('all_time', 15)
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Trophy size={40} weight="duotone" className="text-gold" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gold via-brand to-purple-500 bg-clip-text text-transparent">
            Leaderboard
          </h1>
        </div>
        <p className="text-gray-400 text-lg">
          Compete for the top spot and unlock exclusive rewards
        </p>
      </div>
      
      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
          <p className="text-red-400">
            Failed to load leaderboard: {error}
          </p>
        </div>
      )}
      
      {/* Leaderboard Table */}
      <LeaderboardTable
        data={data}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        period={period}
        searchQuery={search}
        onPageChange={setPage}
        onPeriodChange={setPeriod}
        onSearch={setSearch}
      />
      
      {/* Info Section */}
      <div className="mt-8 p-6 bg-dark-bg-card border border-gray-700 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">How Rankings Work</h2>
        <div className="space-y-3 text-gray-400">
          <p>
            <span className="text-accent-green font-semibold">Total Score</span> = Quest Points + Viral XP + Guild Bonus + Referrals + Streak + Badges
          </p>
          <p>
            Rankings update every 6 hours. Complete quests, earn badges, and invite friends to climb the leaderboard!
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-dark-bg-elevated rounded">
              <span className="text-gray-500">Quest Points:</span> <span className="text-white">Base rewards from contracts</span>
            </div>
            <div className="p-3 bg-dark-bg-elevated rounded">
              <span className="text-gray-500">Viral XP:</span> <span className="text-white">Popular casts & engagement</span>
            </div>
            <div className="p-3 bg-dark-bg-elevated rounded">
              <span className="text-gray-500">Guild Bonus:</span> <span className="text-white">Level × 100 points</span>
            </div>
            <div className="p-3 bg-dark-bg-elevated rounded">
              <span className="text-gray-500">Referrals:</span> <span className="text-white">Count × 50 points</span>
            </div>
            <div className="p-3 bg-dark-bg-elevated rounded">
              <span className="text-gray-500">Streak Bonus:</span> <span className="text-white">GM streak × 10 points</span>
            </div>
            <div className="p-3 bg-dark-bg-elevated rounded">
              <span className="text-gray-500">Badge Prestige:</span> <span className="text-white">Badge count × 25 points</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
