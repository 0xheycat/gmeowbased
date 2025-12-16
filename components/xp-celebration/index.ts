/**
 * XP Celebration System - Module Exports
 * 
 * Barrel export file for all XP celebration components
 * Provides clean import paths for consumers
 * 
 * PHASE: Phase 1 - Component Creation (Week 1)
 * DATE: December 14, 2025
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

// Main modal component
export { XPCelebrationModal } from './XPCelebrationModal'

// Sub-components (exported for individual use if needed)
export { CircularProgress } from './CircularProgress'
export { XPCounter } from './XPCounter'
export { ConfettiCanvas } from './ConfettiCanvas'
export { TierBadge } from './TierBadge'
export { ShareButton } from './ShareButton'

// Types and constants
export type {
  XpEventKind,
  TierCategory,
  TierColors,
  CircularProgressProps,
  XPCounterProps,
  Particle,
  ConfettiCanvasProps,
  TierBadgeProps,
  ShareButtonProps,
  XPCelebrationModalProps,
  AnimationState,
  MotionVariants,
} from './types'

export {
  TIER_COLOR_SCHEMES,
  ACCESSIBLE_COLORS,
  ANIMATION_TIMINGS,
  EASING_FUNCTIONS,
} from './types'

// Animation variants (for advanced customization)
export {
  modalVariants,
  mobileSheetVariants,
  progressRingVariants,
  xpCounterVariants,
  tierBadgeVariants,
  buttonVariants,
  staggerContainerVariants,
  staggerItemVariants,
  glowPulseVariants,
  shimmerVariants,
  fadeInUpVariants,
  scaleInVariants,
  reducedMotionVariants,
  createCustomVariants,
} from './animations'
