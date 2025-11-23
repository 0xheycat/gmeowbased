/**
 * Frame Design System - Phase 1F Layer 2
 * Unified typography, colors, and layout constants for all frame image generation
 * 
 * Usage:
 * ```typescript
 * import { FRAME_FONTS, FRAME_COLORS, FRAME_LAYOUT } from '@/lib/frame-design-system'
 * 
 * <div style={{ fontSize: FRAME_FONTS.identity }}>@username</div>
 * <div style={{ color: FRAME_COLORS.gm.primary }}>Content</div>
 * ```
 */

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

/**
 * Standardized font scale for all frame images
 * Ensures consistent hierarchy across all 9 frame types
 */
export const FRAME_FONTS = {
  /** Username header / primary identity (20px) */
  identity: 20,
  
  /** Main stat value / frame title (18px) */
  title: 18,
  
  /** Secondary stats / subtitles (16px) */
  subtitle: 16,
  
  /** Tertiary stats / small values (14px) */
  body: 14,
  
  /** Uppercase labels (12px) */
  label: 12,
  
  /** Footer attribution / context (10px) */
  caption: 10,
  
  /** Extra small text (9px) */
  micro: 9,
} as const

/**
 * Font weights for emphasis
 */
export const FRAME_WEIGHTS = {
  normal: 400,
  medium: 600,
  bold: 700,
  black: 900,
} as const

// ============================================================================
// COLOR SYSTEM
// ============================================================================

/**
 * Frame type-specific color palettes
 * Each frame has primary/secondary gradient colors + background
 */
export const FRAME_COLORS = {
  gm: {
    primary: '#7CFF7A',
    secondary: '#9bffaa',
    bg: '#052010',
    accent: '#ffd700',
  },
  quest: {
    primary: '#61DFFF',
    secondary: '#8dddff',
    bg: '#052030',
    accent: '#ffb700',
  },
  onchainstats: {
    primary: '#00d4ff',
    secondary: '#5ae4ff',
    bg: '#051520',
    accent: '#ffd700',
  },
  points: {
    primary: '#10b981',  // Emerald
    secondary: '#06b6d4', // Cyan
    bg: '#0a1a1a',
    accent: '#ffd700',
  },
  badge: {
    primary: '#d4af37',  // Gold
    secondary: '#c77dff', // Violet
    bg: '#0a0a0a',
    accent: '#ffd700',
  },
  leaderboards: {
    primary: '#ffd700',
    secondary: '#ffed4e',
    bg: '#201a05',
    accent: '#ff6b6b',
  },
  guild: {
    primary: '#4da3ff',  // Blue
    secondary: '#7dbaff',
    bg: '#0a1a2a',
    accent: '#ffd700',
  },
  verify: {
    primary: '#7CFF7A',  // Green
    secondary: '#a0ffa0',
    bg: '#052010',
    accent: '#5ad2ff',
  },
  referral: {
    primary: '#ff6b9d',  // Pink
    secondary: '#ff8db4',
    bg: '#200510',
    accent: '#ffd700',
  },
} as const

/**
 * Badge tier colors (matches badge system exactly)
 */
export const TIER_COLORS = {
  mythic: '#9C27FF',      // Purple
  legendary: '#FFD966',   // Gold
  epic: '#61DFFF',        // Blue
  rare: '#A18CFF',        // Light purple
  common: '#D3D7DC',      // Gray
} as const

/**
 * Shared UI colors across all frames
 */
export const SHARED_COLORS = {
  gold: '#ffd700',
  goldLight: '#ffed4e',
  white: '#ffffff',
  black: '#000000',
  darkBg: '#0a0a0a',
  cardBg: 'rgba(30, 30, 32, 0.6)',
  cardBorder: 'rgba(255, 255, 255, 0.2)',
} as const

// ============================================================================
// LAYOUT SYSTEM
// ============================================================================

/**
 * Standard frame image dimensions and layout constants
 */
export const FRAME_LAYOUT = {
  /** Image canvas size (1200x800) */
  width: 1200,
  height: 800,
  
  /** Yu-Gi-Oh! card container (540x360 centered) */
  cardWidth: 540,
  cardHeight: 360,
  cardPadding: 14,
  cardBorderRadius: 12,
  cardBorderWidth: 4,
  
  /** Icon sizes */
  iconLarge: 180,    // Guild, Verify (prominent icons)
  iconMedium: 120,   // Badge, Points (standard icons)
  iconSmall: 60,     // Chain icons, badges
  iconTiny: 24,      // Chain icons in headers
  
  /** Spacing */
  gapLarge: 16,
  gapMedium: 12,
  gapSmall: 10,
  gapTiny: 8,
  gapMicro: 6,
  
  /** Border radius */
  radiusLarge: 12,
  radiusMedium: 10,
  radiusSmall: 8,
  radiusMicro: 4,
} as const

// ============================================================================
// ATTRIBUTION & FOOTER PATTERNS
// ============================================================================

/**
 * Standard footer attribution pattern
 * Usage: buildFooterText(frameType, context)
 */
export function buildFooterText(frameType: string, context?: string): string {
  if (context) {
    return `@gmeowbased • ${context}`
  }
  
  // Default context per frame type
  const defaults: Record<string, string> = {
    gm: 'Daily GM Ritual',
    quest: 'Onchain Adventures',
    badge: 'Collect & Flex Your Achievements',
    points: 'Earn, Lock, Level Up',
    guild: 'Rally Your Squad',
    leaderboard: 'Multichain Rankings',
    verify: 'Verify & Earn',
    onchainstats: 'Onchain Identity',
    referral: 'Summon Frens',
  }
  
  return `@gmeowbased • ${defaults[frameType] || 'Onchain Adventures'}`
}

/**
 * Standard compose text pattern
 * Usage: buildComposeText(frameType, params)
 */
export function buildComposeText(frameType: string, params: {
  username?: string
  streak?: number
  gmCount?: number
  level?: number
  tier?: string
  chain?: string
  title?: string
  progress?: number
}): string {
  const { username, streak, gmCount, level, tier, chain, title, progress } = params
  
  if (frameType === 'gm') {
    // Achievement-based GM flex
    if (streak && streak >= 30 && level && level >= 20) {
      return `🔥 ${streak}-day streak + Level ${level} ${tier}! Unstoppable! @gmeowbased`
    }
    if (tier === 'Mythic GM') {
      return `👑 Mythic GM unlocked! ${gmCount} total GMs! Join the elite @gmeowbased`
    }
    if (streak && streak >= 30) {
      return `🔥 ${streak}-day GM streak! Legendary dedication! Join the meow squad @gmeowbased`
    }
    if (streak && streak >= 7) {
      return `⚡ ${streak}-day GM streak! Hot streak! Stack your daily ritual @gmeowbased`
    }
    if (gmCount && gmCount > 100) {
      return `🌅 ${gmCount} GMs and counting! Join the daily ritual @gmeowbased`
    }
    return '🌅 Just stacked my daily GM ritual! Join the meow squad @gmeowbased'
  }
  
  if (frameType === 'quest') {
    if (progress && progress >= 80) {
      return `⚔️ Almost done with "${title}"! ${progress}% complete on @gmeowbased`
    }
    return `⚔️ New quest unlocked${chain ? ` on ${chain}` : ''}! ${title || 'Check it out'} @gmeowbased`
  }
  
  if (frameType === 'badge') {
    return `🎖️ New badge earned${username ? ` by @${username}` : ''}! View the collection @gmeowbased`
  }
  
  if (frameType === 'points') {
    return `💰 Check out ${username ? `@${username}'s` : 'my'} gmeowbased Points balance @gmeowbased`
  }
  
  if (frameType === 'leaderboard') {
    return `🏆 Climbing the ranks${chain ? ` on ${chain}` : ''}! Check the leaderboard @gmeowbased`
  }
  
  if (frameType === 'guild') {
    return '🛡️ Guild quests are live! Rally your squad @gmeowbased'
  }
  
  if (frameType === 'referral') {
    return '🎁 Join me on gmeowbased! Share quests, earn rewards together @gmeowbased'
  }
  
  if (frameType === 'onchainstats') {
    return `📊 Flexing onchain stats${chain ? ` on ${chain}` : ''}! View my profile @gmeowbased`
  }
  
  if (frameType === 'verify') {
    return '✅ Verify your quests and unlock rewards @gmeowbased'
  }
  
  return '🎮 Explore quests, guilds, and onchain adventures @gmeowbased'
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build identity display with fallback chain
 * Priority: @username → displayName → 👤 0xABCD... → 👤 FID X → Anonymous
 */
export function buildIdentityDisplay(params: {
  username?: string | null
  displayName?: string | null
  address?: string | null
  fid?: number | null
}): string {
  const { username, displayName, address, fid } = params
  
  if (username) return `@${username}`
  if (displayName) return displayName
  if (address) {
    // Shorten address to 0xABCD...1234 format
    const shortened = `${address.slice(0, 6)}...${address.slice(-4)}`
    return `👤 ${shortened}`
  }
  if (fid) return `👤 FID ${fid}`
  return '👤 Anonymous'
}

/**
 * Format large numbers with commas (1,234,567)
 */
export function formatNumber(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) : num
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('en-US')
}

/**
 * Build gradient background style
 */
export function buildGradient(startColor: string, endColor: string, angle: number = 135): string {
  return `linear-gradient(${angle}deg, ${startColor}, ${endColor})`
}

/**
 * Build box shadow style
 */
export function buildBoxShadow(color: string, opacity: number = 0.3): string {
  return `0 8px 32px rgba(${hexToRgb(color)}, ${opacity}), inset 0 0 0 1px rgba(255, 255, 255, 0.1)`
}

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '0, 0, 0'
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type FrameType = keyof typeof FRAME_COLORS
export type TierType = keyof typeof TIER_COLORS
