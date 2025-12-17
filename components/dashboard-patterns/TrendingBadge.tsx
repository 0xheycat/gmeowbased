/**
 * Trending Badge - Professional Pattern Component
 * 
 * Inspired by Twitter/X "Trending" and GitHub "Hot" indicators
 * 
 * Template: 10-40% adaptation from Twitter trending UI
 * Pattern: Real-time activity indicator with pulse animation
 * 
 * Usage:
 * - <TrendingBadge variant="hot" /> - Red pulse, urgent activity
 * - <TrendingBadge variant="rising" /> - Orange, gaining traction
 * - <TrendingBadge variant="new" /> - Blue, recently trending
 */

import { cn } from '@/lib/utils/utils'

interface TrendingBadgeProps {
  variant: 'hot' | 'rising' | 'new'
  className?: string
}

export function TrendingBadge({ variant, className }: TrendingBadgeProps) {
  const variants = {
    hot: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-400',
      pulse: 'animate-pulse',
      label: 'HOT',
    },
    rising: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      text: 'text-orange-700 dark:text-orange-400',
      pulse: '', // No pulse for rising
      label: 'RISING',
    },
    new: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-400',
      pulse: '', // No pulse for new
      label: 'NEW',
    },
  }

  const config = variants[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide',
        config.bg,
        config.text,
        config.pulse,
        className
      )}
    >
      {/* Twitter-style dot indicator */}
      <span
        className={cn('w-1.5 h-1.5 rounded-full', {
          'bg-red-500': variant === 'hot',
          'bg-orange-500': variant === 'rising',
          'bg-blue-500': variant === 'new',
        })}
      />
      {config.label}
    </span>
  )
}
