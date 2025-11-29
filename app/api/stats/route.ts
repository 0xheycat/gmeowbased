/**
 * Platform Stats API Endpoint
 * Returns live statistics for landing page
 * GET /api/stats
 * 
 * Features:
 * - Rate limiting (100 req/min per IP)
 * - Advanced caching (120s TTL with stale-while-revalidate)
 * - Single RPC query (optimized from 4 separate queries)
 * - Error handling middleware
 * - Performance timing
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { getCached } from '@/lib/cache'
import { withErrorHandler } from '@/lib/error-handler'
import { withTiming } from '@/lib/middleware/timing'

export const runtime = 'nodejs' // Changed from 'edge' for middleware support
export const dynamic = 'force-dynamic'

interface PlatformStats {
  totalUsers: number
  totalGMs: number
  activeQuests: number
  totalGuilds: number
  totalBadges?: number
  totalViralCasts?: number
  totalCasts?: number
  updatedAt?: number
}

async function fetchPlatformStats(): Promise<PlatformStats> {
  const supabase = getSupabaseServerClient()
  
  if (!supabase) {
    console.warn('⚠️ Supabase not configured, returning fallback stats')
    throw new Error('Supabase not configured')
  }

  // Use optimized RPC function (single query)
  const { data, error } = await supabase.rpc('get_platform_stats')

  if (error) {
    console.error('❌ RPC error:', error)
    throw error
  }

  return data as PlatformStats
}

export const GET = withTiming(withErrorHandler(async (request: Request | NextRequest) => {
  // Rate limiting
  const ip = getClientIp(request)
  const { success, limit, remaining, reset } = await rateLimit(ip, apiLimiter)

  if (!success) {
    const resetTime = reset || Date.now() + 60000
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded', 
        limit,
        remaining: 0,
        reset: new Date(resetTime).toISOString()
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetTime),
          'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
        },
      }
    )
  }

  // Fetch with caching (120s TTL)
  const stats = await getCached(
    'platform-stats', // namespace
    'v1', // key
    fetchPlatformStats, // fetcher function
    {
      ttl: 120, // 2 minutes
    }
  )

  console.log('✅ Stats fetched:', stats)

  return NextResponse.json(stats, {
    headers: {
      'Cache-Control': 's-maxage=120, stale-while-revalidate=300',
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
    },
  })
}))
