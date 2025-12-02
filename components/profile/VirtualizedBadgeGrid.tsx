'use client'

import { useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import Image from 'next/image'
import { CHAIN_LABEL } from '@/lib/gmeow-utils'
import type { ProfileBadge } from '@/lib/profile-types'

const BADGE_HEIGHT = 80 // Height per badge card in pixels
const BADGES_PER_ROW_MOBILE = 1
const BADGES_PER_ROW_TABLET = 2
const BADGES_PER_ROW_DESKTOP = 3

interface VirtualizedBadgeGridProps {
  badges: ProfileBadge[]
  maxPreview?: number
  breakpoint?: 'mobile' | 'tablet' | 'desktop'
}

export function VirtualizedBadgeGrid({ 
  badges, 
  maxPreview, 
  breakpoint = 'desktop' 
}: VirtualizedBadgeGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  // Determine badges per row based on breakpoint
  const badgesPerRow = useMemo(() => {
    switch (breakpoint) {
      case 'mobile':
        return BADGES_PER_ROW_MOBILE
      case 'tablet':
        return BADGES_PER_ROW_TABLET
      case 'desktop':
        return BADGES_PER_ROW_DESKTOP
      default:
        return BADGES_PER_ROW_DESKTOP
    }
  }, [breakpoint])

  // Calculate rows needed
  const displayBadges = useMemo(
    () => maxPreview ? badges.slice(0, maxPreview) : badges,
    [badges, maxPreview]
  )

  const rowCount = useMemo(
    () => Math.ceil(displayBadges.length / badgesPerRow),
    [displayBadges.length, badgesPerRow]
  )

  // Create virtualizer only if we have many badges
  const shouldVirtualize = displayBadges.length > 20

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => BADGE_HEIGHT,
    overscan: 2,
    enabled: shouldVirtualize,
  })

  // Render without virtualization for small lists
  if (!shouldVirtualize) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {displayBadges.map((badge) => (
          <BadgeCard key={`${badge.chain}-${badge.badgeId}`} badge={badge} />
        ))}
      </div>
    )
  }

  // Render with virtualization for large lists
  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className="relative overflow-auto badge-grid-container"
    >
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualItems.map((virtualRow) => {
          const startIndex = virtualRow.index * badgesPerRow
          const rowBadges = displayBadges.slice(startIndex, startIndex + badgesPerRow)

          return (
            <div
              key={virtualRow.key}
              className="virtual-item"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 h-full">
                {rowBadges.map((badge) => (
                  <BadgeCard key={`${badge.chain}-${badge.badgeId}`} badge={badge} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Memoized badge card component
const BadgeCard = ({ badge }: { badge: ProfileBadge }) => {
  return (
    <div className="profile-badge-card">
      <div className="flex items-center gap-3">
        <div className="profile-badge-icon">
          {badge.image ? (
            <Image
              src={badge.image}
              alt={badge.name || `Badge #${badge.badgeId}`}
              width={48}
              height={48}
              className="h-full w-full object-cover"
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
              unoptimized
            />
          ) : (
            <span className="text-xs text-[var(--px-sub)]">#{badge.badgeId}</span>
          )}
        </div>
        <div>
          <div className="text-sm font-semibold">{badge.name || `Badge #${badge.badgeId}`}</div>
          <div className="text-xs text-[var(--px-sub)]">{CHAIN_LABEL[badge.chain]}</div>
        </div>
      </div>
    </div>
  )
}
