/**
 * @file lib/utils/icons.ts
 * @description Icon Utilities - Chain Icons & Standardized Sizes
 * 
 * PHASE: Phase 6.2 - Utils Category Consolidation (December 17, 2025)
 * CONSOLIDATED FROM:
 *   - chain-icons.ts (Blockchain network icons for 12 chains)
 *   - icon-sizes.ts (Standardized icon sizes for UI hierarchy)
 * 
 * FEATURES:
 *   - Chain icon URLs for 12 Blockscout-supported networks
 *   - Standardized icon sizes (2xs → 5xl) for consistent UI
 *   - Chain icon resolution with aliases and fallbacks
 *   - Type-safe icon size constants
 * 
 * REFERENCE DOCUMENTATION:
 *   - LIB-REFACTOR-PLAN.md (Phase 6.2)
 *   - MINIAPP-LAYOUT-AUDIT.md v2.1 (Icon size standards)
 *   - lib/contracts/gmeow-utils.ts (Chain types)
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Base blockchain (primary)
 *   - Icons hosted on GitHub: https://github.com/0xheycat/image-
 *   - Support 12 Blockscout chains for OnchainStats frame
 * 
 * TODO:
 *   - [ ] Add fallback icons for unsupported chains
 *   - [ ] Optimize icon loading (preload, lazy load)
 *   - [ ] Add dark mode variants for chain icons
 *   - [ ] Consider CDN for faster icon delivery
 * 
 * CRITICAL:
 *   - Only Base chain has deployed contracts (GMChainKey)
 *   - Other 11 chains are view-only via Blockscout MCP
 *   - Icon URLs must be publicly accessible
 * 
 * SUGGESTIONS:
 *   - Add icon caching strategy
 *   - Consider SVG sprite for better performance
 *   - Add icon preloading for common chains (Base, Ethereum)
 * 
 * AVOID:
 *   - Hardcoding icon URLs in components
 *   - Using inconsistent icon sizes across UI
 *   - Loading all chain icons upfront (lazy load)
 */

import { CHAIN_LABEL } from '@/lib/contracts/gmeow-utils'

// ========================================
// Chain Icons (12 Blockscout-Supported Chains)
// ========================================

/**
 * Chain icon URLs hosted on GitHub
 * BLOCKSCOUT-SUPPORTED CHAINS ONLY (12 chains)
 * 
 * Base = Our deployed contracts (GMChainKey)
 * Others = View-only via Blockscout MCP (ChainKey)
 */
export const CHAIN_ICON_URLS: Record<string, string> = {
  base: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/base.svg',
  ethereum: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/eth.svg',
  optimism: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/op.svg',
  op: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/op.svg',
  arbitrum: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/arbitrum.svg',
  polygon: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/polygon.svg',
  gnosis: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/gnosis.svg',
  celo: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/celo.png',
  scroll: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/scroll.svg',
  unichain: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/unichain.png',
  soneium: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/soneium.png',
  zksync: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/zksync.svg',
  zora: 'https://raw.githubusercontent.com/0xheycat/image-/refs/heads/main/zora.svg',
}

/**
 * Get chain icon URL by chain key
 * Handles aliases (op → optimism) and normalizes chain labels
 * Returns empty string if chain not found
 * 
 * @param chainKey - Chain identifier (base, ethereum, etc.)
 * @returns Icon URL or empty string
 * 
 * @example
 * getChainIconUrl('base') // Returns Base chain icon
 * getChainIconUrl('op') // Returns Optimism icon (alias)
 * getChainIconUrl() // Returns Base icon (default)
 */
export function getChainIconUrl(chainKey?: string | null): string {
  if (!chainKey) return CHAIN_ICON_URLS.base || ''
  const lower = chainKey.toLowerCase()
  if (CHAIN_ICON_URLS[lower]) return CHAIN_ICON_URLS[lower]

  // Check aliases
  const aliasKey = Object.keys(CHAIN_ICON_URLS).find((key) => key.toLowerCase() === lower)
  if (aliasKey) return CHAIN_ICON_URLS[aliasKey]

  // Try to normalize via CHAIN_LABEL
  const normalized = Object.entries(CHAIN_LABEL as Record<string, string>).find(([, label]) => label.toLowerCase() === lower)?.[0]
  if (normalized) {
    const normalizedLower = normalized.toLowerCase()
    if (CHAIN_ICON_URLS[normalizedLower]) return CHAIN_ICON_URLS[normalizedLower]
    if (CHAIN_ICON_URLS[normalized]) return CHAIN_ICON_URLS[normalized]
  }

  return ''
}

// ========================================
// Standardized Icon Sizes
// ========================================

/**
 * Standardized icon sizes for consistent visual hierarchy
 * Based on UI/UX audit recommendations (MINIAPP-LAYOUT-AUDIT.md v2.1)
 * 
 * Usage frequency and context:
 * - 2xs: Micro badges, minimal decoration (rare)
 * - xs: Inline badges, decorative elements
 * - sm: Compact buttons, labels, small UI elements
 * - md: Standard navigation, menu items
 * - lg: Tab bar, primary actions, featured elements (MOST COMMON - 25+ uses)
 * - xl: Section headers, hero icons, prominent features
 * - 2xl: Large profile icons, avatar badges
 * - 3xl: Badge display modals, large decorative icons
 * - 4xl: Hero sections, prominent feature displays
 * - 5xl: Extra large heroes, splash screens
 */
export const ICON_SIZES = {
  '2xs': 12, // Micro badges, minimal decoration
  xs: 14,    // Badges, inline icons
  sm: 16,    // Compact UI, secondary actions
  md: 18,    // Navigation, menu items
  lg: 20,    // Tab bar, primary buttons (MOST COMMON)
  xl: 24,    // Headers, featured elements
  '2xl': 32, // Large profile icons
  '3xl': 48, // Badge display, large modals
  '4xl': 64, // Hero badges, prominent displays
  '5xl': 80, // Extra large heroes, splash
} as const

export type IconSize = keyof typeof ICON_SIZES

/**
 * Get icon size value by key
 * Type-safe access to standardized icon sizes
 * 
 * @param size - Icon size key (2xs, xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl)
 * @returns Icon size in pixels
 * 
 * @example
 * <Icon size={getIconSize('md')} />
 * <ChainIcon size={getIconSize('lg')} />
 */
export function getIconSize(size: IconSize): number {
  return ICON_SIZES[size]
}

/**
 * Get recommended icon size for specific UI context
 * Provides semantic naming for common use cases
 * 
 * @param context - UI context
 * @returns Icon size in pixels
 * 
 * @example
 * getIconSizeForContext('button') // 20px (lg)
 * getIconSizeForContext('badge') // 14px (xs)
 */
export function getIconSizeForContext(
  context: 'badge' | 'button' | 'navigation' | 'header' | 'avatar' | 'hero'
): number {
  const contextMap: Record<string, IconSize> = {
    badge: 'xs',
    button: 'lg',
    navigation: 'md',
    header: 'xl',
    avatar: '2xl',
    hero: '4xl',
  }
  return ICON_SIZES[contextMap[context] || 'md']
}
