'use client'

/**
 * Statistics Card Component
 * 
 * Displays community leaderboard statistics:
 * - Total Pilots count
 * - Average Score
 * - Top 1% Threshold
 * - Top 10% Threshold
 * - Your Rank (if logged in)
 * - Your Percentile
 * 
 * NO EMOJIS - Icons only from components/icons
 */

import { motion } from 'framer-motion'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import BoltIcon from '@mui/icons-material/Bolt'
import StarIcon from '@mui/icons-material/Star'
import PersonIcon from '@mui/icons-material/Person'

export interface LeaderboardStats {
  totalPilots: number
  averageScore: number
  top1PercentThreshold: number
  top10PercentThreshold: number
  yourRank?: number
  yourPercentile?: number
}

interface StatsCardProps {
  stats?: LeaderboardStats
  isLoading?: boolean
  className?: string
}

export function StatsCard({ stats, isLoading = false, className = '' }: StatsCardProps) {
  if (isLoading || !stats) {
    return (
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-dark-bg-elevated"
          >
            <div className="mb-2 h-5 w-24 rounded bg-gray-300 dark:bg-gray-600" />
            <div className="h-8 w-32 rounded bg-gray-300 dark:bg-gray-600" />
          </div>
        ))}
      </div>
    )
  }

  const statItems = [
    {
      label: 'Total Pilots',
      value: stats.totalPilots.toLocaleString(),
      icon: PersonIcon,
      color: 'text-brand',
    },
    {
      label: 'Average Score',
      value: Math.round(stats.averageScore).toLocaleString(),
      icon: BoltIcon,
      color: 'text-accent-green',
    },
    {
      label: 'Top 1% Score',
      value: Math.round(stats.top1PercentThreshold).toLocaleString(),
      icon: EmojiEventsIcon,
      color: 'text-gold',
    },
    {
      label: 'Top 10% Score',
      value: Math.round(stats.top10PercentThreshold).toLocaleString(),
      icon: StarIcon,
      color: 'text-brand',
    },
  ]

  // Add user stats if available
  if (stats.yourRank !== undefined) {
    statItems.push({
      label: 'Your Rank',
      value: `#${stats.yourRank.toLocaleString()}`,
      icon: StarIcon,
      color: 'text-brand',
    })
  }

  if (stats.yourPercentile !== undefined) {
    statItems.push({
      label: 'Your Percentile',
      value: `Top ${stats.yourPercentile.toFixed(1)}%`,
      icon: EmojiEventsIcon,
      color: 'text-gold',
    })
  }

  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-${statItems.length > 4 ? '3' : '4'} ${className}`}>
      {statItems.map((item, index) => {
        const Icon = item.icon
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="group rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:border-brand/50 hover:shadow-md dark:border-gray-700 dark:bg-dark-bg-elevated dark:hover:border-brand/50"
          >
            <div className="mb-2 flex items-center gap-2">
              <Icon className={`h-5 w-5 ${item.color}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {item.label}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {item.value}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
