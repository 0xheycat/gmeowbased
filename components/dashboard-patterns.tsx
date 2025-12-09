'use client'

/**
 * Dashboard UI Pattern Components
 * Reusable components for professional dashboard patterns
 * - Twitter-style trending badges
 * - GitHub-style activity indicators
 * - LinkedIn-style context badges
 */

import type { ReactNode } from 'react'

// Twitter-style Trending Badge
export function TrendingBadge({ variant }: { variant: 'hot' | 'rising' | 'new' }) {
  const styles = {
    hot: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    rising: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    new: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  }

  const labels = {
    hot: '🔥 Hot',
    rising: '📈 Rising',
    new: '✨ New',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {labels[variant]}
    </span>
  )
}

// GitHub-style Activity Indicator
export function ActivityIndicator({ 
  pulse = false, 
  size = 'md' 
}: { 
  pulse?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  }

  return (
    <div className="relative inline-flex items-center">
      <span className={`${sizeClasses[size]} bg-green-500 rounded-full ${pulse ? 'animate-pulse' : ''}`} />
      {pulse && (
        <span className={`absolute ${sizeClasses[size]} bg-green-400 rounded-full animate-ping opacity-75`} />
      )}
    </div>
  )
}

// LinkedIn-style Context Badge
export function ContextBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
      {children}
    </span>
  )
}

// Stat Card Pattern (for quick stats display)
export function StatCard({
  label,
  value,
  icon,
  trend,
}: {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: { value: number; label: string }
}) {
  const trendColor = trend && trend.value >= 0 ? 'text-green-600' : 'text-red-600'
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {trend && (
        <div className={`text-xs font-medium ${trendColor} mt-1`}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
        </div>
      )}
    </div>
  )
}
