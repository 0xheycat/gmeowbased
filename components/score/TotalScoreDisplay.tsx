/**
 * TotalScoreDisplay - Lightweight Total Score Component
 * 
 * Phase 3.2G (Jan 1, 2026) - Hybrid Architecture Migration
 * 
 * Features:
 * - ✅ GraphQL-first (Subsquid indexer, 50-100ms)
 * - ✅ Contract fallback (on GraphQL error, 300-500ms)
 * - ✅ Professional loading skeleton
 * - ✅ Error state with data source indicator
 * - Perfect for leaderboards, simple displays
 * - Auto-refreshes every 60 seconds
 * - Compact, reusable design
 * 
 * @example
 * <TotalScoreDisplay address="0x123..." size="sm" />
 */

'use client'

import { useUserStats } from '@/hooks/useUserStats'

interface TotalScoreDisplayProps {
  address?: `0x${string}`
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function TotalScoreDisplay({ 
  address, 
  size = 'md',
  showLabel = true,
  className = '' 
}: TotalScoreDisplayProps) {
  const { stats, loading, error, source } = useUserStats(address, { 
    variant: 'scoring',
    enableFallback: true 
  })

  const totalScore = stats ? Number(stats.totalScore) : null

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  }

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  if (!address) {
    return (
      <div className={className}>
        <span className="text-gray-400 dark:text-gray-600">--</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={className}>
        <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-6 w-20`}></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-baseline gap-2 ${className}`}>
        <span className="text-red-600 dark:text-red-400 text-sm">Error loading score</span>
      </div>
    )
  }

  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className={`font-bold text-gray-900 dark:text-white ${sizeClasses[size]}`}>
        {totalScore?.toLocaleString() || '0'}
      </span>
      {showLabel && (
        <span className={`text-gray-500 dark:text-gray-400 ${labelSizeClasses[size]}`}>
          points
          {source && (
            <span className="ml-1 text-xs opacity-50" title={source === 'subsquid' ? 'GraphQL (fast)' : 'Contract (fallback)'}>
              {source === 'subsquid' ? '⚡' : '🔗'}
            </span>
          )}
        </span>
      )}
    </div>
  )
}
