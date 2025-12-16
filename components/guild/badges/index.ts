/**
 * Badge System Barrel Export
 * 
 * Centralized exports for the badge achievement system.
 * Import everything from this file for convenience.
 * 
 * @example
 * ```tsx
 * import { BadgeIcon, BadgeShowcase, SAMPLE_BADGES } from '@/components/guild/badges'
 * ```
 */

// Core components
export { BadgeIcon, BadgeRarityLabel, getBadgeRarityColor } from './BadgeIcon'
export { BadgeShowcase, BadgeGrid, BadgeCategory } from './BadgeShowcase'
export { BadgeShowcaseDemo, SAMPLE_BADGES } from './BadgeShowcaseDemo'

// Type definitions
export type {
  Badge,
  BadgeRarity,
  BadgeCategory as BadgeCategoryType,
  BadgeSize,
} from './BadgeIcon'
