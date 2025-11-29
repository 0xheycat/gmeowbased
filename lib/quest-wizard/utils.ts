/**
 * Quest Wizard Utilities
 * Extracted from old foundation (backups/pre-migration-20251126-213424)
 * 
 * Purpose: Provide utility functions for quest-related operations
 * including error handling, formatting, and MiniKit integration.
 */

import { parseSignInMessage } from '@coinbase/onchainkit/minikit'

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Format unknown error to user-friendly string
 */
export function formatUnknownError(error: unknown, fallback: string = 'An unknown error occurred'): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim()
  }
  return fallback
}

/**
 * Check if error is an AbortError (from fetch cancellation)
 */
export function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof DOMException) {
    return error.name === 'AbortError'
  }
  if (error instanceof Error) {
    return error.name === 'AbortError'
  }
  return false
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Shorten Ethereum address for display
 * @example shortenAddress('0x1234567890abcdef') // '0x1234…cdef'
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/**
 * Format large numbers with K/M/B suffixes
 * @example formatNumber(1500) // '1.5K'
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * Format timestamp to relative time
 * @example formatRelativeTime(Date.now() - 60000) // '1 minute ago'
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'just now'
}

// =============================================================================
// MINIKIT INTEGRATION
// =============================================================================

/**
 * Parsed MiniKit sign-in message type
 */
export type ParsedMiniKitSignIn = {
  message: string
  signature: string
  nonce: string
  resources: string[]
}

/**
 * Safely parse MiniKit sign-in message with error handling
 * @param message - Raw sign-in message string from MiniKit
 * @returns Parsed message or null if parsing fails
 */
export function safeParseSignInMessage(message: string): ParsedMiniKitSignIn | null {
  try {
    return parseSignInMessage(message) as any
  } catch (error) {
    console.warn('Failed to parse MiniKit sign-in message:', error)
    return null
  }
}

/**
 * Extract Farcaster FID from parsed MiniKit sign-in message
 * @param parsed - Parsed sign-in message from MiniKit
 * @returns FID number or null if not found
 */
export function extractFidFromSignIn(parsed: ParsedMiniKitSignIn | null): number | null {
  if (!parsed || !parsed.resources) return null
  
  for (const resource of parsed.resources) {
    if (typeof resource !== 'string') continue
    if (!resource.startsWith('farcaster://fid/')) continue
    
    const fidSegment = resource.slice('farcaster://fid/'.length)
    const fidValue = Number.parseInt(fidSegment, 10)
    
    if (Number.isFinite(fidValue) && fidValue > 0) {
      return fidValue
    }
  }
  
  return null
}

// =============================================================================
// SANITIZATION
// =============================================================================

/**
 * Sanitize username (remove @ prefix, trim, lowercase)
 */
export function sanitizeUsername(username: string): string {
  return username.replace(/^@/, '').trim().toLowerCase()
}

/**
 * Sanitize URL (ensure https://, remove trailing slash)
 */
export function sanitizeUrl(url: string): string {
  let cleaned = url.trim()
  
  // Add https:// if no protocol
  if (!cleaned.match(/^https?:\/\//)) {
    cleaned = `https://${cleaned}`
  }
  
  // Remove trailing slash
  cleaned = cleaned.replace(/\/$/, '')
  
  return cleaned
}

/**
 * Sanitize FID (ensure positive integer)
 */
export function sanitizeFid(fid: string | number): number | null {
  const parsed = typeof fid === 'string' ? parseInt(fid, 10) : fid
  return isNaN(parsed) || parsed <= 0 ? null : parsed
}

// =============================================================================
// TOKEN MATH
// =============================================================================

/**
 * Convert token amount with decimals to wei
 * @example toWei('1.5', 18) // '1500000000000000000'
 */
export function toWei(amount: string, decimals: number): string {
  const [integer, fraction = ''] = amount.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
  return integer + paddedFraction
}

/**
 * Convert wei to token amount with decimals
 * @example fromWei('1500000000000000000', 18) // '1.5'
 */
export function fromWei(wei: string, decimals: number): string {
  const paddedWei = wei.padStart(decimals + 1, '0')
  const integer = paddedWei.slice(0, -decimals) || '0'
  const fraction = paddedWei.slice(-decimals)
  return `${integer}.${fraction}`.replace(/\.?0+$/, '')
}

/**
 * Format token balance for display
 * @example formatTokenBalance('1500000000000000000', 18) // '1.5'
 */
export function formatTokenBalance(balance: string, decimals: number, maxDecimals: number = 4): string {
  const amount = fromWei(balance, decimals)
  const [integer, fraction = ''] = amount.split('.')
  
  if (!fraction || fraction === '0') return integer
  
  const truncatedFraction = fraction.slice(0, maxDecimals)
  return `${integer}.${truncatedFraction}`.replace(/\.?0+$/, '')
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Check if string is valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Check if string is valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Check if string is valid ISO date
 */
export function isValidISODate(date: string): boolean {
  const parsed = new Date(date)
  return !isNaN(parsed.getTime())
}

/**
 * Check if date is in the future
 */
export function isFutureDate(date: string): boolean {
  const parsed = new Date(date)
  return parsed.getTime() > Date.now()
}
