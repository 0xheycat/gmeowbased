'use client'

import { BadgeIcon, type Badge, type BadgeSize } from './BadgeIcon'
import { cn } from '@/lib/utils/utils'
import { createKeyboardHandler, FOCUS_STYLES, WCAG_CLASSES } from '@/lib/utils/accessibility'

/**
 * BadgeShowcase Component
 * 
 * Displays a collection of badges with a maximum display limit.
 * Follows Reddit trophy case pattern (max 24) and Discord badge system (max 6).
 * 
 * Features:
 * - Displays up to maxDisplay badges (default: 6, Reddit pattern)
 * - Shows overflow counter (+X more badges)
 * - Horizontal layout with proper spacing
 * - Badge priority system built-in
 * - Responsive sizing
 * 
 * Priority Order (from Badge System Architecture):
 * 1. Role badges (Owner > Officer > Member)
 * 2. Special badges (Verified, Partner, Supporter)
 * 3. Founding badges (Founder, Early Member, First Officer)
 * 4. Achievement badges (sorted by rarity: legendary > epic > rare > common)
 * 5. Activity badges (sorted by rarity)
 * 
 * @example
 * ```tsx
 * <BadgeShowcase 
 *   badges={member.badges} 
 *   maxDisplay={6}
 *   size="md"
 * />
 * ```
 */

interface BadgeShowcaseProps {
  /** Array of badges to display */
  badges: Badge[]
  
  /** Maximum number of badges to display before showing overflow counter */
  maxDisplay?: number
  
  /** Size variant for all badges */
  size?: BadgeSize
  
  /** Show tooltip on badge hover */
  showTooltip?: boolean
  
  /** Show glow effect on legendary badges */
  showGlow?: boolean
  
  /** Additional CSS classes */
  className?: string
  
  /** Callback when overflow counter is clicked */
  onShowAll?: () => void
}

/**
 * Badge Priority Weights
 * Higher weight = displayed first
 */
const CATEGORY_PRIORITY = {
  role: 5,
  special: 4,
  founder: 3,
  achievement: 2,
  activity: 1,
} as const

const RARITY_PRIORITY = {
  legendary: 4,
  epic: 3,
  rare: 2,
  common: 1,
} as const

/**
 * Sorts badges by priority (role > special > founding > achievement > activity)
 * Within each category, sorts by rarity (legendary > epic > rare > common)
 */
function sortBadgesByPriority(badges: Badge[]): Badge[] {
  return [...badges].sort((a, b) => {
    // First, sort by category priority
    const categoryDiff = CATEGORY_PRIORITY[b.category] - CATEGORY_PRIORITY[a.category]
    if (categoryDiff !== 0) return categoryDiff
    
    // Within same category, sort by rarity
    const rarityDiff = RARITY_PRIORITY[b.rarity] - RARITY_PRIORITY[a.rarity]
    if (rarityDiff !== 0) return rarityDiff
    
    // Finally, sort by earned date (most recent first)
    if (a.earnedAt && b.earnedAt) {
      const dateA = typeof a.earnedAt === 'string' ? new Date(a.earnedAt) : a.earnedAt
      const dateB = typeof b.earnedAt === 'string' ? new Date(b.earnedAt) : b.earnedAt
      return dateB.getTime() - dateA.getTime()
    }
    
    return 0
  })
}

export function BadgeShowcase({
  badges,
  maxDisplay = 6,
  size = 'md',
  showTooltip = true,
  showGlow = true,
  className,
  onShowAll,
}: BadgeShowcaseProps) {
  // No badges to display
  if (badges.length === 0) {
    return null
  }
  
  // Sort badges by priority
  const sortedBadges = sortBadgesByPriority(badges)
  
  // Get badges to display
  const displayBadges = sortedBadges.slice(0, maxDisplay)
  const overflowCount = badges.length - maxDisplay
  
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Display badges */}
      {displayBadges.map((badge) => (
        <BadgeIcon
          key={badge.id}
          badge={badge}
          size={size}
          showTooltip={showTooltip}
          showGlow={showGlow}
        />
      ))}
      
      {/* Overflow counter */}
      {overflowCount > 0 && (
        <button
          {...(onShowAll ? createKeyboardHandler(onShowAll) : {})}
          role="button"
          tabIndex={onShowAll ? 0 : -1}
          className={cn(
            'flex items-center justify-center',
            `text-xs font-medium ${WCAG_CLASSES.text.onLight.secondary}`,
            'hover:text-gray-300 transition-fast',
            'px-2 py-1 rounded-md',
            'bg-slate-800/50 hover:bg-slate-800',
            'border border-slate-700',
            FOCUS_STYLES.ring,
            onShowAll && 'cursor-pointer',
            !onShowAll && 'cursor-default'
          )}
          disabled={!onShowAll}
          aria-label={`Show all ${badges.length} badges (${overflowCount} more hidden)`}
        >
          +{overflowCount}
        </button>
      )}
    </div>
  )
}

/**
 * BadgeGrid Component
 * 
 * Alternative layout for displaying all badges in a grid format.
 * Useful for full badge collection pages or modals.
 * 
 * @example
 * ```tsx
 * <BadgeGrid 
 *   badges={allBadges}
 *   columns={6}
 *   size="lg"
 * />
 * ```
 */

interface BadgeGridProps {
  /** Array of badges to display */
  badges: Badge[]
  
  /** Number of columns in grid (default: 6) */
  columns?: number
  
  /** Size variant for all badges */
  size?: BadgeSize
  
  /** Show tooltip on badge hover */
  showTooltip?: boolean
  
  /** Show glow effect on legendary badges */
  showGlow?: boolean
  
  /** Additional CSS classes */
  className?: string
}

export function BadgeGrid({
  badges,
  columns = 6,
  size = 'lg',
  showTooltip = true,
  showGlow = true,
  className,
}: BadgeGridProps) {
  // No badges to display
  if (badges.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No badges earned yet</p>
        <p className="text-xs mt-1">Complete achievements to earn badges!</p>
      </div>
    )
  }
  
  // Sort badges by priority
  const sortedBadges = sortBadgesByPriority(badges)
  
  return (
    <div
      className={cn(
        'grid gap-3',
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {sortedBadges.map((badge) => (
        <div key={badge.id} className="flex justify-center">
          <BadgeIcon
            badge={badge}
            size={size}
            showTooltip={showTooltip}
            showGlow={showGlow}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * BadgeCategory Component
 * 
 * Groups badges by category with a section header.
 * Useful for organized badge collection displays.
 * 
 * @example
 * ```tsx
 * <BadgeCategory
 *   title="Role Badges"
 *   description="Official guild positions"
 *   badges={roleBadges}
 *   size="md"
 * />
 * ```
 */

interface BadgeCategoryProps {
  /** Category title */
  title: string
  
  /** Optional category description */
  description?: string
  
  /** Badges in this category */
  badges: Badge[]
  
  /** Size variant for badges */
  size?: BadgeSize
  
  /** Show tooltip on badge hover */
  showTooltip?: boolean
  
  /** Show glow effect on legendary badges */
  showGlow?: boolean
  
  /** Additional CSS classes */
  className?: string
}

export function BadgeCategory({
  title,
  description,
  badges,
  size = 'md',
  showTooltip = true,
  showGlow = true,
  className,
}: BadgeCategoryProps) {
  if (badges.length === 0) {
    return null
  }
  
  return (
    <div className={cn('space-y-3', className)}>
      {/* Category header */}
      <div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {description && (
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        )}
      </div>
      
      {/* Badge grid */}
      <BadgeGrid
        badges={badges}
        columns={6}
        size={size}
        showTooltip={showTooltip}
        showGlow={showGlow}
      />
    </div>
  )
}
