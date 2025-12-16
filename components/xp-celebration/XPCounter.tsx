/**
 * XP Celebration System - Animated XP Counter
 * 
 * Animated number increment display with smooth easing.
 * 
 * FEATURES:
 * - Animated number increment (0 → final XP over 800ms)
 * - Ease-out-cubic easing function
 * - requestAnimationFrame for smooth 60fps animation
 * - "+XP" callout with bounce animation
 * - Total XP display
 * 
 * PHASE: Phase 1 - Component Creation (Week 1)
 * DATE: December 14, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - XP-SYSTEM-COMPREHENSIVE-GUIDE-PART-2.md (XPCounter specification)
 * - types.ts (XPCounterProps interface)
 * - animations.ts (xpCounterVariants)
 * 
 * SUGGESTIONS:
 * - Add comma separators for large numbers (1,000+)
 * - Include +XP badge with tier-specific colors
 * - Add celebration emojis for large XP gains (optional)
 * 
 * CRITICAL:
 * - MUST use requestAnimationFrame (no setTimeout loops)
 * - 60fps stable performance required
 * - WCAG AAA contrast ratios maintained
 * 
 * REQUIREMENTS (farcaster.instructions.md):
 * - Base network: Chain ID 8453
 * - WCAG AAA accessibility compliance
 * - TypeScript strict mode: No `any` types
 * - No emojis (use SVG icons from components/icons/)
 * 
 * AVOID:
 * - setTimeout/setInterval loops (use requestAnimationFrame)
 * - Excessive re-renders during animation
 * - Blocking main thread with calculations
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { XPCounterProps } from './types'
import { ANIMATION_TIMINGS, ACCESSIBLE_COLORS } from './types'
import { xpCounterVariants } from './animations'

/**
 * Ease-out cubic easing function
 * Matches CSS cubic-bezier(0.215, 0.610, 0.355, 1.000)
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Format number with comma separators
 * 1000 → "1,000"
 */
function formatNumber(num: number): string {
  return Math.round(num).toLocaleString('en-US')
}

/**
 * Animated XP Counter Component
 * Professional gaming-style number increment animation
 */
export function XPCounter({
  xpEarned,
  totalXP,
  duration = ANIMATION_TIMINGS.xpCounter,
}: XPCounterProps) {
  const [displayXP, setDisplayXP] = useState(0)
  const prefersReducedMotion = useReducedMotion()
  const animationFrameRef = useRef<number>()
  const startTimeRef = useRef<number>()

  useEffect(() => {
    // Instant display for reduced motion
    if (prefersReducedMotion) {
      setDisplayXP(xpEarned)
      return
    }

    // Animate number increment using requestAnimationFrame
    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime
      }

      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)

      // Interpolate from 0 to xpEarned
      const currentXP = Math.round(easedProgress * xpEarned)
      setDisplayXP(currentXP)

      // Continue animation if not complete
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [xpEarned, duration, prefersReducedMotion])

  // Determine tier glow color based on XP amount
  const tierGlow = xpEarned >= 10000 
    ? ACCESSIBLE_COLORS.success 
    : xpEarned >= 5000 
    ? ACCESSIBLE_COLORS.primary 
    : xpEarned >= 1000 
    ? ACCESSIBLE_COLORS.warning 
    : ACCESSIBLE_COLORS.primary

  return (
    <div className="relative flex flex-col items-center gap-3">
      {/* Premium XP Display with Chromatic Effect */}
      <motion.div
        className="relative flex items-baseline gap-3"
        variants={xpCounterVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Background glow burst */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle, ${tierGlow}30, transparent)`,
            filter: 'blur(40px)',
            width: '250px',
            height: '120px',
            margin: '-30px',
          }}
          animate={{
            opacity: [0.4, 0.8, 0.4],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Animated XP number with text stroke */}
        <motion.span
          className="relative text-7xl font-black tabular-nums tracking-tighter"
          style={{ 
            color: ACCESSIBLE_COLORS.foreground,
            textShadow: `
              0 0 30px ${tierGlow},
              0 0 60px ${tierGlow}80,
              0 0 90px ${tierGlow}40,
              0 4px 8px rgba(0,0,0,0.8),
              2px 0 0 ${tierGlow}40,
              -2px 0 0 ${tierGlow}40,
              0 2px 0 ${tierGlow}40,
              0 -2px 0 ${tierGlow}40
            `,
            WebkitTextStroke: `1px ${tierGlow}60`,
          }}
          aria-live="polite"
          aria-atomic="true"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            repeatDelay: 1,
            ease: 'easeInOut',
          }}
        >
          +{formatNumber(displayXP)}
        </motion.span>

        {/* XP label with premium styling */}
        <motion.span
          className="text-3xl font-black uppercase tracking-[0.2em]"
          style={{ 
            color: ACCESSIBLE_COLORS.muted,
            textShadow: `0 2px 4px rgba(0,0,0,0.6)`,
            letterSpacing: '0.3em',
          }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          XP
        </motion.span>
      </motion.div>

      {/* Premium Total XP Display */}
      {totalXP !== undefined && (
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: `linear-gradient(135deg, ${tierGlow}15, ${tierGlow}05)`,
            border: `1px solid ${tierGlow}30`,
            boxShadow: `0 0 20px ${tierGlow}20, inset 0 0 10px ${tierGlow}10`,
          }}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.4,
            delay: duration / 1000 + 0.1,
            ease: 'easeOut',
          }}
        >
          <span 
            className="text-xs font-semibold uppercase tracking-wider" 
            style={{ color: ACCESSIBLE_COLORS.muted }}
          >
            Total
          </span>
          <span
            className="text-sm font-black tabular-nums"
            style={{ 
              color: tierGlow,
              textShadow: `0 0 10px ${tierGlow}60`,
            }}
          >
            {formatNumber(totalXP)}
          </span>
          <span 
            className="text-xs font-bold uppercase tracking-wider" 
            style={{ color: ACCESSIBLE_COLORS.muted }}
          >
            XP
          </span>
        </motion.div>
      )}

      {/* Premium Milestone Badge */}
      {xpEarned >= 1000 && (
        <motion.div
          className="relative mt-2 flex items-center gap-2 rounded-xl px-5 py-2.5 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${tierGlow}25, ${tierGlow}10)`,
            border: `2px solid ${tierGlow}60`,
            boxShadow: `
              0 0 30px ${tierGlow}40,
              0 4px 12px rgba(0,0,0,0.4),
              inset 0 0 20px ${tierGlow}15
            `,
          }}
          initial={{ scale: 0, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{
            duration: 0.6,
            delay: duration / 1000 + 0.2,
            type: 'spring',
            stiffness: 200,
            damping: 15,
          }}
        >
          {/* Animated shine overlay */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent, ${tierGlow}40, transparent)`,
            }}
            animate={{
              x: [-100, 200],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
              ease: 'easeInOut',
            }}
          />
          
          {/* Sparkle icon */}
          <motion.span 
            className="text-lg"
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            ✨
          </motion.span>
          
          {/* Milestone text */}
          <span
            className="relative z-10 text-sm font-black uppercase tracking-widest"
            style={{ 
              color: tierGlow,
              textShadow: `0 0 10px ${tierGlow}80, 0 2px 4px rgba(0,0,0,0.6)`,
              letterSpacing: '0.15em',
            }}
          >
            {xpEarned >= 10000 
              ? 'LEGENDARY!' 
              : xpEarned >= 5000 
              ? 'MASSIVE GAIN!' 
              : 'EPIC GAIN!'}
          </span>
        </motion.div>
      )}
    </div>
  )
}
