// lib/frame-validation.ts
/**
 * Input validation and sanitization for Farcaster frames
 * Implements GI-8 security requirements
 */

import { CHAIN_KEYS, type ChainKey } from './gm-utils'

/**
 * Sanitize and validate Farcaster FID
 * @returns Valid FID (1 to 2^31-1) or null if invalid
 */
export function sanitizeFID(fid: unknown): number | null {
  if (fid === null || fid === undefined) return null
  
  const num = Number(fid)
  
  // Must be finite, positive integer within 32-bit range
  if (!Number.isFinite(num)) return null
  if (num <= 0) return null
  if (num > 2147483647) return null // 2^31 - 1
  
  return Math.floor(num)
}

/**
 * Sanitize and validate quest ID
 * @returns Valid quest ID (0 to 999999) or null if invalid
 */
export function sanitizeQuestId(questId: unknown): number | null {
  if (questId === null || questId === undefined) return null
  
  const num = Number(questId)
  
  // Must be finite, non-negative integer within reasonable range
  if (!Number.isFinite(num)) return null
  if (num < 0) return null
  if (num > 999999) return null // Reasonable upper bound
  
  return Math.floor(num)
}

/**
 * Sanitize and validate chain key
 * @returns Valid ChainKey or null if invalid
 */
export function sanitizeChainKey(chain: unknown): ChainKey | null {
  if (!chain) return null
  
  const str = String(chain).toLowerCase().trim()
  
  if (!str) return null
  if (!CHAIN_KEYS.includes(str as ChainKey)) return null
  
  return str as ChainKey
}

/**
 * Sanitize and validate frame type
 */
export type FrameType = 
  | 'quest' 
  | 'guild' 
  | 'points' 
  | 'referral' 
  | 'leaderboards' 
  | 'gm' 
  | 'verify' 
  | 'onchainstats' 
  | 'badge'
  | 'generic'

const VALID_FRAME_TYPES: FrameType[] = [
  'quest',
  'guild',
  'points',
  'referral',
  'leaderboards',
  'gm',
  'verify',
  'onchainstats',
  'badge',
  'generic',
]

export function sanitizeFrameType(type: unknown): FrameType | null {
  if (!type) return null
  
  const str = String(type).toLowerCase().trim()
  
  if (!VALID_FRAME_TYPES.includes(str as FrameType)) return null
  
  return str as FrameType
}

/**
 * Sanitize splash image URL
 * 
 * Official Farcaster Miniapp Specification:
 * - Max URL length: 32 characters
 * - Must be 200x200px PNG image
 * - No alpha channel required
 * 
 * Source: https://miniapps.farcaster.xyz/docs/specification
 * MCP-Verified: November 19, 2025
 */
export function sanitizeSplashImageUrl(url: unknown): string | null {
  if (!url) return null
  
  const str = String(url).trim()
  
  // Enforce max 32 character limit for splash image URL
  if (str.length > 32) {
    return null
  }
  
  // Must start with http:// or https://
  if (!str.startsWith('http://') && !str.startsWith('https://')) {
    return null
  }
  
  try {
    const parsed = new URL(str)
    
    // Only allow HTTP/HTTPS protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    
    return parsed.href
  } catch {
    return null
  }
}

/**
 * Sanitize URL to prevent injection and enforce security requirements
 * 
 * Official Farcaster Miniapp Specification:
 * - HTTPS required in production
 * - Max URL length: 1024 characters
 * 
 * Source: https://miniapps.farcaster.xyz/docs/specification
 * MCP-Verified: November 19, 2025
 */
export function sanitizeUrl(url: unknown, options?: { allowHttp?: boolean; maxLength?: number }): string | null {
  if (!url) return null
  
  const str = String(url).trim()
  const maxLength = options?.maxLength ?? 1024 // Default per Farcaster spec
  const allowHttp = options?.allowHttp ?? false // HTTPS-only by default
  
  // Enforce URL length limit (Farcaster spec: max 1024 chars)
  if (str.length > maxLength) {
    return null
  }
  
  // Must start with http:// or https://
  if (!str.startsWith('http://') && !str.startsWith('https://')) {
    return null
  }
  
  try {
    const parsed = new URL(str)
    
    // Security: HTTPS-only in production (unless explicitly allowed)
    if (parsed.protocol === 'http:' && !allowHttp) {
      return null
    }
    
    // Only allow HTTP/HTTPS protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    
    return parsed.href
  } catch {
    return null
  }
}

/**
 * Enforce frame button limits per Farcaster vNext spec
 */
export const MAX_FRAME_BUTTONS = 4

export function validateButtonCount(buttons: unknown[]): {
  valid: boolean
  count: number
  message?: string
} {
  const count = buttons.length
  
  if (count === 0) {
    return {
      valid: false,
      count,
      message: 'Frame must have at least 1 button',
    }
  }
  
  if (count > MAX_FRAME_BUTTONS) {
    return {
      valid: false,
      count,
      message: `Frame has ${count} buttons (max ${MAX_FRAME_BUTTONS})`,
    }
  }
  
  return {
    valid: true,
    count,
  }
}

/**
 * Sanitize and enforce button limits per Farcaster spec
 * 
 * Official Farcaster Miniapp Specification:
 * - Max 4 buttons per frame
 * - Button title: max 32 characters
 * - Action URL: max 1024 characters
 * 
 * Source: https://miniapps.farcaster.xyz/docs/specification
 * MCP-Verified: November 19, 2025
 */
export function sanitizeButtons<T extends { label?: string; target?: string }>(buttons: T[]): {
  buttons: T[]
  truncated: boolean
  originalCount: number
  invalidTitles: string[]
} {
  const originalCount = buttons.length
  const truncated = originalCount > MAX_FRAME_BUTTONS
  const invalidTitles: string[] = []
  
  // Enforce button count limit (max 4)
  const limitedButtons = buttons.slice(0, MAX_FRAME_BUTTONS)
  
  // Validate button title lengths (max 32 chars per Farcaster spec)
  const sanitized = limitedButtons.map((button, index) => {
    if (button.label && button.label.length > 32) {
      const truncatedLabel = button.label.substring(0, 32)
      invalidTitles.push(`Button ${index + 1}: "${button.label}" (${button.label.length} chars) → truncated to "${truncatedLabel}"`)
      return { ...button, label: truncatedLabel }
    }
    return button
  })
  
  if (truncated) {
      `[FRAME_VALIDATION] Button count exceeded: ${originalCount} buttons provided, truncated to ${MAX_FRAME_BUTTONS}`
    )
  }
  
  if (invalidTitles.length > 0) {
      `[FRAME_VALIDATION] Button title length violations (max 32 chars):`,
      invalidTitles
    )
  }
  
  return {
    buttons: sanitized,
    truncated,
    originalCount,
    invalidTitles,
  }
}
