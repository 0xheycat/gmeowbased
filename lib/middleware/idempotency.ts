/**
 * Idempotency Keys System
 * 
 * Prevents duplicate operations on network retry, matches Stripe pattern
 * Uses Upstash Redis for 24-hour cache TTL
 * 
 * Pattern: Stripe API - https://stripe.com/docs/api/idempotent_requests
 * Created: 2025-12-07
 * Quality Gates: GI-8 (Security)
 */

import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

// Initialize Redis client (shared with rate-limit.ts)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/[\r\n]/g, '')
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim().replace(/[\r\n]/g, '')

const redis = redisUrl && redisToken
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null

const IDEMPOTENCY_TTL = 60 * 60 * 24 // 24 hours in seconds

export interface IdempotencyResult {
  exists: boolean
  response?: any
  status?: number
}

/**
 * Check if idempotency key exists in cache
 * Returns cached response if operation was already completed
 */
export async function checkIdempotency(
  key: string
): Promise<IdempotencyResult> {
  if (!redis) {
    return { exists: false }
  }

  try {
    const cacheKey = `idempotency:${key}`
    const cached = await redis.get(cacheKey)
    
    if (cached) {
      // Return cached response
      return {
        exists: true,
        response: (cached as any).response,
        status: (cached as any).status || 200
      }
    }
    
    return { exists: false }
  } catch (error) {
    console.error('Idempotency check error:', error)
    return { exists: false }
  }
}

/**
 * Store operation result with idempotency key
 * TTL: 24 hours (matches Stripe pattern)
 */
export async function storeIdempotency(
  key: string,
  response: any,
  status: number = 200
): Promise<void> {
  if (!redis) {
    return
  }

  try {
    const cacheKey = `idempotency:${key}`
    await redis.setex(
      cacheKey,
      IDEMPOTENCY_TTL,
      {
        response,
        status,
        timestamp: new Date().toISOString()
      }
    )
  } catch (error) {
    console.error('Idempotency store error:', error)
  }
}

/**
 * Generate idempotency key from request headers
 * Header: Idempotency-Key (matches Stripe pattern)
 */
export function getIdempotencyKey(request: Request): string | null {
  return request.headers.get('idempotency-key') || 
         request.headers.get('Idempotency-Key')
}

/**
 * Validate idempotency key format
 * Must be 36-72 characters (UUID v4 or custom string)
 */
export function isValidIdempotencyKey(key: string): boolean {
  return key.length >= 36 && key.length <= 72
}

/**
 * Return cached response with proper headers
 */
export function returnCachedResponse(result: IdempotencyResult) {
  return NextResponse.json(
    result.response,
    {
      status: result.status || 200,
      headers: {
        'X-Idempotency-Replayed': 'true',
        'Cache-Control': 'no-cache'
      }
    }
  )
}
