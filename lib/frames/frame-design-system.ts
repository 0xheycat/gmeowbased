/**
 * @file lib/frames/frame-design-system.ts
 * @description Unified design system for Farcaster frame image generation
 * 
 * PHASE: Phase 7.3 - Frames (December 17, 2025)
 * ENHANCED: Existing documentation upgraded with comprehensive Phase 7 header
 * 
 * ORIGINAL: Frame Design System - Phase 2 Layer 1
 * Unified typography, colors, and layout constants for all frame image generation
 * 
 * Phase 2 Updates:
 * - Premium font stack using app/fonts (Gmeow)
 * - Enhanced typography controls (letter-spacing, line-height, text-shadow)
 * - FRAME_FONTS_V2 with semantic naming (display, h1, h2, h3)
 * 
 * FEATURES:
 *   - Premium font stack (Gmeow from app/fonts)
 *   - Semantic typography scale (display, h1, h2, h3, body, caption)
 *   - Comprehensive color system (GM, guild, badge, referral themes)
 *   - Layout constants (spacing, dimensions, borders)
 *   - Text styling utilities (shadows, letter-spacing, line-height)
 *   - Button states and variants
 *   - Gradient definitions for backgrounds
 * 
 * Note: PixelifySans-Bold removed in commit 419276f (bundle optimization)
 * 
 * REFERENCE DOCUMENTATION:
 *   - Frame fonts: lib/frames/frame-fonts.ts
 *   - HTML builder: lib/frames/html-builder.ts
 *   - Frame handlers: lib/frames/handlers/
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Fonts must be loaded via loadFonts() in frame API routes
 *   - NO HARDCODED COLORS (use FRAME_COLORS constants)
 *   - NO EMOJIS in frame text
 *   - All dimensions in pixels for consistency
 * 
 * Usage:
 * ```typescript
 * import { FRAME_FONTS_V2, FRAME_FONT_FAMILY, FRAME_COLORS } from '@/lib/frame-design-system'
 * 
 * <div style={{ fontFamily: FRAME_FONT_FAMILY.display, fontSize: FRAME_FONTS_V2.h1 }}>Title</div>
 * <div style={{ color: FRAME_COLORS.gm.primary }}>Content</div>
 * ```
 * 
 * TODO:
 *   - [ ] Add dark mode color variants
 *   - [ ] Add responsive typography scale
 *   - [ ] Add animation constants (durations, easings)
 *   - [ ] Add accessibility contrast checker
 *   - [ ] Add color palette generator for new themes
 *   - [ ] Add design token documentation generator
 * 
 * CRITICAL:
 *   - Colors must meet WCAG contrast requirements
 *   - Fonts must be preloaded to avoid FOUT/FOIT
 *   - All constants must be frozen (as const)
 *   - Breaking changes require version bump
 *   - Design tokens must be single source of truth
 * 
 * SUGGESTIONS:
 *   - Add theme provider for dynamic color switching
 *   - Generate CSS variables from design tokens
 *   - Add design system documentation site
 *   - Implement design token validation tests
 *   - Add Figma plugin for token export
 * 
 * AVOID:
 *   - Hardcoding colors in frame handlers (use constants)
 *   - Mixing font families within single frame
 *   - Using non-semantic color names (use theme-based)
 *   - Breaking changes to exported constants
 *   - Adding colors that don't meet contrast requirements
 */

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

/**
 * Phase 2: Premium Font Stack
 * Uses Gmeow font from app/fonts/ directory (loaded via loadFonts() in frame API route)
 */
export const FRAME_FONT_FAMILY = {
  /** Display font for headers and titles (Gmeow with higher weight) */
  display: 'Gmeow',
  
  /** Body font for standard text (Gmeow) */
  body: 'Gmeow',
  
  /** Fallback system fonts */
  fallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
} as const

/**
 * Phase 2: Enhanced font scale with semantic naming
 * Replaces hardcoded sizes (28, 24, 20) with semantic tokens
 */
export const FRAME_FONTS_V2 = {
  /** Hero text (32px) - For special emphasis */
  display: 32,
  
  /** H1 Frame titles (28px) - Main frame titles */
  h1: 28,
  
  /** H2 Primary values (24px) - Stats, numbers */
  h2: 24,
  
  /** H3 Identity headers (20px) - Username, identity */
  h3: 20,
  
  /** Body text (14px) - Standard text */
  body: 14,
  
  /** Labels (12px) - Uppercase labels */
  label: 12,
  
  /** Caption (10px) - Secondary info */
  caption: 10,
  
  /** Micro text (9px) - Footer, fine print */
  micro: 9,
} as const

/**
 * Legacy font scale (Phase 1F)
 * Kept for backward compatibility, prefer FRAME_FONTS_V2
 * @deprecated Use FRAME_FONTS_V2 for new code
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
 * Phase 2: Typography controls for premium feel
 */
export const FRAME_TYPOGRAPHY = {
  /** Letter spacing for different text styles */
  letterSpacing: {
    tight: '-0.03em',   // Display, H1, H2 (premium tight)
    normal: '-0.01em',  // H3, body
    wide: '0.05em',     // Labels (uppercase tracking)
  },
  
  /** Line height for readability */
  lineHeight: {
    tight: 1.1,         // Display, H1
    normal: 1.4,        // Body, caption
    loose: 1.6,         // Long-form text
  },
  
  /** Text shadow presets */
  textShadow: {
    /** Glow effect with color parameter */
    glow: (color: string) => `0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px ${color}60`,
    /** Strong drop shadow */
    strong: '0 2px 8px rgba(0, 0, 0, 0.9)',
    /** Subtle shadow */
    subtle: '0 1px 2px rgba(0, 0, 0, 0.5)',
  },
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
// LAYOUT SYSTEM
// ============================================================================

/**
 * Phase 2: Spacing constants for consistent layout
 * Replaces hardcoded padding/gap/margin values
 */
export const FRAME_SPACING = {
  /** Container padding (main frame wrapper) */
  container: 14,
  
  /** Section spacing */
  section: {
    /** Between major sections (16px) */
    large: 16,
    /** Between components (12px) */
    medium: 12,
    /** Between related items (10px) */
    small: 10,
    /** Between inline elements (8px) */
    inline: 8,
    /** Tight spacing for compact layouts (6px) */
    tight: 6,
    /** Minimal spacing (2px) */
    minimal: 2,
  },
  
  /** Padding values */
  padding: {
    /** Large padding (12-20px) for prominent sections */
    large: '12px 20px',
    /** Medium padding (8-16px) for standard sections */
    medium: '8px 16px',
    /** Small padding (5-12px) for compact elements */
    small: '5px 12px',
    /** Minimal padding (4-10px) for tight layouts */
    minimal: '4px 10px',
    /** Card/box padding (10-12px) */
    box: '10px 12px',
    /** Stat box padding (8-10px) */
    stat: '8px 10px',
  },
  
  /** Margin values */
  margin: {
    /** Top margin for footer (12px) */
    footer: 12,
    /** Bottom margin for headers (12px) */
    header: 12,
    /** Section separation (14px) */
    section: 14,
  },
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
// ADVANCED COLOR SYSTEM (Task 6)
// ============================================================================

/**
 * Background gradient generators per frame type
 * Usage: buildBackgroundGradient('gm') or buildBackgroundGradient('gm', 'card')
 */
export function buildBackgroundGradient(
  frameType: keyof typeof FRAME_COLORS,
  variant: 'page' | 'card' = 'page'
): string {
  const colors = FRAME_COLORS[frameType]
  
  if (variant === 'card') {
    // Card gradient (semi-transparent, darker)
    return `linear-gradient(145deg, rgba(15, 15, 17, 0.75) 0%, rgba(10, 10, 12, 0.85) 100%)`
  }
  
  // Page gradient (full opacity, colored based on frame bg)
  const bgBase = colors.bg
  return `linear-gradient(135deg, #0a0a0a 0%, ${bgBase} 30%, ${adjustBrightness(bgBase, 0.8)} 60%, #0a0a0a 100%)`
}

/**
 * Box shadow generators with frame-specific glow colors
 * Usage: buildBoxShadow('gm', 'card') or buildBoxShadow('gm', 'badge')
 */
export function buildBoxShadow(
  frameType: keyof typeof FRAME_COLORS,
  variant: 'card' | 'badge' | 'stat' | 'button' = 'card'
): string {
  const colors = FRAME_COLORS[frameType]
  const primaryGlow = `${colors.primary}90`
  
  switch (variant) {
    case 'card':
      // Main card shadow with colored glow
      return `0 0 0 2px rgba(0, 0, 0, 0.5), 0 0 40px ${primaryGlow}, 0 10px 50px rgba(0, 0, 0, 0.8)`
    
    case 'badge':
      // Smaller glow for badge elements
      return `0 0 12px ${colors.primary}`
    
    case 'stat':
      // Subtle shadow for stat boxes
      return `0 4px 16px rgba(0, 0, 0, 0.4)`
    
    case 'button':
      // Button hover/active shadow
      return `0 4px 16px ${colors.primary}80`
    
    default:
      return `0 2px 8px rgba(0, 0, 0, 0.3)`
  }
}

/**
 * Overlay color generators for stat boxes, info cards
 * Usage: buildOverlay('gm', 0.1) for 10% opacity overlay
 */
export function buildOverlay(
  frameType: keyof typeof FRAME_COLORS,
  opacity: number = 0.1
): string {
  const colors = FRAME_COLORS[frameType]
  // Extract RGB from hex and apply opacity
  const hex = colors.primary.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/**
 * Border effect generators with glow and accent colors
 * Usage: buildBorderEffect('gm', 'solid') or buildBorderEffect('gm', 'glow')
 */
export function buildBorderEffect(
  frameType: keyof typeof FRAME_COLORS,
  variant: 'solid' | 'glow' | 'accent' | 'subtle' = 'solid'
): { border: string; boxShadow?: string } {
  const colors = FRAME_COLORS[frameType]
  
  switch (variant) {
    case 'solid':
      return {
        border: `4px solid ${colors.primary}`,
        boxShadow: `0 8px 32px ${buildOverlay(frameType, 0.3)}, inset 0 0 0 1px ${buildOverlay(frameType, 0.1)}`
      }
    
    case 'glow':
      return {
        border: `2px solid ${colors.primary}`,
        boxShadow: `0 0 20px ${colors.primary}80`
      }
    
    case 'accent':
      return {
        border: `2px solid ${colors.accent}`,
        boxShadow: `0 0 12px ${colors.accent}60`
      }
    
    case 'subtle':
      return {
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }
    
    default:
      return { border: `2px solid ${colors.primary}` }
  }
}

/**
 * Helper: Adjust hex color brightness
 * @param hex - Color in #RRGGBB format
 * @param factor - Brightness multiplier (0-1 darker, >1 lighter)
 */
function adjustBrightness(hex: string, factor: number): string {
  const sanitized = hex.replace('#', '')
  const r = Math.min(255, Math.floor(parseInt(sanitized.substring(0, 2), 16) * factor))
  const g = Math.min(255, Math.floor(parseInt(sanitized.substring(2, 4), 16) * factor))
  const b = Math.min(255, Math.floor(parseInt(sanitized.substring(4, 6), 16) * factor))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

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
 * Build simple box shadow style (legacy helper)
 * @deprecated Use buildBoxShadow(frameType, variant) from Task 6 instead
 */
export function buildSimpleBoxShadow(color: string, opacity: number = 0.3): string {
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
