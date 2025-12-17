/**
 * @file lib/frames/image-cache-helper.ts
 * @description Frame image cache wrapper for performance optimization
 * 
 * PHASE: Phase 7.3 - Frames (December 17, 2025)
 * 
 * FEATURES:
 *   - Redis caching for frame images
 *   - 800ms → <200ms response time on cache hits
 *   - Configurable TTL per frame type
 *   - Automatic cache key generation
 *   - ImageResponse wrapping
 *   - Cache miss fallback to generator
 * 
 * Frame Image Cache Helper
 * 
 * Wraps frame image generation with Redis caching for performance optimization
 * Reduces response time from 800ms to <200ms on cache hits
 * 
 * Usage:
 * ```typescript
 * import { withFrameImageCache } from '@/lib/frames/image-cache-helper'
 * 
 * export async function GET(req: NextRequest) {
 *   return withFrameImageCache({
 *     req,
 *     frameType: 'gm',
 *     ttl: 300, // 5 minutes
 *     generator: async (params) => {
 *       // Generate ImageResponse
 *       return new ImageResponse(...)
 *     }
 *   })
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'
import { ImageResponse } from 'next/og'
import { getCachedFrame, setCachedFrame, type FrameCacheKey } from '@/lib/cache/frame'

export type FrameImageGeneratorParams = {
  searchParams: URLSearchParams
  parsedParams: Record<string, string>
}

export type FrameImageCacheOptions = {
  /** The Next.js request object */
  req: NextRequest
  /** Frame type (gm, points, badge, etc.) */
  frameType: string
  /** Cache TTL in seconds (default: 300 = 5 minutes) */
  ttl?: number
  /** Image generator function */
  generator: (params: FrameImageGeneratorParams) => Promise<ImageResponse | Response>
  /** Optional custom cache key params */
  cacheKeyParams?: Record<string, string>
}

/**
 * Wrap frame image generation with caching
 * Automatically handles cache hits/misses and stores generated images
 */
export async function withFrameImageCache(options: FrameImageCacheOptions): Promise<Response> {
  const { req, frameType, ttl = 300, generator, cacheKeyParams } = options
  
  try {
    const { searchParams } = new URL(req.url)
    
    // Build cache key from request parameters
    const fid = searchParams.get('fid') ? parseInt(searchParams.get('fid')!) : null
    const tier = searchParams.get('tier') || searchParams.get('level') || null
    
    // Convert URLSearchParams to plain object for cache key
    const params: Record<string, string> = cacheKeyParams || {}
    if (!cacheKeyParams) {
      searchParams.forEach((value, key) => {
        params[key] = value
      })
    }
    
    const cacheKey: FrameCacheKey = {
      type: frameType,
      fid,
      tier,
      params,
    }
    
    // Try to get cached image
    const cachedImage = await getCachedFrame(cacheKey)
    if (cachedImage) {
      return new NextResponse(cachedImage as any, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
          'X-Frame-Cache': 'HIT',
        },
      })
    }
    
    // Cache miss - generate image
    const parsedParams: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      parsedParams[key] = value
    })
    
    const imageResponse = await generator({
      searchParams,
      parsedParams,
    })
    
    // Convert ImageResponse to buffer for caching
    if (imageResponse instanceof Response) {
      const buffer = Buffer.from(await imageResponse.arrayBuffer())
      
      // Store in cache (fire and forget - don't block response)
      setCachedFrame(cacheKey, buffer, ttl).catch(err => {
        console.error('[IMAGE_CACHE] Failed to cache image:', err)
      })
      
      // Return response with cache miss header
      return new NextResponse(buffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
          'X-Frame-Cache': 'MISS',
        },
      })
    }
    
    return imageResponse
  } catch (error) {
    console.error('[IMAGE_CACHE] Error:', error)
    
    // Return error response
    return new NextResponse('Failed to generate frame image', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }
}

/**
 * Helper to extract numeric param from search params
 */
export function getNumericParam(searchParams: URLSearchParams, key: string, defaultValue: number): number {
  const value = searchParams.get(key)
  if (!value) return defaultValue
  const num = parseInt(value, 10)
  return isNaN(num) ? defaultValue : num
}

/**
 * Helper to extract string param from search params
 */
export function getStringParam(searchParams: URLSearchParams, key: string, defaultValue: string): string {
  return searchParams.get(key) || defaultValue
}
