'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { Badge as BadgeType } from './BadgeCollection'

// Extended badge type with hover card fields
interface HoverBadge extends BadgeType {
  points?: number
  criteria?: string | null
}

interface BadgeHoverCardProps {
  badge: HoverBadge
  isVisible: boolean
  position: { x: number; y: number }
}

/**
 * BadgeHoverCard - Twitter-style hover card for badge details
 * 
 * Features:
 * - Smooth entrance/exit animations (Framer Motion)
 * - Tier-based styling with glow effects
 * - Accessibility: ARIA labels, semantic HTML
 * - Responsive positioning (auto-adjust for viewport)
 * 
 * Pattern: Twitter hover cards, Discord badge tooltips
 */
export default function BadgeHoverCard({
  badge,
  isVisible,
  position,
}: BadgeHoverCardProps) {
  // Tier-based glow colors (Discord pattern)
  const tierGlowColors = {
    common: 'rgba(156, 163, 175, 0.2)', // gray
    rare: 'rgba(96, 165, 250, 0.3)', // blue
    epic: 'rgba(168, 85, 247, 0.3)', // purple
    legendary: 'rgba(251, 191, 36, 0.4)', // yellow
    mythic: 'rgba(244, 63, 94, 0.4)', // red
  } as const

  const glowColor = tierGlowColors[badge.tier as keyof typeof tierGlowColors] || tierGlowColors.common

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            maxWidth: '280px',
          }}
          role="tooltip"
          aria-label={`${badge.name} badge details`}
        >
          <div
            className="relative rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-xl backdrop-blur-sm"
            style={{
              boxShadow: `0 0 20px ${glowColor}, 0 10px 30px rgba(0, 0, 0, 0.5)`,
            }}
          >
            {/* Badge Tier Tag */}
            <div className="mb-2 flex items-center justify-between">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                  badge.tier === 'legendary'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : badge.tier === 'epic'
                      ? 'bg-purple-500/20 text-purple-400'
                      : badge.tier === 'rare'
                        ? 'bg-blue-500/20 text-blue-400'
                        : badge.tier === 'mythic'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-gray-500/20 text-gray-400'
                }`}
              >
                {badge.tier}
              </span>
              {badge.points && (
                <span className="text-xs text-white/60">{badge.points} pts</span>
              )}
            </div>

            {/* Badge Name */}
            <h2 className="mb-1 text-base font-bold text-white">{badge.name}</h2>

            {/* Badge Description */}
            <p className="mb-3 text-sm text-white/70 leading-relaxed">
              {badge.description}
            </p>

            {/* Unlock Criteria (if not earned) */}
            {badge.criteria && !badge.earned_at && (
              <div className="border-t border-white/10 pt-2">
                <p className="text-xs text-white/50">
                  <span className="font-semibold text-white/70">Unlock:</span>{' '}
                  {badge.criteria}
                </p>
              </div>
            )}

            {/* Earned Date (if earned) */}
            {badge.earned_at && (
              <div className="border-t border-white/10 pt-2">
                <p className="text-xs text-white/50">
                  <span className="font-semibold text-white/70">Earned:</span>{' '}
                  {new Date(badge.earned_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}

            {/* Arrow pointer */}
            <div
              className="absolute -top-1 left-4 h-2 w-2 rotate-45 border-l border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              style={{
                boxShadow: `-2px -2px 4px ${glowColor}`,
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
