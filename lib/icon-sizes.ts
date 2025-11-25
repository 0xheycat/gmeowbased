/**
 * Standardized icon sizes for consistent visual hierarchy
 * Based on UI/UX audit recommendations (MINIAPP-LAYOUT-AUDIT.md v2.1)
 * 
 * Usage frequency and context:
 * - xs: Inline badges, decorative elements (minimal UI)
 * - sm: Compact buttons, labels, small UI elements
 * - md: Standard navigation, menu items
 * - lg: Tab bar, primary actions, featured elements (MOST COMMON - 25+ uses)
 * - xl: Section headers, hero icons, prominent features
 * - 2xl: Large profile icons, avatar badges
 * - 3xl: Badge display modals, large decorative icons
 * - 4xl: Hero sections, prominent feature displays
 */
export const ICON_SIZES = {
  '2xs': 12, // Micro badges, minimal decoration
  xs: 14,   // Badges, inline icons
  sm: 16,   // Compact UI, secondary actions
  md: 18,   // Navigation, menu items
  lg: 20,   // Tab bar, primary buttons (MOST COMMON)
  xl: 24,   // Headers, featured elements
  '2xl': 32, // Large profile icons
  '3xl': 48, // Badge display, large modals
  '4xl': 64, // Hero badges, prominent displays
  '5xl': 80, // Extra large heroes, splash
} as const

export type IconSize = keyof typeof ICON_SIZES

/**
 * Get icon size value by key
 * @example
 * <Icon size={getIconSize('md')} />
 */
export function getIconSize(size: IconSize): number {
  return ICON_SIZES[size]
}
