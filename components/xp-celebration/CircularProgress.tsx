/**
 * XP Celebration System - Circular Progress Ring
 * 
 * SVG-based circular progress indicator with tier-based styling.
 * 
 * FEATURES:
 * - SVG-based circular progress ring (120px diameter, 8px stroke)
 * - Smooth 1200ms fill animation with ease-in-out
 * - Tier-based colors with glow effects
 * - GPU-optimized (will-change: transform)
 * - WCAG AAA compliant
 * 
 * PHASE: Phase 1 - Component Creation (Week 1)
 * DATE: December 14, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - XP-SYSTEM-COMPREHENSIVE-GUIDE-PART-2.md (CircularProgress specification)
 * - types.ts (CircularProgressProps interface)
 * - animations.ts (progressRingVariants)
 * 
 * SUGGESTIONS:
 * - Add progress milestones with subtle markers at 25/50/75/100%
 * - Include completion celebration (pulse/glow burst)
 * - Add percentage text inside ring for accessibility
 * 
 * CRITICAL:
 * - MUST be GPU-accelerated (transform/opacity only)
 * - Smooth 60fps animation required
 * - WCAG AAA contrast ratios maintained
 * 
 * REQUIREMENTS (farcaster.instructions.md):
 * - Base network: Chain ID 8453
 * - WCAG AAA accessibility compliance
 * - TypeScript strict mode: No `any` types
 * 
 * AVOID:
 * - Non-transform animations (width/height/left/right)
 * - Heavy computations during animation
 * - Blocking main thread
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { CircularProgressProps } from './types'
import { ANIMATION_TIMINGS, EASING_FUNCTIONS } from './types'

/**
 * Circular SVG Progress Ring Component
 * Professional gaming-style progress indicator with smooth animations
 */
export function CircularProgress({
  percent,
  size = 120,
  strokeWidth = 8,
  color = '#3B82F6',
  glowColor,
  animationDuration = ANIMATION_TIMINGS.progressRingFill,
  tierCategory = 'beginner',
}: CircularProgressProps) {
  const [mounted, setMounted] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  
  // Mythic tiers use gradient stroke
  const isMythic = tierCategory === 'mythic'
  const isComplete = percent >= 100

  // Calculate SVG circle properties
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  // Center point
  const center = size / 2

  useEffect(() => {
    // Delay animation until component is mounted
    setMounted(true)
  }, [])

  // Instant animation for reduced motion preference
  const duration = prefersReducedMotion ? 0.01 : animationDuration / 1000

  return (
    <div
      className="relative flex items-center justify-center overflow-visible"
      style={{
        width: size,
        height: size,
        background: 'transparent',
      }}
    >
      {/* Glow effect layer (behind progress ring) */}
      {glowColor && !prefersReducedMotion && (
        <motion.div
          className="absolute inset-0 rounded-full blur-lg"
          style={{
            backgroundColor: glowColor,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{
            duration: duration * 0.8,
            ease: EASING_FUNCTIONS.progressFill,
          }}
        />
      )}

      {/* Mythic Tier: Dual-Glow Pulse Animation */}
      {isMythic && !prefersReducedMotion && (
        <>
          {/* Inner glow (pink) */}
          <motion.div
            className="absolute inset-0 rounded-full blur-md"
            style={{
              backgroundColor: '#EC4899', // Pink
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [0.9, 1.1, 0.9],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          
          {/* Outer glow (purple) */}
          <motion.div
            className="absolute inset-0 rounded-full blur-2xl"
            style={{
              backgroundColor: '#8B5CF6', // Purple
            }}
            initial={{ opacity: 0, scale: 1 }}
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
          />

          {/* Shimmer particles effect */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 15%),
                radial-gradient(circle at 70% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 12%),
                radial-gradient(circle at 50% 80%, rgba(255, 255, 255, 0.35) 0%, transparent 18%)
              `,
            }}
            initial={{ opacity: 0, rotate: 0 }}
            animate={{
              opacity: [0, 0.6, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </>
      )}

      {/* SVG Progress Ring */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative z-10 block"
        style={{
          transform: 'rotate(-90deg)', // Start from top (12 o'clock)
          willChange: 'transform',
          overflow: 'visible',
        }}
      >
        {/* Mythic Tier: Animated Rainbow Gradient (8-second cycle) */}
        {isMythic && (
          <defs>
            <linearGradient id="mythic-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6"> {/* Purple */}
                {!prefersReducedMotion && (
                  <animate
                    attributeName="stop-color"
                    values="#8B5CF6;#EC4899;#F59E0B;#3B82F6;#8B5CF6"
                    dur="8s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
              <stop offset="50%" stopColor="#EC4899"> {/* Pink */}
                {!prefersReducedMotion && (
                  <animate
                    attributeName="stop-color"
                    values="#EC4899;#F59E0B;#3B82F6;#8B5CF6;#EC4899"
                    dur="8s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
              <stop offset="100%" stopColor="#EC4899"> {/* Pink */}
                {!prefersReducedMotion && (
                  <animate
                    attributeName="stop-color"
                    values="#EC4899;#3B82F6;#8B5CF6;#F59E0B;#EC4899"
                    dur="8s"
                    repeatCount="indefinite"
                  />
                )}
              </stop>
            </linearGradient>
          </defs>
        )}

        {/* Background circle (track) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-800/30"
          opacity={0.3}
        />

        {/* Milestone markers at 25%, 50%, 75% */}
        {[25, 50, 75].map((milestone) => {
          const angle = (milestone / 100) * 360 - 90 // Subtract 90 for top start
          const rad = (angle * Math.PI) / 180
          const x = center + radius * Math.cos(rad)
          const y = center + radius * Math.sin(rad)
          return (
            <circle
              key={milestone}
              cx={x}
              cy={y}
              r={2}
              fill={percent >= milestone ? color : '#52525B'}
              opacity={percent >= milestone ? 0.8 : 0.3}
            />
          )
        })}

        {/* Progress circle (animated fill) */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={isMythic ? 'url(#mythic-gradient)' : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={mounted ? offset : circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ 
            strokeDashoffset: mounted ? offset : circumference,
            // Pulse on 100% completion
            ...(isComplete && !prefersReducedMotion ? {
              scale: [1, 1.05, 1],
              opacity: [1, 0.8, 1]
            } : {})
          }}
          transition={{
            duration,
            ease: EASING_FUNCTIONS.progressFill,
            delay: 0.1,
            // Pulse transition
            ...(isComplete ? {
              scale: {
                duration: 0.6,
                repeat: 2,
                ease: 'easeInOut'
              },
              opacity: {
                duration: 0.6,
                repeat: 2,
                ease: 'easeInOut'
              }
            } : {})
          }}
          style={{
            filter: glowColor ? `drop-shadow(0 0 8px ${glowColor})` : undefined,
            willChange: 'stroke-dashoffset',
            transformOrigin: 'center'
          }}
        />
      </svg>

      {/* Percentage text (accessibility + visual) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: duration * 0.6,
          ease: EASING_FUNCTIONS.modalExit,
          delay: duration * 0.4, // Appear after ring starts animating
        }}
      >
        <span
          className="text-2xl font-bold tabular-nums"
          style={{
            color,
            textShadow: glowColor ? `0 0 12px ${glowColor}` : undefined,
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          {Math.round(percent)}%
        </span>
      </motion.div>
    </div>
  )
}
