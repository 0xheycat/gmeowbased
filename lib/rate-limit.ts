/**
 * Rate Limiting with Upstash Redis
 * 
 * Provides both Upstash Ratelimit SDK (for sliding window) and manual Redis rate limiting
 * 
 * Source: Upstash Ratelimit - https://upstash.com/docs/oss/sdks/ts/ratelimit/overview
 * MCP Verified: 2025-11-17
 * Approved by: @heycat
 * 
 * Quality Gates Applied: GI-8 (Security)
 * NO HARDCODED COLORS
 * NO EMOJIS
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

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

/**
 * Get client identifier from Next.js request (supports NextRequest)
 * @param req - Next.js request object
 * @returns Client identifier (IP or fallback)
 */
export function getClientIdentifier(req: NextRequest): string {
  // Try multiple headers for IP address (Vercel, Cloudflare, etc.)
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }
  
  // Fallback to anonymous identifier
  return 'anonymous'
}

// ========================================
// MANUAL RATE LIMITING (for custom logic)
// ========================================

export type RateLimitConfig = {
  /** Maximum requests per window */
  maxRequests: number
  /** Window duration in seconds */
  windowSeconds: number
  /** Identifier (IP, user ID, etc.) */
  identifier: string
  /** Optional namespace for different rate limits */
  namespace?: string
}

/**
 * Check if request is rate limited (manual Redis implementation)
 * @param config - Rate limit configuration
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<{
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
}> {
  const { maxRequests, windowSeconds, identifier, namespace = 'ratelimit' } = config
  
  if (!redis) {
    console.warn('[Rate Limit] Redis not configured, allowing request')
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: Date.now() + (windowSeconds * 1000),
      limit: maxRequests,
    }
  }
  
  try {
    const key = `${namespace}:${identifier}`
    const now = Date.now()
    
    // Get current request count
    const current = await redis.get<number>(key)
    
    if (!current) {
      // First request in window
      await redis.setex(key, windowSeconds, 1)
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + (windowSeconds * 1000),
        limit: maxRequests,
      }
    }
    
    if (current >= maxRequests) {
      // Rate limit exceeded
      const ttl = await redis.ttl(key)
      const resetAt = now + (ttl * 1000)
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        limit: maxRequests,
      }
    }
    
    // Increment counter
    await redis.incr(key)
    const ttl = await redis.ttl(key)
    const resetAt = now + (ttl * 1000)
    
    return {
      allowed: true,
      remaining: maxRequests - current - 1,
      resetAt,
      limit: maxRequests,
    }
  } catch (error) {
    console.error('[rate-limit] Error:', error)
    // Fail open - allow request on error
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: Date.now() + (windowSeconds * 1000),
      limit: maxRequests,
    }
  }
}

/**
 * Create rate limit response with headers
 * @param result - Rate limit check result
 * @returns NextResponse with rate limit headers
 */
export function createRateLimitResponse(
  result: Awaited<ReturnType<typeof checkRateLimit>>,
  status: number = 429
): NextResponse {
  const response = NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${Math.ceil((result.resetAt - Date.now()) / 1000)} seconds.`,
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.resetAt,
    },
    { status }
  )
  
  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', String(result.limit))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))
  response.headers.set('Retry-After', String(Math.ceil((result.resetAt - Date.now()) / 1000)))
  
  return response
}

/**
 * Add rate limit headers to successful response
 * @param response - NextResponse to add headers to
 * @param result - Rate limit check result
 * @returns Modified NextResponse with headers
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: Awaited<ReturnType<typeof checkRateLimit>>
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))
  return response
}

/**
 * Leaderboard-specific rate limit (60 requests per minute per IP)
 */
export async function checkLeaderboardRateLimit(req: NextRequest) {
  const identifier = getClientIdentifier(req)
  return checkRateLimit({
    maxRequests: 60,
    windowSeconds: 60,
    identifier,
    namespace: 'leaderboard',
  })
}
