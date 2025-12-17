'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import CheckIcon from '@/components/icons/check-icon'
import { BADGE_REGISTRY } from '@/lib/badges/badge-registry-data'

interface BadgeSelectorProps {
  selectedBadgeIds: string[]
  onChange: (badgeIds: string[]) => void
  className?: string
}

type BadgeTier = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'

const TIER_COLORS: Record<BadgeTier, { border: string; bg: string; text: string }> = {
  common: {
    border: 'border-gray-500/50',
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
  },
  rare: {
    border: 'border-purple-500/50',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
  },
  epic: {
    border: 'border-cyan-500/50',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
  },
  legendary: {
    border: 'border-yellow-500/50',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
  },
  mythic: {
    border: 'border-violet-500/50',
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
  },
}

const TIER_ORDER: BadgeTier[] = ['mythic', 'legendary', 'epic', 'rare', 'common']

export function BadgeSelector({
  selectedBadgeIds,
  onChange,
  className = '',
}: BadgeSelectorProps) {
  const [selectedTier, setSelectedTier] = useState<BadgeTier | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Group badges by tier
  const badgesByTier = useMemo(() => {
    const grouped: Record<BadgeTier, typeof BADGE_REGISTRY.badges> = {
      mythic: [],
      legendary: [],
      epic: [],
      rare: [],
      common: [],
    }

    BADGE_REGISTRY.badges.forEach((badge) => {
      if (badge.active && badge.tier in grouped) {
        grouped[badge.tier as BadgeTier].push(badge)
      }
    })

    return grouped
  }, [])

  // Filter badges
  const filteredBadges = useMemo(() => {
    let badges = BADGE_REGISTRY.badges.filter((badge) => badge.active)

    // Filter by tier
    if (selectedTier !== 'all') {
      badges = badges.filter((badge) => badge.tier === selectedTier)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      badges = badges.filter(
        (badge) =>
          badge.name.toLowerCase().includes(query) ||
          badge.description.toLowerCase().includes(query)
      )
    }

    return badges
  }, [selectedTier, searchQuery])

  const toggleBadge = (badgeId: string) => {
    if (selectedBadgeIds.includes(badgeId)) {
      onChange(selectedBadgeIds.filter((id) => id !== badgeId))
    } else {
      onChange([...selectedBadgeIds, badgeId])
    }
  }

  const clearSelection = () => {
    onChange([])
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Badge Rewards</h3>
            <p className="text-sm text-slate-400">
              Select non-transferable achievement badges to award on completion
            </p>
          </div>
          {selectedBadgeIds.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear ({selectedBadgeIds.length})
            </Button>
          )}
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="Search badges..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </div>

      {/* Tier filters */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedTier('all')}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
            selectedTier === 'all'
              ? 'bg-sky-500 text-white'
              : 'bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          All ({BADGE_REGISTRY.badges.filter((b) => b.active).length})
        </button>
        {TIER_ORDER.map((tier) => {
          const count = badgesByTier[tier].length
          const colors = TIER_COLORS[tier]
          return (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedTier === tier
                  ? `${colors.bg} ${colors.text} border ${colors.border}`
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {tier.charAt(0).toUpperCase() + tier.slice(1)} ({count})
            </button>
          )
        })}
      </div>

      {/* Badge grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredBadges.map((badge) => {
          const isSelected = selectedBadgeIds.includes(badge.id)
          const colors = TIER_COLORS[badge.tier as BadgeTier]

          return (
            <button
              key={badge.id}
              onClick={() => toggleBadge(badge.id)}
              className={`group relative overflow-hidden rounded-xl border-2 bg-slate-950/40 p-4 text-left transition ${
                isSelected
                  ? `${colors.border} ${colors.bg}`
                  : 'border-white/10 hover:border-sky-500/50 hover:bg-slate-950/60'
              }`}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute right-3 top-3 rounded-full bg-sky-500 p-1">
                  <CheckIcon className="h-3 w-3 text-white" />
                </div>
              )}

              {/* Badge image */}
              <div className="mb-3 flex items-center gap-3">
                <div
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border ${colors.border} ${colors.bg}`}
                >
                  {badge.imageUrl ? (
                    <Image
                      src={badge.imageUrl}
                      alt={badge.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">
                      🏅
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-semibold text-white">{badge.name}</h4>
                  <p className={`text-xs font-medium uppercase tracking-wide ${colors.text}`}>
                    {badge.tier}
                  </p>
                </div>
              </div>

              {/* Badge description */}
              <p className="line-clamp-2 text-sm text-slate-400">{badge.description}</p>

              {/* Points bonus */}
              {badge.pointsCost && badge.pointsCost > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-sky-400">
                  <span className="font-medium">+{badge.pointsCost} BASE POINTS</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {filteredBadges.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-slate-400">No badges found</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-sm text-sky-400 hover:text-sky-300"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Badge tier info */}
      <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/40 p-4">
        <h4 className="mb-2 text-sm font-semibold text-white">About Badge Tiers</h4>
        <ul className="space-y-1 text-xs text-slate-400">
          <li>
            <span className={TIER_COLORS.mythic.text}>• Mythic</span> - Rarest achievements, 1000+
            points bonus
          </li>
          <li>
            <span className={TIER_COLORS.legendary.text}>• Legendary</span> - Exceptional
            accomplishments, 400+ points
          </li>
          <li>
            <span className={TIER_COLORS.epic.text}>• Epic</span> - Significant milestones, 200+
            points
          </li>
          <li>
            <span className={TIER_COLORS.rare.text}>• Rare</span> - Notable progress, 100+ points
          </li>
          <li>
            <span className={TIER_COLORS.common.text}>• Common</span> - Starting achievements, no
            bonus
          </li>
        </ul>
      </div>
    </div>
  )
}
