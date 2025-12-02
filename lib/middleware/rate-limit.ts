/**
 * Rate Limiter Middleware
 * 
 * Uses Upstash Redis for distributed rate limiting
 * Prevents API abuse by limiting requests per IP address
 * 
 * NO HARDCODED COLORS
 * NO EMOJIS
 */

import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

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
 * Check if request is rate limited
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
  
  try {
    const key = `${namespace}:${identifier}`
    const now = Date.now()
    const windowStart = now - (windowSeconds * 1000)
    
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
 * Get client identifier from request (IP address)
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
