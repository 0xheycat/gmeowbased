/**
 * Activity Indicator - Professional Pattern Component
 * 
 * Inspired by GitHub "unread" blue dot and LinkedIn activity indicators
 * 
 * Template: 10-40% adaptation from GitHub notification UI
 * Pattern: Subtle blue dot with optional pulse for real-time activity
 * 
 * Usage:
 * - <ActivityIndicator pulse /> - Active, real-time activity
 * - <ActivityIndicator /> - Recent activity (no pulse)
 * - <ActivityIndicator size="sm" /> - Smaller variant for compact layouts
 */

import { cn } from '@/lib/utils/utils'

interface ActivityIndicatorProps {
  pulse?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function ActivityIndicator({ 
  pulse = false, 
  size = 'md',
  className 
}: ActivityIndicatorProps) {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  }

  return (
    <span
      className={cn(
        'inline-block rounded-full bg-blue-500',
        sizes[size],
        pulse && 'animate-pulse',
        className
      )}
      aria-label="Activity indicator"
    />
  )
}
