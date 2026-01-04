'use client'

/**
 * ProfileStats Component - Phase 2: GraphQL Migration
 * 
 * MIGRATED: Uses GraphQL useUserStats hook for scoring data (viral points, points balance, tier/rank)
 * KEPT: Uses Supabase for quest completions, badge count, last active
 * 
 * Data Flow:
 * - Scoring data: useUserStats hook → Apollo Client → Subsquid (50-100ms) → Contract fallback (300-500ms)
 * - Quest/Badge data: Passed via props from parent (Supabase)
 * 
 * Features:
 * - 6 stat cards in responsive grid (2 cols mobile, 3 cols desktop)
 * - Number formatting with commas (1,234)
 * - Tooltips for stat explanations
 * - Icons for each stat type
 * - Loading skeleton
 * - Error handling
 * 
 * Stats Displayed:
 * 1. Viral Points (GraphQL: stats.viralPoints)
 * 2. Quest Points (GraphQL: stats.questPoints)
 * 3. Quest Completions (Supabase: passed via props)
 * 4. Badge Count (Supabase: passed via props)
 * 5. Global Rank (GraphQL: stats.rankTier)
 * 6. Streak (GraphQL: stats.currentStreak)
 * 
 * @module components/profile/ProfileStats
 */

import { useUserStats } from '@/hooks/useUserStats'
import type { Address } from 'viem'
import { formatLastActive } from '@/lib/scoring/unified-calculator'

// Icons
import { TrendArrowUpIcon } from '@/components/icons/trend-arrow-up-icon'
import { TrendArrowDownIcon } from '@/components/icons/trend-arrow-down-icon'

interface ProfileStatsProps {
  address: Address
  questCompletions: number // From Supabase
  badgeCount: number // From Supabase
  lastActive?: string // From Supabase
}

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  change?: number // Positive or negative change percentage
  tooltip?: string
  colorClass?: string
}

function StatCard({ label, value, icon, change, tooltip, colorClass = 'text-primary' }: StatCardProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className={`w-10 h-10 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center ${colorClass}`}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {change >= 0 ? (
              <TrendArrowUpIcon className="w-3 h-3" />
            ) : (
              <TrendArrowDownIcon className="w-3 h-3" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {value}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400" title={tooltip}>
          {label}
        </p>
      </div>
    </div>
  )
}

// Tier names mapping
const TIER_NAMES = [
  'Iron', 'Bronze', 'Silver', 'Gold', 
  'Platinum', 'Diamond', 'Master', 'Grandmaster',
  'Challenger', 'Elite', 'Legend', 'Mythic'
]

export function ProfileStats({ address, questCompletions, badgeCount, lastActive }: ProfileStatsProps) {
  // Fetch scoring data from GraphQL
  const { stats, loading, error, source } = useUserStats(address, {
    variant: 'complete',
    enableFallback: true,
    pollInterval: 60000, // 60s polling
  })

  // Loading state
  if (loading) {
    return (
      <div className="bg-white dark:bg-[#0c1427] rounded-lg p-6 shadow-sm">
        <div className="mb-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error || !stats) {
    return (
      <div className="bg-white dark:bg-[#0c1427] rounded-lg p-6 shadow-sm">
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400 mb-2">Failed to load stats</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error?.message || 'Unable to fetch scoring data'}</p>
        </div>
      </div>
    )
  }

  // Calculate level progress
  const currentXP = Number(stats.xpIntoLevel)
  const nextLevelXP = Number(stats.xpToNextLevel)
  const levelPercent = nextLevelXP > 0 
    ? Math.min((currentXP / nextLevelXP) * 100, 100)
    : 100

  const tierName = TIER_NAMES[stats.rankTier] || 'Unknown'

  return (
    <div className="bg-white dark:bg-[#0c1427] rounded-lg p-6 shadow-sm">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            Profile Statistics
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400" title={source === 'subsquid' ? 'Data from Subsquid GraphQL' : 'Data from contract (fallback)'}>
            {source === 'subsquid' ? '⚡ Live' : '🔗 On-chain'}
          </span>
        </div>
        {lastActive && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last active {formatLastActive(lastActive)}
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Viral Points */}
        <StatCard
          label="Viral Points"
          value={Number(stats.viralPoints).toLocaleString()}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          }
          tooltip="Social engagement points from viral cast shares"
          colorClass="text-purple-600"
        />

        {/* Quest Points */}
        <StatCard
          label="Quest Points"
          value={Number(stats.questPoints).toLocaleString()}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
          tooltip="Points earned from quest completions and activities"
          colorClass="text-blue-600"
        />

        {/* Quest Completions (Supabase) */}
        <StatCard
          label="Quests"
          value={questCompletions.toLocaleString()}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" />
            </svg>
          }
          tooltip="Total quests completed"
          colorClass="text-green-600"
        />

        {/* Badge Count (Supabase) */}
        <StatCard
          label="Badges"
          value={badgeCount.toLocaleString()}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              <circle cx="12" cy="12" r="4" fill="white" />
            </svg>
          }
          tooltip="Non-transferable achievements earned"
          colorClass="text-yellow-600"
        />

        {/* Rank Tier */}
        <StatCard
          label="Rank Tier"
          value={tierName}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11V3H8V9H2V21H22V11H16ZM10 5H14V19H10V5ZM4 11H8V19H4V11ZM20 19H16V13H20V19Z" />
            </svg>
          }
          tooltip={`Tier ${stats.rankTier}/11 based on total score`}
          colorClass="text-orange-600"
        />

        {/* Streak */}
        <StatCard
          label="Day Streak"
          value={Number(stats.currentStreak || 0).toLocaleString()}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.66 8L12 2.35L6.34 8C4.78 9.56 4 11.64 4 13.64S4.78 17.73 6.34 19.29C7.9 20.85 9.95 21.58 12 21.58C14.05 21.58 16.1 20.85 17.66 19.29C19.22 17.73 20 15.64 20 13.64S19.22 9.56 17.66 8ZM12 19.59C10.6 19.59 9.25 19.04 8.23 18.02C7.21 17 6.66 15.65 6.66 14.25C6.66 12.85 7.21 11.5 8.23 10.48L12 6.7L15.77 10.48C16.79 11.5 17.34 12.85 17.34 14.25C17.34 15.65 16.79 17 15.77 18.02C14.75 19.04 13.4 19.59 12 19.59Z" />
            </svg>
          }
          tooltip="Consecutive days of daily activity"
          colorClass="text-red-600"
        />
      </div>

      {/* Level Progress Bar */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Level {stats.level}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {tierName}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {(nextLevelXP - currentXP).toLocaleString()} XP to next level
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${levelPercent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
          {levelPercent.toFixed(1)}% to Level {stats.level + 1}
        </p>
      </div>

      {/* Total Score Display */}
      <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Total Score
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {Number(stats.totalScore).toLocaleString()}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Auto-calculated from all on-chain activities
        </p>
      </div>
    </div>
  )
}