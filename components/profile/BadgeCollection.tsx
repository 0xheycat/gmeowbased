'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import clsx from 'clsx'
import { TrophyIcon } from '@/components/icons/trophy-icon'

// Badge tier type
export type BadgeTier = 'mythic' | 'legendary' | 'epic' | 'rare' | 'common'

// Badge data interface
export interface Badge {
  id: string
  badge_id: string
  name: string
  description?: string | null
  image_url: string
  tier: BadgeTier
  earned: boolean
  earned_at?: string | null
  requirements?: string | null
}

export interface BadgeCollectionProps {
  badges: Badge[]
  loading?: boolean
  className?: string
}

// Tier configurations (from lib/frame-design-system.ts + BadgeInventory.tsx)
const TIER_CONFIG: Record<BadgeTier, { color: string; label: string; glow: string }> = {
  mythic: {
    color: '#9C27FF',
    label: 'Mythic',
    glow: '0 0 20px rgba(156, 39, 255, 0.6), 0 0 40px rgba(156, 39, 255, 0.4)',
  },
  legendary: {
    color: '#FFD966',
    label: 'Legendary',
    glow: '0 0 20px rgba(255, 217, 102, 0.6), 0 0 40px rgba(255, 217, 102, 0.4)',
  },
  epic: {
    color: '#61DFFF',
    label: 'Epic',
    glow: '0 0 20px rgba(97, 223, 255, 0.6), 0 0 40px rgba(97, 223, 255, 0.4)',
  },
  rare: {
    color: '#A18CFF',
    label: 'Rare',
    glow: '0 0 20px rgba(161, 140, 255, 0.6), 0 0 40px rgba(161, 140, 255, 0.4)',
  },
  common: {
    color: '#D3D7DC',
    label: 'Common',
    glow: '0 0 20px rgba(211, 215, 220, 0.6), 0 0 40px rgba(211, 215, 220, 0.4)',
  },
}

/**
 * BadgeCollection Component
 * 
 * Professional badge gallery for profile pages
 * Template: gmeowbased0.6/nft-card.tsx + BadgeInventory.tsx patterns
 * Adaptation: 10% (minimal changes, proven badge display system)
 * 
 * Features:
 * - Badge grid (3 cols mobile, 4 cols desktop)
 * - Tier filtering (mythic, legendary, epic, rare, common)
 * - Locked badges (grayscale + requirements tooltip)
 * - Earned badges (full color + earned date)
 * - Total count display
 * - Hover effects with tier-based glow
 * 
 * @example
 * ```tsx
 * <BadgeCollection
 *   badges={userBadges}
 *   loading={loading}
 * />
 * ```
 */
export default function BadgeCollection({
  badges,
  loading = false,
  className,
}: BadgeCollectionProps) {
  const [selectedTier, setSelectedTier] = useState<BadgeTier | 'all'>('all')
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null)

  // Calculate stats
  const stats = useMemo(() => {
    const earned = badges.filter(b => b.earned).length
    const total = badges.length
    const tierCounts: Record<BadgeTier, number> = {
      mythic: 0,
      legendary: 0,
      epic: 0,
      rare: 0,
      common: 0,
    }

    badges.forEach(badge => {
      if (badge.earned) {
        tierCounts[badge.tier]++
      }
    })

    return { earned, total, tierCounts }
  }, [badges])

  // Filter badges by tier
  const filteredBadges = useMemo(() => {
    if (selectedTier === 'all') return badges
    return badges.filter(b => b.tier === selectedTier)
  }, [badges, selectedTier])

  // Loading skeleton
  if (loading) {
    return (
      <div className={clsx('space-y-6', className)}>
        {/* Stats skeleton */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-32 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-16 flex-1 rounded-lg bg-white/5 animate-pulse" />
        </div>
        {/* Badge grid skeleton */}
        <div className="grid gap-4 grid-cols-3 sm:grid-cols-4 lg:grid-cols-5">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (badges.length === 0) {
    return (
      <div className={clsx('flex flex-col items-center justify-center py-16 text-center', className)}>
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
          <TrophyIcon className="h-10 w-10 text-white/60" strokeWidth={1.5} />
        </div>
        <h3 className="mb-2 text-xl font-bold text-white">No badges yet</h3>
        <p className="mb-6 max-w-md text-sm text-white/60">
          Complete quests and earn achievements to collect badges!
        </p>
      </div>
    )
  }

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Stats & Tier Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Total count */}
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
          <span className="text-2xl font-bold text-white">{stats.earned}</span>
          <span className="text-sm text-white/60">
            of {stats.total} badges earned
          </span>
        </div>

        {/* Tier filter buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedTier('all')}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-all',
              selectedTier === 'all'
                ? 'bg-white/20 text-white shadow-lg'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            )}
          >
            All
          </button>
          {(['mythic', 'legendary', 'epic', 'rare', 'common'] as BadgeTier[]).map(tier => {
            const config = TIER_CONFIG[tier]
            const count = stats.tierCounts[tier]
            return (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-all',
                  selectedTier === tier
                    ? 'text-white shadow-lg'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                )}
                style={{
                  backgroundColor: selectedTier === tier ? `${config.color}40` : undefined,
                  borderColor: selectedTier === tier ? `${config.color}60` : undefined,
                  borderWidth: selectedTier === tier ? '2px' : undefined,
                }}
              >
                {tier} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Badge Grid */}
      {filteredBadges.length > 0 ? (
        <div className="grid gap-4 grid-cols-3 sm:grid-cols-4 lg:grid-cols-5">
          {filteredBadges.map(badge => {
            const config = TIER_CONFIG[badge.tier]
            const isHovered = hoveredBadge === badge.id

            return (
              <div
                key={badge.id}
                className="group relative cursor-pointer"
                onMouseEnter={() => setHoveredBadge(badge.id)}
                onMouseLeave={() => setHoveredBadge(null)}
                title={badge.earned ? `Earned: ${new Date(badge.earned_at!).toLocaleDateString()}` : badge.requirements || 'Locked'}
              >
                {/* Badge Card */}
                <div
                  className={clsx(
                    'relative aspect-square overflow-hidden rounded-2xl transition-all duration-300',
                    badge.earned
                      ? 'bg-gradient-to-br from-black/80 via-black/60 to-black/80'
                      : 'bg-black/60 grayscale opacity-50'
                  )}
                  style={{
                    borderWidth: '2px',
                    borderColor: badge.earned ? config.color : 'rgba(255,255,255,0.1)',
                    boxShadow: badge.earned && isHovered ? config.glow : undefined,
                    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {/* Badge Image */}
                  <div className="relative h-full w-full">
                    <Image
                      src={badge.image_url}
                      alt={badge.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    />
                  </div>

                  {/* Locked overlay */}
                  {!badge.earned && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <svg className="h-8 w-8 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Tier badge (top-left corner) */}
                  <div
                    className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider backdrop-blur"
                    style={{
                      backgroundColor: `${config.color}60`,
                      color: '#fff',
                    }}
                  >
                    {config.label}
                  </div>

                  {/* Earned indicator (top-right corner) */}
                  {badge.earned && (
                    <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-600">
                      <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Badge Name (below card) */}
                <p className="mt-2 line-clamp-2 text-center text-xs font-medium text-white group-hover:text-white/90">
                  {badge.name}
                </p>

                {/* Earned date (optional, below name) */}
                {badge.earned && badge.earned_at && (
                  <p className="mt-0.5 text-center text-[10px] text-white/40">
                    {new Date(badge.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-sm text-white/60">No badges in this tier</p>
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-center justify-between text-xs text-white/40">
        <span>Showing {filteredBadges.length} badges</span>
        <span>{Math.round((stats.earned / stats.total) * 100)}% collection complete</span>
      </div>
    </div>
  )
}

// Export named for consistency
export { BadgeCollection }
