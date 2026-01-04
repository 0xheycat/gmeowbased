/**
 * TierBadge - User Tier Display Component
 * 
 * Phase 3.2G (Jan 1, 2026) - Hybrid Architecture Migration
 * 
 * Features:
 * - ✅ GraphQL-first (Subsquid indexer)
 * - ✅ Contract fallback (on GraphQL error)
 * - ✅ Professional loading skeleton
 * - ✅ Error state with retry
 * - Displays tier number and name
 * - Color-coded by tier level
 * - Perfect for profile headers, cards
 * 
 * @example
 * <TierBadge address="0x123..." variant="full" />
 */

'use client'

import { useUserStats } from '@/hooks/useUserStats'

interface TierBadgeProps {
  address?: `0x${string}`
  variant?: 'compact' | 'full'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Tier colors (12-tier system)
const TIER_COLORS = [
  'from-gray-400 to-gray-500',      // 0: Signal Kitten
  'from-blue-400 to-blue-500',      // 1: Quantum Tabby
  'from-cyan-400 to-cyan-500',      // 2: Cosmic Cat
  'from-green-400 to-green-500',    // 3: Galactic Kitty
  'from-yellow-400 to-yellow-500',  // 4: Nebula Lynx
  'from-orange-400 to-orange-500',  // 5: Stellar Panther
  'from-red-400 to-red-500',        // 6: Constellation Tiger
  'from-pink-400 to-pink-500',      // 7: Void Walker
  'from-purple-400 to-purple-500',  // 8: Dimensional Prowler
  'from-indigo-400 to-indigo-500',  // 9: Ethereal Predator
  'from-violet-400 to-violet-500',  // 10: Celestial Guardian
  'from-fuchsia-400 to-fuchsia-500', // 11: Omniversal Being
]

// Tier names (12-tier system)
const TIER_NAMES = [
  'Signal Kitten',        // 0
  'Quantum Tabby',        // 1
  'Cosmic Cat',           // 2
  'Galactic Kitty',       // 3
  'Nebula Lynx',          // 4
  'Stellar Panther',      // 5
  'Constellation Tiger',  // 6
  'Void Walker',          // 7
  'Dimensional Prowler',  // 8
  'Ethereal Predator',    // 9
  'Celestial Guardian',   // 10
  'Omniversal Being',     // 11
]

export function TierBadge({ 
  address, 
  variant = 'full',
  size = 'md',
  className = '' 
}: TierBadgeProps) {
  const { stats, loading, error, source } = useUserStats(address, { 
    variant: 'scoring',
    enableFallback: true 
  })

  const tier = stats?.rankTier ?? null
  const tierName = tier !== null ? TIER_NAMES[tier] : null

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  if (!address) {
    return null
  }

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full ${sizeClasses[size]} ${className}`}>
        <span className="opacity-0">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-full ${sizeClasses[size]} ${className}`}>
        <span className="text-red-700 dark:text-red-400 text-xs">Error</span>
      </div>
    )
  }

  if (tier === null || tierName === null) {
    return (
      <div className={`bg-gray-200 dark:bg-gray-700 rounded-full ${sizeClasses[size]} ${className}`}>
        <span className="text-gray-500 dark:text-gray-400">No Tier</span>
      </div>
    )
  }

  const tierColor = TIER_COLORS[tier] || TIER_COLORS[0]

  return (
    <div 
      className={`
        bg-gradient-to-r ${tierColor} 
        rounded-full ${sizeClasses[size]} 
        font-medium text-white
        shadow-sm
        ${className}
      `}
    >
      {variant === 'compact' ? (
        <span>Tier {tier}</span>
      ) : (
        <span>{tierName}</span>
      )}
    </div>
  )
}
