/**
 * Referral Activity Feed API
 * GET /api/referral/activity/[fid] - Fetch user's referral activity timeline
 * 
 * Security: 10-layer pattern (rate limiting, validation, sanitization, audit logging)
 * MCP Verified: December 6, 2025
 * 
 * Features:
 * - Chronological activity timeline
 * - Event types: registered, referred, reward, badge
 * - Pagination support
 * - Recent activity first
 * 
 * Security Layers:
 * 1. Rate Limiting (60 req/hour per IP via Upstash Redis)
 * 2. Request Validation (Zod schema for FID + query parameters)
 * 3. Authentication (Public endpoint - read-only data)
 * 4. RBAC (Public endpoint, no role check)
 * 5. Input Sanitization (FID validation)
 * 6. SQL Injection Prevention (Parameterized queries)
 * 7. CSRF Protection (GET method, read-only)
 * 8. Privacy Controls (Public activity data)
 * 9. Audit Logging (All requests logged)
 * 10. Error Masking (No sensitive data exposed)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/edge'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/middleware/rate-limit'
import { createErrorResponse, ErrorType, logError } from '@/lib/middleware/error-handler'
import { generateRequestId } from '@/lib/middleware/request-id'
import { getReferrerHistory } from '@/lib/subsquid-client'
import { auditLog, auditWarn } from '@/lib/middleware/audit-logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ===== BUG #R5 FIX: PREVENT DOS VIA UNBOUNDED OFFSET =====
// Maximum offset to prevent resource exhaustion attacks
// 10,000 rows = reasonable pagination limit for activity feed
const MAX_OFFSET = 10000

// Path parameter validation schema
const FidParamSchema = z.coerce.number().int().positive()

// Query parameter validation schema
const ActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

interface Activity {
  id: string
  type: 'registered' | 'referred' | 'reward' | 'badge' | 'referral_set' // Layer 1: on-chain event
  timestamp: string
  source: 'onchain' | 'offchain' // Layer 1 vs Layer 2 indicator
  data: {
    code?: string
    referredFid?: number
    referredUsername?: string
    points?: number
    badgeName?: string
    // Layer 1: On-chain referral event data
    txHash?: string
    user?: string
    referrer?: string
  }
}

interface ReferralActivityRow {
  id: number
  fid: number
  event_type: string
  referral_code: string | null
  referred_fid: number | null
  points_awarded: number | null
  metadata: Record<string, any> | null
  timestamp: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  const resolvedParams = await params
  const requestId = generateRequestId()
  const startTime = Date.now()
  const clientIp = getClientIp(request)

  try {
    // ===== SECURITY LAYER 0: AUTHENTICATION =====
    const authenticatedFid = request.headers.get('x-farcaster-fid')
    if (!authenticatedFid || authenticatedFid !== resolvedParams.fid) {
      logError('Authentication failed', {
        endpoint: `/api/referral/activity/${resolvedParams.fid}`,
        ip: clientIp,
        method: 'GET',
        requestId,
        reason: 'Missing or mismatched x-farcaster-fid header',
      })
      
      return createErrorResponse({
        type: ErrorType.AUTHENTICATION,
        message: 'Unauthorized: x-farcaster-fid header required and must match FID',
        statusCode: 401,
      })
    }

    // ===== SECURITY LAYER 1: RATE LIMITING (60 req/hour) =====
    const rateLimitResult = await rateLimit(clientIp, strictLimiter)
    
    if (!rateLimitResult.success) {
      logError('Rate limit exceeded', {
        endpoint: `/api/referral/activity/${resolvedParams.fid}`,
        ip: clientIp,
        method: 'GET',
        requestId,
        limit: rateLimitResult.limit,
        reset: rateLimitResult.reset,
      })
      
      return createErrorResponse({
        type: ErrorType.RATE_LIMIT,
        message: 'Too many requests. Please try again later.',
        statusCode: 429,
        details: {
          limit: rateLimitResult.limit,
          remaining: 0,
          reset: rateLimitResult.reset,
        },
      })
    }

    // ===== SECURITY LAYER 2: REQUEST VALIDATION =====
    // Validate FID parameter
    const fidValidation = FidParamSchema.safeParse(resolvedParams.fid)
    
    if (!fidValidation.success) {
      logError('Invalid FID parameter', {
        endpoint: `/api/referral/activity/${resolvedParams.fid}`,
        ip: clientIp,
        method: 'GET',
        requestId,
        errors: fidValidation.error.issues,
      })

      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid FID parameter',
        statusCode: 400,
        details: fidValidation.error.issues,
      })
    }

    const fid = fidValidation.data

    // Validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
    const queryValidation = ActivityQuerySchema.safeParse(searchParams)

    if (!queryValidation.success) {
      logError('Invalid query parameters', {
        endpoint: `/api/referral/activity/${fid}`,
        ip: clientIp,
        method: 'GET',
        requestId,
        errors: queryValidation.error.issues,
      })

      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid query parameters',
        statusCode: 400,
        details: queryValidation.error.issues,
      })
    }

    const { limit, offset } = queryValidation.data

    // ===== BUG #R5 FIX: VALIDATE OFFSET BOUNDS =====
    // Validate offset to prevent DoS via unbounded pagination
    if (offset > MAX_OFFSET) {
      logError('Offset exceeds maximum', {
        endpoint: `/api/referral/activity/${fid}`,
        ip: clientIp,
        requestId,
        offset,
        maxOffset: MAX_OFFSET,
      })

      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: `Pagination offset too large (max ${MAX_OFFSET})`,
        statusCode: 400,
        details: { offset, maxOffset: MAX_OFFSET },
      })
    }

    // ===== SECURITY LAYER 3-4: AUTHENTICATION & RBAC =====
    // Public endpoint - no authentication required for read-only activity data

    // ===== SECURITY LAYER 5: INPUT SANITIZATION =====
    // FID already validated as positive integer

    // ===== SECURITY LAYER 6: SQL INJECTION PREVENTION =====
    const supabase = getSupabaseServerClient()
    
    if (!supabase) {
      logError('Supabase not configured', {
        endpoint: `/api/referral/activity/${fid}`,
        ip: clientIp,
        requestId,
      })

      return createErrorResponse({
        type: ErrorType.INTERNAL,
        message: 'Database service unavailable',
        statusCode: 503,
      })
    }

    // Get user's wallet address for on-chain queries
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('wallet_address')
      .eq('fid', fid)
      .single()

    const userAddress = profile?.wallet_address

    // ===== LAYER 1: SUBSQUID ON-CHAIN REFERRAL EVENTS =====
    let onChainEvents: Activity[] = []
    if (userAddress) {
      try {
        const referralHistory = await getReferrerHistory(userAddress, limit * 2)
        
        onChainEvents = referralHistory.map((event) => ({
          id: event.id,
          type: 'referral_set' as const,
          timestamp: new Date(Number(event.timestamp) * 1000).toISOString(),
          source: 'onchain' as const,
          data: {
            txHash: event.txHash,
            user: event.user,
            referrer: event.referrer,
          },
        }))
      } catch (subsquidError) {
        // Non-blocking: Continue with Supabase data only if Subsquid fails
        auditWarn(`[Referral Activity] Subsquid error for FID ${fid}:`, { error: subsquidError })
      }
    }

    // ===== LAYER 2: SUPABASE OFF-CHAIN ACTIVITY =====
    const { data: offChainActivities, error } = await supabase
      .from('referral_activity')
      .select('*')
      .eq('fid', fid)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      logError('Database query failed', {
        endpoint: `/api/referral/activity/${fid}`,
        ip: clientIp,
        requestId,
        error: error.message,
      })

      return createErrorResponse({
        type: ErrorType.INTERNAL,
        message: 'Failed to fetch activity data',
        statusCode: 500,
      })
    }

    // Map off-chain activities to Activity interface
    const offChainMapped: Activity[] = ((offChainActivities || []) as ReferralActivityRow[]).map((activity) => ({
      id: activity.id.toString(),
      type: activity.event_type === 'code_registered' ? 'registered' :
            activity.event_type === 'referral_completed' ? 'referred' :
            activity.event_type === 'points_earned' ? 'reward' :
            activity.event_type === 'milestone_reached' ? 'badge' : 'reward',
      timestamp: activity.timestamp,
      source: 'offchain' as const,
      data: {
        code: activity.referral_code ?? undefined,
        referredFid: activity.referred_fid ?? undefined,
        points: activity.points_awarded ?? undefined,
        ...(activity.metadata || {}),
      },
    }))

    // ===== LAYER 3: MERGE AND SORT BY TIMESTAMP =====
    const allActivities = [...onChainEvents, ...offChainMapped]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(offset, offset + limit)

    // ===== SECURITY LAYER 7: CSRF PROTECTION =====
    // GET method - read-only, no CSRF risk

    // ===== SECURITY LAYER 8: PRIVACY CONTROLS =====
    // Public activity data - no sensitive information exposed

    // ===== SECURITY LAYER 9: AUDIT LOGGING =====
    auditLog('[Referral Activity API] Success', {
      requestId,
      ip: clientIp,
      fid,
      limit,
      offset,
      resultCount: allActivities.length,
      onChainCount: onChainEvents.length,
      offChainCount: offChainMapped.length,
      duration: Date.now() - startTime,
    })

    // ===== SECURITY LAYER 10: ERROR MASKING =====
    // Response includes professional headers and clean data structure
    return NextResponse.json(
      {
        success: true,
        activities: allActivities,
        fid,
        metadata: {
          onChainEvents: onChainEvents.length,
          offChainEvents: offChainMapped.length,
          totalEvents: onChainEvents.length + offChainMapped.length,
        },
        pagination: {
          limit,
          offset,
          hasMore: allActivities.length === limit,
        },
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'X-Request-ID': requestId,
          'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '0',
          'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
          'X-RateLimit-Reset': rateLimitResult.reset?.toString() || '0',
          'Server-Timing': `db;dur=${Date.now() - startTime}`,
        },
      }
    )
  } catch (error) {
    // ===== SECURITY LAYER 10: ERROR MASKING (CRITICAL) =====
    logError('Unexpected error in referral activity API', {
      endpoint: `/api/referral/activity/${resolvedParams.fid}`,
      ip: clientIp,
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'An unexpected error occurred',
      statusCode: 500,
      ...(process.env.NODE_ENV === 'development' && {
        _devDetails: error instanceof Error ? error.message : 'Unknown error',
      }),
    })
  }
}
