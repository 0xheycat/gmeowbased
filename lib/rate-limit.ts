/**
 * Rate Limiting with Upstash Redis
 * 
 * Source: Upstash Ratelimit - https://upstash.com/docs/oss/sdks/ts/ratelimit/overview
 * MCP Verified: 2025-11-17
 * Approved by: @heycat
 * 
 * Quality Gates Applied: GI-8 (Security)
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis client with environment variables
// Use .trim() and .replace() to remove any whitespace or newline characters
const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/[\r\n]/g, '')
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim().replace(/[\r\n]/g, '')

const redis = redisUrl && redisToken
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null

// Log configuration (without sensitive data) for debugging
if (redis) {
  console.log('[Rate Limit] Redis initialized with URL:', redisUrl?.substring(0, 30) + '...')
} else {
  console.warn('[Rate Limit] Redis not initialized - rate limiting disabled')
}

// API routes: 60 requests per minute per IP
export const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix: 'api',
    })
  : null

// Strict routes (admin, auth): 10 requests per minute per IP
export const strictLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'strict',
    })
  : null

// Webhook routes: 500 requests per 5 minutes per webhook
export const webhookLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(500, '5 m'),
      analytics: true,
      prefix: 'webhook',
    })
  : null

/**
 * Rate limit helper function
 * 
 * @param identifier - IP address or user identifier
 * @param limiter - Rate limiter to use (apiLimiter, strictLimiter, webhookLimiter)
 * @returns Object with success status and rate limit info
 */
export async function rateLimit(
  identifier: string,
  limiter: Ratelimit | null = apiLimiter
): Promise<{
  success: boolean
  limit?: number
  remaining?: number
  reset?: number
  pending?: Promise<unknown>
}> {
  if (!limiter) {
    console.warn('[Rate Limit] Upstash not configured, rate limiting disabled')
    return { success: true }
  }

  try {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      pending: result.pending,
    }
  } catch (error) {
    console.error('[Rate Limit] Error:', error)
    // Fail open - allow request if rate limiting fails
    return { success: true }
  }
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(request: Request): string {
  // Check common headers for client IP
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const real = request.headers.get('x-real-ip')
  if (real) {
    return real
  }

  // Fallback to 'unknown' if no IP found
  return 'unknown'
}
