'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/utils'
import { Tooltip } from '@/components/ui/tooltip'
import { createAriaLabel } from '@/lib/utils/accessibility'

/**
 * Badge rarity levels (WoW + Reddit pattern)
 */
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

/**
 * Badge category (for organization)
 */
export type BadgeCategory = 'founder' | 'activity' | 'role' | 'special' | 'achievement'

/**
 * Badge interface following professional platform patterns
 * (Discord, Steam, WoW, Reddit)
 */
export interface Badge {
  id: string
  name: string
  description: string
  icon: string // Path to SVG icon (e.g., /badges/founder/founder.svg)
  rarity: BadgeRarity
  category: BadgeCategory
  animated?: boolean
  earnedAt?: Date | string // Allow both Date objects and ISO strings
}

/**
 * Badge size variants (sm/md/lg for different contexts)
 */
export type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeIconProps {
  badge: Badge
  size?: BadgeSize
  showTooltip?: boolean
  showGlow?: boolean
  className?: string
}

/**
 * Rarity color gradients (matches badge SVG styling)
 */
const RARITY_COLORS: Record<BadgeRarity, string> = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-yellow-600',
}

/**
 * Rarity glow colors (for legendary effect)
 */
const RARITY_GLOW: Record<BadgeRarity, string> = {
  common: 'shadow-gray-500/50',
  rare: 'shadow-blue-500/50',
  epic: 'shadow-purple-500/50',
  legendary: 'shadow-yellow-500/50',
}

/**
 * Size configurations
 */
const SIZE_CONFIG: Record<BadgeSize, { container: string; icon: number; text: string }> = {
  sm: { container: 'w-6 h-6', icon: 16, text: 'text-[10px]' },
  md: { container: 'w-8 h-8', icon: 24, text: 'text-xs' },
  lg: { container: 'w-12 h-12', icon: 32, text: 'text-sm' },
}

/**
 * BadgeIcon Component
 * 
 * Professional badge display with tooltip, size variants, rarity colors, and animations.
 * Based on patterns from Discord, Steam, WoW, and Reddit badge systems.
 * 
 * Features:
 * - 3 size variants (sm/md/lg)
 * - 4 rarity levels with gradient borders
 * - Optional tooltip with badge details
 * - Optional legendary glow effect
 * - Smooth hover animations
 * - Accessibility (aria-label, role)
 * 
 * @example
 * ```tsx
 * <BadgeIcon
 *   badge={{
 *     id: 'founder',
 *     name: 'Guild Founder',
 *     description: 'Created the guild',
 *     icon: '/badges/founder/founder.svg',
 *     rarity: 'legendary',
 *     category: 'founder'
 *   }}
 *   size="md"
 *   showTooltip
 *   showGlow
 * />
 * ```
 */
export function BadgeIcon({
  badge,
  size = 'md',
  showTooltip = true,
  showGlow = true,
  className,
}: BadgeIconProps) {
  const sizeConfig = SIZE_CONFIG[size]
  const rarityGradient = RARITY_COLORS[badge.rarity]
  const rarityGlow = RARITY_GLOW[badge.rarity]

  const badgeContent = (
    <motion.div
      className={cn(
        'relative rounded-full p-0.5',
        'bg-gradient-to-br',
        rarityGradient,
        'transition-all duration-200',
        'hover:scale-110',
        badge.rarity === 'legendary' && showGlow && `shadow-lg ${rarityGlow}`,
        className
      )}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      aria-label={badge.name}
      role="img"
    >
      {/* Inner container with background */}
      <div
        className={cn(
          'relative rounded-full bg-slate-900 flex items-center justify-center overflow-hidden',
          sizeConfig.container
        )}
      >
        {/* Badge icon */}
        <Image
          src={badge.icon}
          alt={badge.name}
          width={sizeConfig.icon}
          height={sizeConfig.icon}
          className={cn(
            'relative z-10',
            badge.animated && 'animate-pulse'
          )}
        />

        {/* Legendary sparkle effect */}
        {badge.rarity === 'legendary' && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-tr from-yellow-400/20 to-transparent"
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </div>

      {/* Epic+ pulse animation */}
      {(badge.rarity === 'epic' || badge.rarity === 'legendary') && (
        <motion.div
          className={cn(
            'absolute inset-0 rounded-full',
            'bg-gradient-to-br',
            rarityGradient,
            'opacity-50'
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}
    </motion.div>
  )

  if (!showTooltip) {
    return badgeContent
  }

  return (
    <Tooltip
      content={
        <div className="text-center max-w-xs">
          <div className={cn('font-bold mb-1', sizeConfig.text)}>
            {badge.name}
          </div>
          <div className={cn('text-gray-300 mb-1', sizeConfig.text)}>
            {badge.description}
          </div>
          <div
            className={cn(
              'inline-block px-2 py-0.5 rounded-full text-[10px] font-medium',
              'bg-gradient-to-r',
              rarityGradient,
              'text-white'
            )}
          >
            {badge.rarity.toUpperCase()}
          </div>
          {badge.earnedAt && (
            <div className="text-gray-400 text-[10px] mt-1">
              Earned: {badge.earnedAt instanceof Date 
                ? badge.earnedAt.toLocaleDateString() 
                : new Date(badge.earnedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      }
      side="top"
      delay={200}
    >
      {badgeContent}
    </Tooltip>
  )
}

/**
 * Badge rarity label component (for display in lists)
 */
export function BadgeRarityLabel({ rarity }: { rarity: BadgeRarity }) {
  const gradient = RARITY_COLORS[rarity]

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
        'bg-gradient-to-r',
        gradient,
        'text-white'
      )}
    >
      {rarity.toUpperCase()}
    </span>
  )
}

/**
 * Helper function to get badge rarity color class
 */
export function getBadgeRarityColor(rarity: BadgeRarity): string {
  return RARITY_COLORS[rarity]
}
