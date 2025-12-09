/**
 * Context Badge - Professional Pattern Component
 * 
 * Inspired by LinkedIn "Popular in your network" and Twitter context labels
 * 
 * Template: 10-40% adaptation from LinkedIn relevance indicators
 * Pattern: Subtle gray badge with social context ("Popular", "Trending near you")
 * 
 * Usage:
 * - <ContextBadge>Popular in your guilds</ContextBadge>
 * - <ContextBadge># of mentions on Base</ContextBadge>
 * - <ContextBadge>Trending in DeFi</ContextBadge>
 */

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface ContextBadgeProps {
  children: ReactNode
  className?: string
}

export function ContextBadge({ children, className }: ContextBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium',
        'bg-gray-100 dark:bg-gray-800',
        'text-gray-600 dark:text-gray-400',
        'border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {children}
    </span>
  )
}
