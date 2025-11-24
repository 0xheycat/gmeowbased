/**
 * Standardized icon sizes for consistent visual hierarchy
 * Based on UI/UX audit recommendations (MINIAPP-LAYOUT-AUDIT.md v2.1)
 * 
 * Usage frequency and context:
 * - xs: Inline badges, decorative elements (minimal UI)
 * - sm: Compact buttons, labels, small UI elements
 * - md: Standard navigation, menu items (DEFAULT for most cases)
 * - lg: Tab bar, primary actions, featured elements
 * - xl: Section headers, hero icons, prominent features
 */
export const ICON_SIZES = {
  xs: 14,  // Badges, inline icons
  sm: 16,  // Compact UI, secondary actions
  md: 18,  // Navigation, menu items (DEFAULT)
  lg: 20,  // Tab bar, primary buttons
  xl: 24,  // Headers, featured elements
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
