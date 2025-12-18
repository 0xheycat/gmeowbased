/**
 * @file lib/frames/utils.ts
 * @description Shared utility functions for frame system
 * 
 * PHASE: Phase 7.3 - Frames (December 17, 2025)
 * 
 * FEATURES:
 *   - Trace utilities for performance monitoring
 *   - Boolean flag helpers
 *   - Chain display name formatting
 *   - Cache validity checking
 *   - Cache key generation
 *   - Time calculation utilities
 * 
 * REFERENCE DOCUMENTATION:
 *   - Types: lib/frames/types.ts
 *   - Frame handlers: lib/frames/handlers/
 * 
 * REQUIREMENTS:
 *   - All utilities must be pure functions
 *   - No side effects in utility functions
 *   - Type-safe parameter handling
 *   - Performance-optimized implementations
 * 
 * TODO:
 *   - [ ] Add more date/time utilities
 *   - [ ] Add number formatting utilities
 *   - [ ] Add string truncation helpers
 *   - [ ] Add validation utilities
 *   - [ ] Add retry helpers
 *   - [ ] Add debounce/throttle utilities
 * 
 * CRITICAL:
 *   - Utilities must be stateless
 *   - No mutations of input parameters
 *   - All functions must handle edge cases
 *   - Type guards must be accurate
 *   - Cache keys must be unique and stable
 * 
 * SUGGESTIONS:
 *   - Add utility performance benchmarks
 *   - Generate utility documentation
 *   - Add utility usage examples
 *   - Group related utilities
 *   - Add utility testing suite
 * 
 * AVOID:
 *   - Stateful utilities (use classes instead)
 *   - Side effects in utility functions
 *   - Mutating input parameters
 *   - Using 'any' type
 *   - Complex logic in utilities (keep simple)
 */

/**
 * Frame System Utilities
 * Shared utility functions for frame handlers
 */

import type { Trace, TraceItem } from './types'

// -------------------- Trace Utilities --------------------

export function tracePush(traces: Trace, step: string, info?: any): void {
  traces.push({ ts: Date.now(), step, info })
}

export function traceTime(traces: Trace): number {
  if (traces.length < 2) return 0
  return traces[traces.length - 1].ts - traces[0].ts
}

// -------------------- Boolean Helpers --------------------

export function toBooleanFlag(val: unknown): boolean {
  if (val === true || val === 1 || val === '1' || val === 'true' || val === 'yes') {
    return true
  }
  return false
}

// -------------------- Chain Display --------------------

export function getChainDisplayName(chainKey: string): string {
  const map: Record<string, string> = {
    base: 'Base',
    op: 'Optimism',
    celo: 'Celo',
    unichain: 'Unichain',
    ink: 'Ink',
  }
  return map[chainKey.toLowerCase()] || chainKey
}

// -------------------- Sanitization --------------------

/**
 * Phase 8.8 NOTE: Different from lib/middleware/api-security.ts sanitizeString
 * - This version: Length limiting + type coercion (for frame params)
 * - Security version: XSS protection (removes HTML, JS, event handlers)
 * Both are legitimate - use security version for user input, this for frame data
 */
export function sanitizeString(val: unknown, maxLength = 200): string {
  if (typeof val !== 'string') return ''
  return val.slice(0, maxLength).trim()
}

export function sanitizeNumber(val: unknown, min = 0, max = 1000000): number {
  const num = Number(val)
  if (!Number.isFinite(num)) return min
  return Math.max(min, Math.min(max, Math.floor(num)))
}

// -------------------- URL Builders --------------------

export function buildFrameUrl(origin: string, type: string, params: Record<string, any> = {}): string {
  const url = new URL(`${origin}/api/frame`)
  url.searchParams.set('type', type)
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value))
    }
  }
  
  return url.toString()
}

// -------------------- Response Builders --------------------

export function buildHtmlResponse(html: string, headers: Record<string, string> = {}): Response {
  const defaultHeaders = {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': "frame-ancestors *; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://privy.farcaster.xyz https://wallet.farcaster.xyz https://*.farcaster.xyz https://*.base.dev; connect-src 'self' https://privy.farcaster.xyz https://wallet.farcaster.xyz https://*.farcaster.xyz https://api.neynar.com https://*.base.dev wss://*.farcaster.xyz; img-src 'self' data: https: blob:;",
    'x-frame-options': 'ALLOWALL',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization, X-Requested-With',
    'cache-control': 'public, max-age=300, stale-while-revalidate=60',
    'referrer-policy': 'same-origin',
  }
  
  return new Response(html, {
    status: 200,
    headers: { ...defaultHeaders, ...headers },
  })
}

export function buildJsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=60',
      'access-control-allow-origin': '*',
    },
  })
}

export function buildErrorResponse(error: string, status = 500): Response {
  return buildJsonResponse({ error }, status)
}

// -------------------- Time Formatting --------------------

export function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString()
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// -------------------- Number Formatting --------------------

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export function formatPoints(points: number | bigint): string {
  const num = typeof points === 'bigint' ? Number(points) : points
  return formatNumber(num)
}

// -------------------- Address Formatting --------------------

export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

// -------------------- Cache Utilities --------------------

export function isCacheValid(timestamp: number, ttl: number): boolean {
  return Date.now() - timestamp < ttl
}

export function getCacheKey(...parts: (string | number)[]): string {
  return parts.join(':')
}
