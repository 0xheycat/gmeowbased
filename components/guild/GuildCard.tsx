/**
 * GuildCard Component
 * 
 * Purpose: Reusable card for displaying guild information
 * Template: trezoadmin-41/cards (40%) + gmeowbased0.6 layout (10%)
 * 
 * Features:
 * - Guild avatar/banner
 * - Name, member count, treasury
 * - Level badge with progress bar
 * - Click handler for navigation
 * - Responsive design
 * 
 * Usage:
 * <GuildCard guild={guildData} onClick={(id) => ...} />
 */

'use client'

import { UsersIcon, MonetizationOnIcon, TrendingUpIcon } from '@/components/icons'

export interface Guild {
  id: string
  name: string
  description: string
  chain: 'base'
  memberCount: number
  treasury: number
  level: number
  xp: number
  owner: string
  avatarUrl?: string
}

export interface GuildCardProps {
  /** Guild data to display */
  guild: Guild
  /** Callback when card is clicked */
  onClick?: (guildId: string) => void
  /** Custom CSS class */
  className?: string
}

/**
 * Calculate level progress (0-100%)
 */
export function getLevelProgress(level: number, xp: number): number {
  // XP required for next level: level * 1000
  const xpRequired = level * 1000
  const xpForCurrentLevel = (level - 1) * 1000
  const xpInCurrentLevel = xp - xpForCurrentLevel
  
  if (xpInCurrentLevel <= 0) return 0
  if (xpInCurrentLevel >= xpRequired) return 100
  
  return Math.floor((xpInCurrentLevel / (xpRequired - xpForCurrentLevel)) * 100)
}

/**
 * Get level badge color
 */
export function getLevelColor(level: number): string {
  if (level >= 10) return 'from-purple-500 to-pink-600' // Legendary
  if (level >= 7) return 'from-blue-500 to-cyan-600' // Epic
  if (level >= 4) return 'from-green-500 to-emerald-600' // Rare
  return 'from-gray-400 to-gray-600' // Common
}

export function GuildCard({ guild, onClick, className = '' }: GuildCardProps) {
  const progress = getLevelProgress(guild.level, guild.xp)
  const levelColor = getLevelColor(guild.level)

  const handleClick = () => {
    if (onClick) {
      onClick(guild.id)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      role="button"
      tabIndex={0}
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
    >
      {/* Header with Avatar & Level */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          {/* Avatar */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
            {guild.name.charAt(0).toUpperCase()}
          </div>

          {/* Level Badge */}
          <div className={`px-3 py-1 bg-gradient-to-r ${levelColor} text-white text-sm font-bold rounded-full`}>
            LV {guild.level}
          </div>
        </div>

        {/* Guild Name */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 truncate">
          {guild.name}
        </h3>

        {/* Chain Badge */}
        <span className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
          {guild.chain.toUpperCase()}
        </span>
      </div>

      {/* Level Progress Bar */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Progress to Level {guild.level + 1}
          </span>
          <span className="text-xs font-semibold text-gray-900 dark:text-white">
            {progress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${levelColor} transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Description */}
      <div className="px-6 pb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {guild.description}
        </p>
      </div>

      {/* Stats */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Members */}
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {guild.memberCount}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Members
              </div>
            </div>
          </div>

          {/* Treasury */}
          <div className="flex items-center gap-2">
            <MonetizationOnIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {guild.treasury.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Points
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GuildCard
