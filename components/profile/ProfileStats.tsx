'use client'

/**
 * ProfileStats Component
 * 
 * Template Strategy: trezoadmin-41/MyProfile/ProfileIntro.tsx (stats section)
 * Adaptation: 25%
 * Platform Reference: LinkedIn profile stats
 * 
 * Features:
 * - 6 stat cards in responsive grid (2 cols mobile, 3 cols desktop)
 * - Number formatting with commas (1,234)
 * - Animated counters (optional)
 * - Tooltips for stat explanations
 * - Icons for each stat type
 * 
 * Stats Displayed:
 * 1. Viral Points (user_points_balances.viral_points) - renamed from viral_xp
 * 2. Points Balance (user_points_balances.points_balance) - renamed from base_points
 * 3. Quest Completions (count from quest_completions)
 * 4. Badge Count (count from user_badges)
 * 5. Global Rank (points_leaderboard.rank)
 * 6. Streak (Subsquid UserOnChainStats.currentStreak)
 * 
 * @module components/profile/ProfileStats
 */

import type { ProfileStats as ProfileStatsType } from '@/lib/profile/types'
import { calculateStats, formatLastActive } from '@/lib/scoring/unified-calculator'

// Icons from components/icons
import { TrendArrowUpIcon } from '@/components/icons/trend-arrow-up-icon'
import { TrendArrowDownIcon } from '@/components/icons/trend-arrow-down-icon'

interface ProfileStatsProps {
  stats: ProfileStatsType
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

export function ProfileStats({ stats }: ProfileStatsProps) {
  // Calculate formatted stats and level info
  const calculatedStats = calculateStats(stats)

  return (
    <div className="bg-white dark:bg-[#0c1427] rounded-lg p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
          Profile Statistics
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Last active {formatLastActive(stats.last_active)}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Viral Points */}
        <StatCard
          label="Viral Points"
          value={calculatedStats.formattedStats.viral_points}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          }
          tooltip="Social engagement points from viral cast shares"
          colorClass="text-purple-600"
        />

        {/* Points Balance */}
        <StatCard
          label="Points Balance"
          value={calculatedStats.formattedStats.points_balance}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
          tooltip="Spendable points from quest completions and activities"
          colorClass="text-blue-600"
        />

        {/* Quest Completions */}
        <StatCard
          label="Quests"
          value={calculatedStats.formattedStats.quest_completions}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" />
            </svg>
          }
          tooltip="Total quests completed"
          colorClass="text-green-600"
        />

        {/* Badge Count */}
        <StatCard
          label="Badges"
          value={calculatedStats.formattedStats.badge_count}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              <circle cx="12" cy="12" r="4" fill="white" />
            </svg>
          }
          tooltip="Non-transferable achievements earned"
          colorClass="text-yellow-600"
        />

        {/* Global Rank */}
        <StatCard
          label="Global Rank"
          value={(stats.global_rank && stats.global_rank > 0) ? `#${stats.global_rank.toLocaleString()}` : 'Unranked'}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11V3H8V9H2V21H22V11H16ZM10 5H14V19H10V5ZM4 11H8V19H4V11ZM20 19H16V13H20V19Z" />
            </svg>
          }
          tooltip="Position on global leaderboard by total score"
          colorClass="text-orange-600"
        />

        {/* Streak */}
        <StatCard
          label="Day Streak"
          value={calculatedStats.streak}
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
              Level {calculatedStats.level}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {calculatedStats.rankTier}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {calculatedStats.xpToNextLevel.toLocaleString()} XP to next level
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${calculatedStats.levelPercent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
          {calculatedStats.levelPercent.toFixed(1)}% to Level {calculatedStats.level + 1}
        </p>
      </div>

      {/* Total Score Display */}
      <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Total Score
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {calculatedStats.formattedStats.total_score}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Auto-calculated from all activities
        </p>
      </div>
    </div>
  )
}
