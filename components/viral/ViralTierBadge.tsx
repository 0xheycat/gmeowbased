/**
 * Viral Tier Badge Component
 * 
 * Displays animated tier badges with tooltips showing thresholds.
 * 
 * Quality Gates Applied:
 * - GI-13: Accessible (ARIA labels, tooltips, focus states)
 * - GI-13: Mobile-responsive (min 44px touch targets)
 * - GI-11: Type-safe props with proper validation
 */

'use client'

import { type ViralTierConfig } from '@/lib/viral/viral-bonus'

type ViralTierBadgeProps = {
  tier: ViralTierConfig
  score: number
  showTooltip?: boolean
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'text-sm px-2 py-1 min-w-[44px]',
  md: 'text-base px-3 py-1.5 min-w-[60px]',
  lg: 'text-lg px-4 py-2 min-w-[80px]',
}

export function ViralTierBadge({
  tier,
  score,
  showTooltip = true,
  size = 'md',
  animated = true,
  className = '',
}: ViralTierBadgeProps) {
  const isActive = tier.name !== 'None'

  return (
    <div className="relative inline-block group">
      {/* GI-13: Accessible badge with ARIA label */}
      <div
        role="status"
        aria-label={`Viral tier: ${tier.name}, Score: ${score}`}
        className={`
          inline-flex items-center justify-center gap-2 rounded-full
          font-semibold transition-all duration-300
          ${sizeClasses[size]}
          ${animated && isActive ? 'hover:scale-105 hover:shadow-lg' : ''}
          ${isActive ? 'cursor-pointer' : 'opacity-50'}
          ${className}
        `}
        style={{
          backgroundColor: `${tier.color}20`,
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: tier.color,
          color: tier.color,
        }}
      >
        {/* Tier Emoji */}
        {tier.emoji && (
          <span className="text-lg" aria-hidden="true">
            {tier.emoji}
          </span>
        )}

        {/* Tier Name */}
        <span className="font-bold tracking-tight">{tier.name}</span>

        {/* Animated Glow Effect (GI-13: GPU-accelerated) */}
        {animated && isActive && (
          <span
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-md"
            style={{ backgroundColor: tier.color }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* GI-13: Accessible Tooltip */}
      {showTooltip && isActive && (
        <div
          role="tooltip"
          className="
            absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
            px-3 py-2 rounded-lg text-sm font-medium
            bg-gray-900 text-white dark:text-white shadow-xl
            opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
            transition-opacity duration-200 pointer-events-none
            whitespace-nowrap
          "
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Score:</span>
              <span className="font-bold">{score}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Threshold:</span>
              <span className="font-bold">{tier.minScore}+</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">XP Bonus:</span>
              <span className="font-bold">+{tier.xp} XP</span>
            </div>
          </div>

          {/* Tooltip Arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px"
            aria-hidden="true"
          >
            <div className="w-3 h-3 rotate-45 bg-gray-900 tooltip-arrow" />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Viral Tier Progress Indicator
 * 
 * Shows progress to next tier with visual feedback
 * GI-13: Accessible with ARIA live region
 */
type ViralTierProgressProps = {
  currentScore: number
  currentTier: ViralTierConfig
  nextTier: ViralTierConfig | null
  className?: string
}

export function ViralTierProgress({
  currentScore,
  currentTier,
  nextTier,
  className = '',
}: ViralTierProgressProps) {
  if (!nextTier) {
    // Max tier reached
    return (
      <div
        className={`text-center py-4 ${className}`}
        role="status"
        aria-label="Maximum viral tier reached"
      >
        <div className="text-2xl mb-2">🏆</div>
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Maximum Tier Reached!
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          You&apos;re at the top! Keep up the viral content.
        </div>
      </div>
    )
  }

  const scoreNeeded = nextTier.minScore - currentScore
  const progress = Math.min(
    100,
    ((currentScore - currentTier.minScore) / (nextTier.minScore - currentTier.minScore)) * 100
  )

  return (
    <div
      className={`space-y-3 ${className}`}
      role="status"
      aria-label={`${scoreNeeded} points needed to reach ${nextTier.name}`}
      aria-live="polite"
    >
      {/* Current and Next Tier Badges */}
      <div className="flex items-center justify-between gap-4">
        <ViralTierBadge
          tier={currentTier}
          score={currentScore}
          size="sm"
          showTooltip={false}
        />
        <div className="flex-1 text-center text-xs text-gray-500 dark:text-gray-400">
          {scoreNeeded} points to next tier
        </div>
        <ViralTierBadge tier={nextTier} score={nextTier.minScore} size="sm" showTooltip={false} />
      </div>

      {/* Progress Bar (GI-13: WCAG AA+ contrast) */}
      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: nextTier.color,
          }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />

        {/* Animated Shimmer Effect (GI-13: prefers-reduced-motion) */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(90deg, transparent, white, transparent)`,
            animation: 'shimmer 2s infinite',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Score Display */}
      <div className="text-center text-xs font-medium text-gray-600 dark:text-gray-400">
        <span className="font-bold text-gray-900 dark:text-gray-100">{currentScore}</span>
        {' / '}
        <span>{nextTier.minScore}</span>
        {' '}
        <span className="text-gray-500 dark:text-gray-400">({Math.round(progress)}%)</span>
      </div>

      {/* GI-13: CSS Animation with prefers-reduced-motion support */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [style*='animation'] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
