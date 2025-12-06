import { motion } from 'framer-motion'

/**
 * TabSwitchAnimation - LinkedIn-style micro-interaction for tab transitions
 * 
 * Pattern: LinkedIn smooth transitions with subtle scale and fade
 * Used by: ProfileTabs component for active tab indicator
 */
export const tabIndicatorVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

export const tabIndicatorTransition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
}

/**
 * BadgeUnlockAnimation - Celebration animation for newly earned badges
 * 
 * Pattern: Discord badge unlock with glow pulse and scale bounce
 * Used by: BadgeCollection when badge.earned transitions from false → true
 */
export const badgeUnlockVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: [0.8, 1.2, 0.95, 1],
    opacity: 1,
  },
  exit: { scale: 0.8, opacity: 0 },
}

export const badgeUnlockTransition = {
  duration: 0.6,
  times: [0, 0.3, 0.7, 1],
  ease: 'easeOut',
}

/**
 * QuestCompleteAnimation - Celebration for quest completion
 * 
 * Pattern: Twitter success checkmark with slide-in from right
 * Used by: Quest items when status changes to 'completed'
 */
export const questCompleteVariants = {
  initial: { x: 20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -20, opacity: 0 },
}

export const questCompleteTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
}

/**
 * ProfileSectionAnimation - Smooth content transitions
 * 
 * Pattern: LinkedIn smooth section reveals with slide-up
 * Used by: Profile tab content panels when switching tabs
 */
export const profileSectionVariants = {
  initial: { y: 10, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -10, opacity: 0 },
}

export const profileSectionTransition = {
  duration: 0.3,
  ease: 'easeInOut',
}

/**
 * ActivityItemAnimation - Staggered activity feed entries
 * 
 * Pattern: LinkedIn activity feed with subtle stagger delay
 * Used by: Activity feed items for smooth reveal
 */
export const activityItemVariants = {
  initial: { x: -10, opacity: 0 },
  animate: { x: 0, opacity: 1 },
}

export const activityStaggerTransition = {
  delayChildren: 0.1,
  staggerChildren: 0.05,
}

/**
 * HoverScaleAnimation - Subtle scale on hover
 * 
 * Pattern: Twitter/GitHub subtle hover feedback
 * Used by: Buttons, cards, interactive elements
 */
export const hoverScaleVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
}

export const hoverScaleTransition = {
  type: 'spring',
  stiffness: 400,
  damping: 20,
}

/**
 * GlowPulseAnimation - Tier-based glow effect
 * 
 * Pattern: Discord badge glow with pulsing animation
 * Used by: Badge cards on hover for tier emphasis
 */
export const glowPulseVariants = {
  initial: { opacity: 0.3 },
  animate: {
    opacity: [0.3, 0.6, 0.3],
  },
}

export const glowPulseTransition = {
  duration: 2,
  repeat: Infinity,
  ease: 'easeInOut',
}

/**
 * SkeletonPulseAnimation - Loading state animation
 * 
 * Pattern: LinkedIn skeleton loader with shimmer
 * Used by: Loading skeletons throughout profile
 */
export const skeletonPulseVariants = {
  initial: { opacity: 0.4 },
  animate: {
    opacity: [0.4, 0.7, 0.4],
  },
}

export const skeletonPulseTransition = {
  duration: 1.5,
  repeat: Infinity,
  ease: 'easeInOut',
}

/**
 * FadeInAnimation - Simple fade-in for page loads
 * 
 * Pattern: Universal smooth entrance
 * Used by: Page containers, modals
 */
export const fadeInVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const fadeInTransition = {
  duration: 0.2,
}

/**
 * SlideInFromBottomAnimation - Bottom sheet style reveal
 * 
 * Pattern: Twitter bottom sheets (mobile)
 * Used by: Mobile modals, bottom actions
 */
export const slideInFromBottomVariants = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
}

export const slideInFromBottomTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}
