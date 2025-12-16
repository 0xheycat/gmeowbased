/**
 * XP Celebration System - Animation Variants
 * 
 * Framer Motion animation definitions for all components.
 * 
 * FEATURES:
 * - Framer Motion animation variants for all XP celebration components
 * - Gaming-standard easing functions (League of Legends, Fortnite patterns)
 * - WCAG AAA compliant (prefers-reduced-motion support)
 * - 60fps performance-optimized animations
 * 
 * PHASE: Phase 1 - Component Creation (Week 1)
 * DATE: December 14, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - XP-SYSTEM-COMPREHENSIVE-GUIDE-PART-2.md (Animation Patterns section)
 * - Gaming UI Timing Standards: Modal 300ms, Progress 1200ms, Counter 800ms
 * 
 * SUGGESTIONS:
 * - Add preset variant combinations for different celebration intensities
 * - Create variant factory functions for dynamic configurations
 * - Include debug mode variants (slow-motion for testing)
 * 
 * CRITICAL:
 * - MUST support prefers-reduced-motion (instant transitions)
 * - GPU acceleration required (transform, opacity only)
 * - 60fps stable performance (no layout thrashing)
 * 
 * REQUIREMENTS (farcaster.instructions.md):
 * - WCAG AAA accessibility compliance
 * - Professional animation timing (gaming standards)
 * - TypeScript strict mode: No `any` types
 * 
 * AVOID:
 * - Animating width/height (use transform: scale instead)
 * - Excessive particles (max 40 for 60fps)
 * - Long animation durations (keep under 1.5s)
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

import type { Variants } from 'framer-motion'
import { ANIMATION_TIMINGS, EASING_FUNCTIONS } from './types'

/**
 * Modal Entrance Animation with Screen Shake (300ms)
 * AAA Gaming style - Valorant/Apex Legends inspired impact
 */
export const modalVariants: Variants = {
  hidden: {
    scale: 0.85,
    opacity: 0,
    y: 40,
    rotateX: -15,
  },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      duration: ANIMATION_TIMINGS.modalEntrance / 1000,
      ease: EASING_FUNCTIONS.modalEnter,
      scale: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
      },
      // Screen shake effect on entrance
      y: {
        type: 'spring',
        stiffness: 200,
        damping: 18,
      },
    },
  },
  exit: {
    scale: 0.9,
    opacity: 0,
    y: -20,
    rotateX: 10,
    transition: {
      duration: ANIMATION_TIMINGS.modalExit / 1000,
      ease: EASING_FUNCTIONS.modalExit,
    },
  },
}

/**
 * Mobile Bottom Sheet Animation (300ms)
 * Slide up from bottom on mobile devices
 */
export const mobileSheetVariants: Variants = {
  hidden: {
    y: '100%',
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: ANIMATION_TIMINGS.modalEntrance / 1000,
      ease: EASING_FUNCTIONS.modalExit,
    },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: {
      duration: ANIMATION_TIMINGS.modalExit / 1000,
      ease: EASING_FUNCTIONS.modalExit,
    },
  },
}

/**
 * Progress Ring Fill Animation (1200ms)
 * Smooth ease-in-out for professional feel
 * Note: Applied via motion.circle strokeDashoffset
 */
export const progressRingVariants: Variants = {
  initial: {
    strokeDashoffset: 'var(--circumference)',
  },
  animate: {
    strokeDashoffset: 'var(--target-offset)',
    transition: {
      duration: ANIMATION_TIMINGS.progressRingFill / 1000,
      ease: EASING_FUNCTIONS.progressFill,
    },
  },
}

/**
 * XP Counter Bounce Animation (800ms)
 * Back easing for satisfying bounce effect
 */
export const xpCounterVariants: Variants = {
  hidden: {
    scale: 0.5,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: EASING_FUNCTIONS.xpIncrement,
    },
  },
}

/**
 * Tier Badge Spin Animation (500ms)
 * Rotate + scale entrance (Valorant inspired)
 */
export const tierBadgeVariants: Variants = {
  hidden: {
    scale: 0,
    rotate: -180,
    opacity: 0,
  },
  visible: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: EASING_FUNCTIONS.xpIncrement,
    },
  },
}

/**
 * Button Hover/Tap Interactions
 * Micro-interactions for share/visit buttons
 */
export const buttonVariants: Variants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2,
      ease: EASING_FUNCTIONS.modalExit,
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
      ease: EASING_FUNCTIONS.modalExit,
    },
  },
}

/**
 * Stagger Container Animation
 * Sequential reveal of modal sections
 */
export const staggerContainerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // 100ms delay between children
      delayChildren: 0.1,   // Initial delay before first child
    },
  },
}

/**
 * Stagger Item Animation
 * Individual item entrance (used with staggerContainer)
 */
export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: EASING_FUNCTIONS.modalExit,
    },
  },
}

/**
 * Glow Pulse Animation (for mythic tiers)
 * Continuous subtle glow effect
 */
export const glowPulseVariants: Variants = {
  animate: {
    opacity: [0.5, 1, 0.5],
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

/**
 * Shimmer Effect Animation (for mythic tiers)
 * Traveling light effect across tier badge
 */
export const shimmerVariants: Variants = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

/**
 * Fade-in-up Animation (generic utility)
 * Simple entrance animation for text/elements
 */
export const fadeInUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: EASING_FUNCTIONS.modalExit,
    },
  },
}

/**
 * Scale-in Animation (generic utility)
 * Pop-in effect for icons/badges
 */
export const scaleInVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: EASING_FUNCTIONS.xpIncrement,
    },
  },
}

/**
 * Reduced Motion Variants (WCAG AAA)
 * Instant transitions for prefers-reduced-motion users
 */
export const reducedMotionVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.01, // Instant
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.01, // Instant
    },
  },
}

/**
 * Create custom variants with dynamic values
 * Factory function for reusable variant patterns
 */
export function createCustomVariants(
  config: {
    duration?: number
    delay?: number
    ease?: number[]
    scale?: [number, number]
    opacity?: [number, number]
  }
): Variants {
  const {
    duration = 0.3,
    delay = 0,
    ease = EASING_FUNCTIONS.modalExit,
    scale = [0.95, 1],
    opacity = [0, 1],
  } = config

  return {
    hidden: {
      scale: scale[0],
      opacity: opacity[0],
    },
    visible: {
      scale: scale[1],
      opacity: opacity[1],
      transition: {
        duration,
        delay,
        ease,
      },
    },
  }
}
