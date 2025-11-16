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
  | 'leaderboard' 
  | 'gm' 
  | 'verify' 
  | 'onchainstats' 
  | 'generic'

const VALID_FRAME_TYPES: FrameType[] = [
  'quest',
  'guild',
  'points',
  'referral',
  'leaderboard',
  'gm',
  'verify',
  'onchainstats',
  'generic',
]

export function sanitizeFrameType(type: unknown): FrameType | null {
  if (!type) return null
  
  const str = String(type).toLowerCase().trim()
  
  if (!VALID_FRAME_TYPES.includes(str as FrameType)) return null
  
  return str as FrameType
}

/**
 * Sanitize URL to prevent injection
 */
export function sanitizeUrl(url: unknown): string | null {
  if (!url) return null
  
  const str = String(url).trim()
  
  // Must start with http:// or https://
  if (!str.startsWith('http://') && !str.startsWith('https://')) {
    return null
  }
  
  try {
    const parsed = new URL(str)
    
    // Basic security checks
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
 * Sanitize and enforce button limits
 */
export function sanitizeButtons<T>(buttons: T[]): {
  buttons: T[]
  truncated: boolean
  originalCount: number
} {
  const originalCount = buttons.length
  const truncated = originalCount > MAX_FRAME_BUTTONS
  const sanitized = buttons.slice(0, MAX_FRAME_BUTTONS)
  
  if (truncated) {
    console.warn(
      `[FRAME_VALIDATION] Button count exceeded: ${originalCount} buttons provided, truncated to ${MAX_FRAME_BUTTONS}`
    )
  }
  
  return {
    buttons: sanitized,
    truncated,
    originalCount,
  }
}
