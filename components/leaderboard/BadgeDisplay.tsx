/**
 * BadgeDisplay Component
 * Displays earned badges in leaderboard with tooltips
 * Shows up to 5 most recent badges per pilot
 * NO EMOJIS - Uses badge icons only
 */

'use client'

import React from 'react'
import Link from 'next/link'

// Badge tier colors (matching badge registry)
const TIER_COLORS = {
  common: '#D3D7DC',
  rare: '#A18CFF',
  epic: '#61DFFF',
  legendary: '#FFD966',
  mythic: '#9C27FF',
} as const

export interface BadgeData {
  id: number
  badgeId: string
  badgeType: string
  tier: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
  assignedAt: string
  metadata?: {
    name?: string
    description?: string
    imageUrl?: string
  }
}

interface BadgeDisplayProps {
  badges: BadgeData[]
  maxDisplay?: number
  fid: number
  className?: string
}

export function BadgeDisplay({ 
  badges, 
  maxDisplay = 5, 
  fid,
  className = '' 
}: BadgeDisplayProps) {
  // Show only most recent badges
  const displayBadges = badges.slice(0, maxDisplay)
  const remainingCount = Math.max(0, badges.length - maxDisplay)

  if (badges.length === 0) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <span className="text-xs text-gray-500 dark:text-gray-400">No badges</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {displayBadges.map((badge) => (
        <div
          key={badge.id}
          className="relative group"
        >
          {/* Badge Icon Circle */}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 cursor-help"
            style={{
              backgroundColor: TIER_COLORS[badge.tier] + '40', // 40 = 25% opacity
              borderWidth: '2px',
              borderColor: TIER_COLORS[badge.tier],
            }}
            aria-label={`${badge.metadata?.name || badge.badgeType} badge`}
          >
            {/* Badge Image or Tier Initial */}
            {badge.metadata?.imageUrl ? (
              <img
                src={badge.metadata.imageUrl}
                alt=""
                className="w-4 h-4 rounded-full object-cover"
              />
            ) : (
              <span
                className="text-[10px] font-bold uppercase"
                style={{ color: TIER_COLORS[badge.tier] }}
              >
                {badge.tier[0]}
              </span>
            )}
          </div>
          
          {/* Tooltip - appears on hover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 w-max max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-semibold">
                {badge.metadata?.name || badge.badgeType}
              </p>
              <p className="text-gray-300 dark:text-gray-400 capitalize">
                {badge.tier} Tier
              </p>
              {badge.metadata?.description && (
                <p className="text-gray-400 dark:text-gray-500 line-clamp-2">
                  {badge.metadata.description}
                </p>
              )}
              <p className="text-gray-500 dark:text-gray-600">
                Earned: {new Date(badge.assignedAt).toLocaleDateString()}
              </p>
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
          </div>
        </div>
      ))}

      {/* Remaining Badges Count */}
      {remainingCount > 0 && (
        <div className="relative group">
          <Link
            href={`/profile/${fid}#badges`}
            className="w-6 h-6 rounded-full bg-gray-700/50 dark:bg-gray-800/50 border border-gray-600 dark:border-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-300 dark:text-gray-400 hover:bg-gray-600/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
            aria-label={`View ${remainingCount} more badges`}
          >
            +{remainingCount}
          </Link>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
            <p className="text-xs">
              View all {badges.length} badges in profile
            </p>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Skeleton loader for badge display
 */
export function BadgeDisplaySkeleton({ count = 5, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-6 h-6 rounded-full bg-gray-700/30 dark:bg-gray-800/30 animate-pulse"
        />
      ))}
    </div>
  )
}
