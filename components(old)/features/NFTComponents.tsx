/**
 * NFT Components - Phase 17
 * Utility components for NFT gallery page
 * 
 * Design: Tailwick v2.0 + Gmeowbased v0.1 icons
 * Components:
 * - NFTFilters: Rarity, category, status filters
 * - NFTStatsBar: Dashboard stats (total, minted, pending, completion %)
 * - NFTEmptyState: Empty state when no NFTs found
 * - NFTGrid: Responsive grid layout (1→2→3 columns)
 */

'use client'

import { Card, CardBody, StatsCard, Badge, Button } from 'components(old)/ui/tailwick-primitives'
import { QuestIcon } from 'components(old)/ui/QuestIcon'
import type { NFTRarity, NFTCategory, NFTStats } from '@/lib/nfts'

// ========================================
// NFT STATS BAR
// ========================================

export type NFTStatsBarProps = {
  stats: NFTStats | null
  loading?: boolean
}

export function NFTStatsBar({ stats, loading = false }: NFTStatsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total NFTs */}
      <StatsCard
        icon="/assets/gmeow-icons/Gallery Icon.svg"
        iconAlt="Total NFTs"
        label="Total NFTs"
        value={stats?.total_nfts || 0}
        gradient="purple"
        loading={loading}
      />

      {/* Minted NFTs */}
      <StatsCard
        icon="/assets/gmeow-icons/Success Box Icon.svg"
        iconAlt="Minted"
        label="Minted"
        value={stats?.minted_nfts || 0}
        gradient="cyan"
        loading={loading}
      />

      {/* Pending Mints */}
      <StatsCard
        icon="/assets/gmeow-icons/Quests Icon.svg"
        iconAlt="Pending"
        label="Pending"
        value={stats?.pending_nfts || 0}
        gradient="orange"
        loading={loading}
      />

      {/* Completion % */}
      <StatsCard
        icon="/assets/gmeow-icons/Trophy Icon.svg"
        iconAlt="Completion"
        label="Completion"
        value={`${stats?.completion_percent || 0}%`}
        gradient="pink"
        loading={loading}
      />
    </div>
  )
}

// ========================================
// NFT FILTERS
// ========================================

export type NFTFiltersProps = {
  rarityFilter: NFTRarity | 'all'
  categoryFilter: NFTCategory | 'all'
  statusFilter: 'all' | 'minted' | 'available' | 'locked'
  onRarityChange: (rarity: NFTRarity | 'all') => void
  onCategoryChange: (category: NFTCategory | 'all') => void
  onStatusChange: (status: 'all' | 'minted' | 'available' | 'locked') => void
}

export function NFTFilters({
  rarityFilter,
  categoryFilter,
  statusFilter,
  onRarityChange,
  onCategoryChange,
  onStatusChange,
}: NFTFiltersProps) {
  return (
    <Card className="theme-card-bg-secondary">
      <CardBody>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Rarity Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Rarity
            </label>
            <select
              value={rarityFilter}
              onChange={(e) => onRarityChange(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded border theme-border-default theme-bg-overlay theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Rarities</option>
              <option value="mythic">Mythic</option>
              <option value="legendary">Legendary</option>
              <option value="epic">Epic</option>
              <option value="rare">Rare</option>
              <option value="common">Common</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryChange(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded border theme-border-default theme-bg-overlay theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Categories</option>
              <option value="quest">Quest Rewards</option>
              <option value="guild">Guild Achievements</option>
              <option value="event">Special Events</option>
              <option value="achievement">Achievements</option>
              <option value="onboarding">Onboarding</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded border theme-border-default theme-bg-overlay theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All NFTs</option>
              <option value="minted">Minted</option>
              <option value="available">Available to Mint</option>
              <option value="locked">Locked</option>
            </select>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

// ========================================
// NFT GRID
// ========================================

export type NFTGridProps = {
  children: React.ReactNode
}

export function NFTGrid({ children }: NFTGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {children}
    </div>
  )
}

// ========================================
// NFT EMPTY STATE
// ========================================

export type NFTEmptyStateProps = {
  title?: string
  description?: string
  showResetButton?: boolean
  onReset?: () => void
}

export function NFTEmptyState({
  title = 'No NFTs Found',
  description = 'Try adjusting your filters or complete quests to unlock NFTs',
  showResetButton = true,
  onReset,
}: NFTEmptyStateProps) {
  return (
    <Card className="theme-card-bg-secondary">
      <CardBody>
        <div className="text-center py-12 px-6 space-y-4">
          {/* Empty State Icon */}
          <div className="mx-auto w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
            <QuestIcon type="nft_mint" size={64} className="opacity-30" />
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold theme-text-primary">{title}</h3>
            <p className="text-sm theme-text-secondary max-w-md mx-auto">
              {description}
            </p>
          </div>

          {/* Reset Button */}
          {showResetButton && onReset && (
            <Button
              variant="ghost"
              size="md"
              onClick={onReset}
              className="mx-auto"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

// ========================================
// NFT LOADING SKELETON
// ========================================

export function NFTCardSkeleton() {
  return (
    <Card className="theme-card-bg-primary">
      {/* Image Skeleton */}
      <div className="aspect-square bg-gradient-to-br from-slate-900 to-slate-800 animate-pulse" />

      {/* Content Skeleton */}
      <CardBody className="space-y-3">
        {/* Title */}
        <div className="h-6 bg-white/10 rounded animate-pulse w-3/4" />
        
        {/* Description */}
        <div className="space-y-2">
          <div className="h-4 bg-white/10 rounded animate-pulse" />
          <div className="h-4 bg-white/10 rounded animate-pulse w-5/6" />
        </div>

        {/* Stats */}
        <div className="flex justify-between pt-2 border-t theme-border-subtle">
          <div className="h-4 bg-white/10 rounded animate-pulse w-16" />
          <div className="h-4 bg-white/10 rounded animate-pulse w-20" />
        </div>
      </CardBody>

      {/* Button Skeleton */}
      <div className="p-6 pt-4 border-t theme-border-subtle">
        <div className="h-10 bg-white/10 rounded animate-pulse" />
      </div>
    </Card>
  )
}

export function NFTGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <NFTGrid>
      {Array.from({ length: count }).map((_, i) => (
        <NFTCardSkeleton key={i} />
      ))}
    </NFTGrid>
  )
}

// ========================================
// NFT RARITY BADGE (Standalone)
// ========================================

export type NFTRarityBadgeProps = {
  rarity: NFTRarity
  className?: string
}

export function NFTRarityBadge({ rarity, className = '' }: NFTRarityBadgeProps) {
  const variantMap: Record<NFTRarity, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    mythic: 'danger',
    legendary: 'success',
    epic: 'primary',
    rare: 'info',
    common: 'warning',
  }

  return (
    <Badge variant={variantMap[rarity]} className={className}>
      {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
    </Badge>
  )
}

// ========================================
// NFT CATEGORY TAG (Standalone)
// ========================================

export type NFTCategoryTagProps = {
  category: NFTCategory
  showIcon?: boolean
  className?: string
}

export function NFTCategoryTag({ category, showIcon = true, className = '' }: NFTCategoryTagProps) {
  const getCategoryIcon = (cat: NFTCategory): string => {
    const iconMap: Record<NFTCategory, string> = {
      quest: 'quest_create',
      guild: 'guild_join',
      event: 'daily_gm',
      achievement: 'badge_mint',
      onboarding: 'onboard_bonus',
    }
    return iconMap[cat]
  }

  const label = category.charAt(0).toUpperCase() + category.slice(1)

  return (
    <div className={`inline-flex items-center gap-1.5 text-sm theme-text-secondary ${className}`}>
      {showIcon && <QuestIcon type={getCategoryIcon(category) as any} size={16} />}
      <span>{label}</span>
    </div>
  )
}
