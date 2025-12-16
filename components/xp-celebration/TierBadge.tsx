/**
 * XP Celebration System - Tier Badge Display
 * 
 * Displays tier information with professional gaming aesthetics.
 * 
 * Features:
 * - Animated tier icon transitions (scale + rotate + glow burst)
 * - Tier progression preview (next tier teaser)
 * - PNG tier assets from Ranks/Tag Ranks/ folder
 * - Mythic tier glow effects
 * - WCAG AAA accessible
 * 
 * Icon Sources:
 * - PNG: components/icons/assets/gmeow-illustrations/Ranks/Tag Ranks/
 * - SVG: components/icons/TierIcon.tsx (fallback)
 * 
 * Tier Mapping (6 PNG ranks):
 * - Beginner → Iron Rank.png
 * - Intermediate → Bronze/Silver Rank.png
 * - Advanced → Gold Rank.png
 * - Mythic → Platinum/Legendary Rank.png
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

'use client'

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import type { TierBadgeProps } from './types'
import { TIER_COLOR_SCHEMES, ACCESSIBLE_COLORS } from './types'
import { tierBadgeVariants, glowPulseVariants, shimmerVariants } from './animations'
import { TierIcon } from '@/components/icons/TierIcon'

/**
 * Map tier names to PNG assets from Ranks/Tag Ranks/ folder
 * 6 PNG tiers: Iron, Bronze, Silver, Gold, Platinum, Legendary
 */
function getTierPNGPath(tierCategory: string, tierName: string): string | null {
  const tierMappings: Record<string, string> = {
    'Signal Kitten': '01- Iron Rank.png',
    'Warp Scout': '01- Iron Rank.png',
    'Beacon Runner': '02- Bronze Rank.png',
    'Night Operator': '03- Silver Rank.png',
    'Star Captain': '04- Gold Rank.png',
    'Mythic GM': '05- Platinum Rank.png',
    'Nebula Commander': '04- Gold Rank.png',
    'Quantum Navigator': '05- Platinum Rank.png',
    'Cosmic Architect': '05- Platinum Rank.png',
    'Void Walker': '06- Legendary Rank.png',
    'Singularity Prime': '06- Legendary Rank.png',
    'Infinite GM': '06- Legendary Rank.png',
    'Omniversal Being': '06- Legendary Rank.png',
  }

  const categoryFallbacks: Record<string, string> = {
    'beginner': '01- Iron Rank.png',
    'intermediate': '03- Silver Rank.png',
    'advanced': '04- Gold Rank.png',
    'mythic': '06- Legendary Rank.png',
  }

  return tierMappings[tierName] || categoryFallbacks[tierCategory] || null
}

/**
 * Tier Badge Component
 * Displays tier information with professional gaming aesthetics and animated transitions
 */
export function TierBadge({
  tierName,
  tierTagline,
  tierColor,
  tierCategory = 'beginner',
  icon,
  previousTierName,
  nextTierName,
  xpToNextTier,
  showProgression = false,
}: TierBadgeProps) {
  const prefersReducedMotion = useReducedMotion()
  const colorScheme = TIER_COLOR_SCHEMES[tierCategory]

  const isMythic = tierCategory === 'mythic'
  const tierPNGPath = getTierPNGPath(tierCategory, tierName)

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Tier Icon Container */}
      <motion.div
        className="relative flex items-center justify-center"
        variants={tierBadgeVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Glow background layer */}
        {!prefersReducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-full blur-xl"
            style={{
              backgroundColor: colorScheme.glow,
            }}
            variants={isMythic ? glowPulseVariants : undefined}
            animate={isMythic ? 'animate' : undefined}
            initial={{ opacity: 0.3 }}
          />
        )}

        {/* Icon background gradient */}
        <motion.div
          className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: colorScheme.gradient || colorScheme.primary,
            border: `2px solid ${colorScheme.primary}`,
            boxShadow: `0 0 20px ${colorScheme.glow}40`,
          }}
        >
          {/* Shimmer effect for mythic tiers */}
          {isMythic && !prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${colorScheme.effects?.shimmer || '#FFFFFF'}40 50%, transparent 100%)`,
                backgroundSize: '200% 100%',
              }}
              variants={shimmerVariants}
              animate="animate"
            />
          )}

          {/* Animated Tier Icon with PNG Assets */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tierName}
              className="relative z-10 flex items-center justify-center"
              initial={!prefersReducedMotion ? { scale: 0, rotate: -180, opacity: 0 } : { opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={!prefersReducedMotion ? { scale: 0, rotate: 180, opacity: 0 } : { opacity: 0 }}
              transition={{
                duration: 0.6,
                type: 'spring',
                stiffness: 200,
                damping: 15,
              }}
            >
              {icon ? (
                icon
              ) : tierPNGPath ? (
                <div className="relative w-12 h-12">
                  <Image
                    src={`/components/icons/assets/gmeow-illustrations/Ranks/Tag Ranks/${tierPNGPath}`}
                    alt={`${tierName} tier badge`}
                    width={48}
                    height={48}
                    className="relative z-10 object-contain"
                    priority
                    unoptimized
                  />
                </div>
              ) : (
                <TierIcon
                  tierName={tierName as any}
                  size={40}
                  className="relative z-10"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Tier name */}
      <motion.h3
        className="text-xl font-bold tracking-tight"
        style={{ color: colorScheme.primary }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          delay: 0.2,
          ease: 'easeOut',
        }}
      >
        {tierName}
      </motion.h3>

      {/* Tier tagline */}
      {tierTagline && (
        <motion.p
          className="text-sm font-medium"
          style={{ color: ACCESSIBLE_COLORS.muted }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: 0.3,
            ease: 'easeOut',
          }}
        >
          {tierTagline}
        </motion.p>
      )}

      {/* Tier Progression Preview: Next tier teaser */}
      {showProgression && nextTierName && xpToNextTier !== undefined && (
        <motion.div
          className="mt-2 px-4 py-2 rounded-lg"
          style={{
            background: `linear-gradient(135deg, ${colorScheme.primary}10, ${colorScheme.glow}05)`,
            border: `1px solid ${colorScheme.primary}30`,
            borderTop: `2px solid ${colorScheme.primary}60`,
          }}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.5,
            delay: 0.4,
            ease: 'easeOut',
          }}
        >
          {/* Next tier indicator */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span
              className="font-medium uppercase tracking-wider"
              style={{ color: ACCESSIBLE_COLORS.muted }}
            >
              Next Tier
            </span>
            <span
              className="font-bold"
              style={{ color: colorScheme.primary }}
            >
              {nextTierName}
            </span>
          </div>

          {/* XP remaining */}
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className="text-lg font-black tabular-nums"
              style={{
                color: colorScheme.primary,
                textShadow: `0 0 8px ${colorScheme.glow}60`,
              }}
            >
              {xpToNextTier.toLocaleString()}
            </span>
            <span
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: ACCESSIBLE_COLORS.muted }}
            >
              XP to go
            </span>
          </div>

          {/* Animated progress indicator arrow */}
          <motion.div
            className="mt-1 flex justify-center"
            initial={{ y: 0 }}
            animate={{ y: [0, -3, 0] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 2L8 14M8 14L4 10M8 14L12 10"
                stroke={colorScheme.primary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
