/**
 * Referral Stats API
 * GET /api/referral/[fid]/stats - Fetch user's referral statistics
 * 
 * Hybrid Pattern:
 * - Subsquid: getReferralNetworkStats() for on-chain referral count & timing
 * - Supabase: referral_stats table for computed rewards & metadata
 * - Calculated: Tier badges based on referral count
 * 
 * Security: 10-layer pattern (rate limiting, validation, sanitization, error masking)
 * MCP Verified: December 6, 2025
 * TRUE HYBRID: December 19, 2025
 * 
 * Features:
 * - Referral code lookup
 * - Total referrals count (on-chain)
 * - Points earned from referrals
 * - Tier badge status (Bronze/Silver/Gold)
 * - Active referrals tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCached } from '@/lib/cache/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit'
import { createClient } from '@/lib/supabase/edge'
import { createErrorResponse, ErrorType, logError } from '@/lib/middleware/error-handler'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { getReferralNetworkStats } from '@/lib/subsquid-client'
import { auditLog } from '@/lib/middleware/audit-logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Tier names for UI display
const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold'] as const

/**
 * Calculate tier level based on successful referral count
 */
function calculateTierLevel(totalReferred: number): number {
  if (totalReferred >= 10) return 3 // Gold
  if (totalReferred >= 5) return 2  // Silver
  if (totalReferred >= 1) return 1  // Bronze
  return 0 // None
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fid: string }> }
) {
  const startTime = Date.now()
  const clientIp = getClientIp(request)

  try {
    // Await params (Next.js 15)
    const params = await context.params
    const fid = params.fid

    // 0. Authentication - Verify x-farcaster-fid header matches FID
    const authenticatedFid = request.headers.get('x-farcaster-fid')
    if (!authenticatedFid || authenticatedFid !== fid) {
      logError('Authentication failed', {
        endpoint: `/api/referral/${fid}/stats`,
        ip: clientIp,
        method: 'GET',
        reason: 'Missing or mismatched x-farcaster-fid header',
      })
      
      return createErrorResponse({
        type: ErrorType.AUTHENTICATION,
        message: 'Unauthorized: x-farcaster-fid header required and must match FID',
        statusCode: 401,
      })
    }

    // 1. Rate Limiting
    const rateLimitResult = await rateLimit(clientIp, apiLimiter)
    
    if (!rateLimitResult.success) {
      logError('Rate limit exceeded', {
        endpoint: `/api/referral/${fid}/stats`,
        ip: clientIp,
        method: 'GET',
        limit: rateLimitResult.limit,
        reset: rateLimitResult.reset,
      })
      
      return createErrorResponse({
        type: ErrorType.RATE_LIMIT,
        message: 'Too many requests. Please try again later.',
        statusCode: 429,
      })
    }

    // 2. Input Validation
    const fidNumber = parseInt(fid, 10)
    const fidResult = FIDSchema.safeParse(fidNumber)
    
    if (!fidResult.success) {
      logError('Invalid FID', {
        endpoint: `/api/referral/${fid}/stats`,
        ip: clientIp,
        method: 'GET',
        error: fidResult.error.flatten(),
      })
      
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: 'Invalid FID format',
        statusCode: 400,
        details: fidResult.error.flatten(),
      })
    }

    const validatedFid = fidResult.data

    // 3. Get cached referral stats with hybrid data
    const statsData = await getCached(
      'referral-stats',
      `fid:${validatedFid}`,
      async () => {
        const supabase = createClient()

        // LAYER 1: Off-chain (Supabase) - Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('fid, wallet_address, verified_addresses')
          .eq('fid', validatedFid)
          .single()

        // Handle case where profile doesn't exist or has no wallet
        if (profileError || !profile) {
          return {
            fid: validatedFid,
            address: null,
            totalReferred: 0,
            successfulReferrals: 0,
            pointsEarned: 0,
            conversionRate: 0,
            tier: { level: 0, name: 'None', progress: 0 },
            timing: { firstReferral: null, lastReferral: null },
          }
        }

        // ===== MULTI-WALLET FIX (BUG #R4): USE ALL VERIFIED WALLETS =====
        // Get all wallets for this user (primary + verified addresses)
        // This matches the guild system pattern which already supports multi-wallet
        const allWallets: string[] = []
        
        // Add primary wallet
        if (profile.wallet_address) {
          allWallets.push(profile.wallet_address.toLowerCase())
        }
        
        // Add all verified addresses
        if (profile.verified_addresses && Array.isArray(profile.verified_addresses)) {
          const verified = (profile.verified_addresses as string[])
            .map(w => w.toLowerCase())
            .filter(w => w && !allWallets.includes(w)) // Avoid duplicates
          allWallets.push(...verified)
        }

        // If no wallets found, return empty stats
        if (allWallets.length === 0) {
          return {
            fid: validatedFid,
            address: null,
            totalReferred: 0,
            successfulReferrals: 0,
            pointsEarned: 0,
            conversionRate: 0,
            tier: { level: 0, name: 'None', progress: 0 },
            timing: { firstReferral: null, lastReferral: null },
          }
        }

        // LAYER 2: On-chain (Subsquid) - Get referral stats for ALL wallets
        // Fetch stats for each wallet and aggregate the results
        const allNetworkStats = await Promise.all(
          allWallets.map(wallet => getReferralNetworkStats(wallet))
        )

        // Aggregate stats from all wallets
        const aggregatedStats = {
          totalReferrals: allNetworkStats.reduce((sum, s) => sum + s.totalReferrals, 0),
          firstReferral: Math.min(
            ...allNetworkStats
              .map(s => (s.firstReferral ? Number(s.firstReferral) : Infinity))
          ),
          lastReferral: Math.max(
            ...allNetworkStats
              .map(s => (s.lastReferral ? Number(s.lastReferral) : 0))
          ),
        }

        // LAYER 3: Off-chain (Supabase) - Get computed referral rewards & metadata
        const { data: referralStats } = await supabase
          .from('referral_stats')
          .select('points_awarded, successful_referrals, total_referrals, tier, conversion_rate')
          .eq('fid', validatedFid)
          .single()

        // ===== DATA INTEGRITY FIX (BUG #R3): PREFER ON-CHAIN DATA =====
        // CRITICAL: We have three potential sources for referral count:
        // 1. aggregatedStats.totalReferrals (Subsquid - lag: 5-30s)  ⭐ MOST AUTHORITATIVE
        // 2. referralStats?.total_referrals (Supabase - lag: 1+ hours) 
        // 3. Calculate from successful_referrals
        //
        // RULE: Always prefer on-chain data (aggregatedStats) as source of truth
        // This ensures stats are accurate even during Supabase sync delays
        
        const successfulReferrals = aggregatedStats.totalReferrals // Use on-chain count (most accurate)
        const tier = calculateTierLevel(successfulReferrals)
        const tierProgress = calculateTierProgress(successfulReferrals, tier)

        return {
          fid: validatedFid,
          address: profile.wallet_address,
          totalReferred: aggregatedStats.totalReferrals, // On-chain count (source of truth)
          successfulReferrals: aggregatedStats.totalReferrals, // Use on-chain data
          pointsEarned: (aggregatedStats.totalReferrals * 50), // Calculate from on-chain count (50 per referral)
          conversionRate: 0, // Would need more data to calculate accurately
          tier: {
            level: tier,
            name: TIER_NAMES[tier] || 'None',
            progress: tierProgress,
          },
          timing: {
            firstReferral: aggregatedStats.firstReferral !== Infinity ? new Date(aggregatedStats.firstReferral * 1000).toISOString() : null,
            lastReferral: aggregatedStats.lastReferral > 0 ? new Date(aggregatedStats.lastReferral * 1000).toISOString() : null,
          },
        }
      },
      { ttl: 60 } // Cache for 1 minute
    )

    // ===== BUG #R8 FIX: ENVIRONMENT-GATED AUDIT LOGGING =====
    const duration = Date.now() - startTime
    auditLog('[API] GET /api/referral/[fid]/stats', {
      fid: validatedFid,
      success: true,
      duration: `${duration}ms`,
      cacheHit: duration < 10, // < 10ms suggests cache hit
    })

    // 5. Return response
    return NextResponse.json(
      {
        success: true,
        data: statsData,
        meta: {
          timestamp: new Date().toISOString(),
          cached: duration < 10,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error instanceof Error ? error : String(error), {
      endpoint: `/api/referral/stats`,
      ip: clientIp,
      method: 'GET',
      duration: `${duration}ms`,
    })

    // Error masking
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'Failed to fetch referral stats',
      statusCode: 500,
      details: process.env.NODE_ENV === 'development' 
        ? { error: error instanceof Error ? error.message : String(error) }
        : undefined,
    })
  }
}

/**
 * Calculate tier progress percentage
 * 
 * Tiers:
 * - Bronze: 1 referral
 * - Silver: 5 referrals
 * - Gold: 10 referrals
 * 
 * @param totalReferred - Total referrals count
 * @param currentTier - Current tier level (0-3)
 * @returns Progress percentage to next tier
 */
function calculateTierProgress(totalReferred: number, currentTier: number): {
  percentage: number
  current: number
  next: number | null
  isMaxTier: boolean
} {
  const tierThresholds = [0, 1, 5, 10] // None, Bronze, Silver, Gold
  const nextTierIndex = currentTier + 1

  if (nextTierIndex >= tierThresholds.length) {
    // Max tier reached
    return {
      percentage: 100,
      current: totalReferred,
      next: null,
      isMaxTier: true,
    }
  }

  const currentThreshold = tierThresholds[currentTier]
  const nextThreshold = tierThresholds[nextTierIndex]
  const progress = totalReferred - currentThreshold
  const required = nextThreshold - currentThreshold
  const percentage = Math.min(100, Math.floor((progress / required) * 100))

  return {
    percentage,
    current: totalReferred,
    next: nextThreshold,
    isMaxTier: false,
  }
}
