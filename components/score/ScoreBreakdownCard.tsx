/**
 * ScoreBreakdownCard - On-Chain Score Display Component
 * 
 * Phase 3.2G (Jan 1, 2026) - Hybrid Architecture Migration
 * 
 * Features:
 * - ✅ GraphQL-first (Subsquid indexer, 50-100ms)
 * - ✅ Contract fallback (on GraphQL error, 300-500ms)
 * - ✅ Professional loading skeleton
 * - ✅ Error state with retry button
 * - ✅ Data source indicator
 * - Shows complete points breakdown (GM, Quest, Viral, Guild, Referral)
 * - Auto-refreshes every 60 seconds
 * - Displays tier badge with tier name
 * - Progress animations
 * 
 * @example
 * <ScoreBreakdownCard address="0x123..." />
 */

'use client'

import { useUserStats } from '@/hooks/useUserStats'

interface ScoreBreakdownCardProps {
  address?: `0x${string}`
  className?: string
}

interface PointRowProps {
  label: string
  value: number
  color: string
  icon: React.ReactNode
}

function PointRow({ label, value, color, icon }: PointRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-white`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      </div>
      <span className="text-lg font-bold text-gray-900 dark:text-white">
        {value.toLocaleString()}
      </span>
    </div>
  )
}

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

export function ScoreBreakdownCard({ address, className = '' }: ScoreBreakdownCardProps) {
  const { stats, loading, error, refetch, source } = useUserStats(address, { 
    variant: 'complete',
    enableFallback: true 
  })

  const tier = stats?.rankTier ?? null
  const tierName = tier !== null ? TIER_NAMES[tier] : null

  if (!address) {
    return (
      <div className={`bg-white dark:bg-[#0c1427] rounded-lg p-6 shadow-sm ${className}`}>
        <p className="text-center text-gray-500 dark:text-gray-400">
          Connect wallet to view scores
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-[#0c1427] rounded-lg p-6 shadow-sm ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className={`bg-white dark:bg-[#0c1427] rounded-lg p-6 shadow-sm ${className}`}>
        <div className="text-center space-y-4">
          <div className="text-red-600 dark:text-red-400">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-medium mb-2">
              {error?.message || 'Failed to load scores'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Both GraphQL and contract reads failed
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-[#0c1427] rounded-lg p-6 shadow-sm ${className}`}>
      {/* Header with Total Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Score Breakdown
            </h2>
            {source && (
              <span 
                className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                title={source === 'subsquid' ? 'Data from GraphQL (fast)' : 'Data from contract (fallback)'}
              >
                {source === 'subsquid' ? '⚡ GraphQL' : '🔗 Contract'}
              </span>
            )}
          </div>
          {tierName && (
            <div className={`px-3 py-1 rounded-full text-xs font-medium tier-${tier} bg-gradient-to-r from-blue-500 to-purple-500 text-white`}>
              {tierName}
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {Number(stats.totalScore).toLocaleString()}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            total points
          </span>
        </div>
      </div>

      {/* Points Breakdown */}
      <div className="space-y-1">
        <PointRow
          label="GM Rewards"
          value={Number(stats.gmPoints)}
          color="bg-blue-600"
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          }
        />

        <PointRow
          label="Quest Points"
          value={Number(stats.questPoints)}
          color="bg-green-600"
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" />
            </svg>
          }
        />

        <PointRow
          label="Viral Points"
          value={Number(stats.viralPoints)}
          color="bg-purple-600"
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 16.08C17.24 16.08 16.56 16.38 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12S8.96 11.53 8.91 11.3L15.96 7.19C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5S19.66 2 18 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.81C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12S4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.19L15.16 18.34C15.11 18.55 15.08 18.77 15.08 19C15.08 20.61 16.39 21.92 18 21.92S20.92 20.61 20.92 19 19.61 16.08 18 16.08Z" />
            </svg>
          }
        />

        <PointRow
          label="Guild Points"
          value={Number(stats.guildPoints)}
          color="bg-orange-600"
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11C17.66 11 18.99 9.66 18.99 8S17.66 5 16 5 13.01 6.34 13.01 8 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8S9.66 5 8 5 5.01 6.34 5.01 8 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" />
            </svg>
          }
        />

        <PointRow
          label="Referral Points"
          value={Number(stats.referralPoints)}
          color="bg-pink-600"
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15 12C17.21 12 19 10.21 19 8S17.21 4 15 4 11 5.79 11 8 12.79 12 15 12ZM6 10V7H4V10H1V12H4V15H6V12H9V10H6ZM15 14C12.33 14 7 15.34 7 18V20H23V18C23 15.34 17.67 14 15 14Z" />
            </svg>
          }
        />
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Data refreshed from on-chain every 60 seconds
        </p>
      </div>
    </div>
  )
}
