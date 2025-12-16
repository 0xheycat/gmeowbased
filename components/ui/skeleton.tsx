/**
 * Skeleton Component
 * 
 * Professional loading placeholder with wave animation
 * Adapted from Music Admin Template (20% adaptation)
 * 
 * Features:
 * - Wave animation (1.5s, GPU-optimized)
 * - Multiple variants (text, rect, avatar, circle)
 * - Accessibility attributes (aria-busy, aria-live)
 * - Dark mode support
 * - Respect prefers-reduced-motion
 * 
 * @source Music Admin Template (DataTable skeleton)
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variant of skeleton
   * - text: Single line of text
   * - rect: Rectangular block
   * - avatar: Circular avatar
   * - circle: Small circular element
   */
  variant?: 'text' | 'rect' | 'avatar' | 'circle'
  
  /**
   * Animation style
   * - wave: Shimmer wave effect (default)
   * - pulse: Pulse opacity
   * - none: No animation
   */
  animation?: 'wave' | 'pulse' | 'none'
  
  /**
   * Number of skeleton items to render (for text variant)
   */
  count?: number
}

function Skeleton({
  className,
  variant = 'rect',
  animation = 'wave',
  count = 1,
  ...props
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-800'
  
  const variantClasses = {
    text: 'h-4 rounded',
    rect: 'rounded-lg',
    avatar: 'h-10 w-10 rounded-full',
    circle: 'h-8 w-8 rounded-full',
  }
  
  const animationClasses = {
    wave: 'skeleton-wave',
    pulse: 'animate-pulse',
    none: '',
  }
  
  const skeletonClasses = cn(
    baseClasses,
    variantClasses[variant],
    animationClasses[animation],
    className
  )
  
  if (count > 1 && variant === 'text') {
    return (
      <div className="space-y-2" aria-busy="true" aria-live="polite" {...props}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={skeletonClasses} />
        ))}
      </div>
    )
  }
  
  return (
    <div 
      className={skeletonClasses} 
      aria-busy="true" 
      aria-live="polite"
      {...props} 
    />
  )
}

/**
 * NotificationSkeleton - Specialized skeleton for notification cards
 */
function NotificationSkeleton() {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton variant="circle" className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-full" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </div>
    </div>
  )
}

/**
 * NotificationListSkeleton - Multiple notification cards
 */
function NotificationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </div>
  )
}

export { Skeleton, NotificationSkeleton, NotificationListSkeleton }
