/**
 * GET /api/user/wallets/[fid]
 * 
 * Purpose: Fetch all wallet addresses for a user
 * Security: 10-layer pattern
 * Rate Limit: 60 requests/minute per IP
 * 
 * Infrastructure:
 * - Uses server-side Supabase client
 * - Returns cached wallet list
 * - Includes primary, custody, and verified addresses
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'
import { getAllWalletsForFID } from '@/lib/integrations/neynar-wallet-sync'

// ==========================================
// 1. Rate Limiting Configuration
// ==========================================

const RATE_LIMIT_CONFIG = {
  identifier: 'user-wallet-list',
  maxRequests: 60,
  windowMs: 60 * 1000,
}

// ==========================================
// 2. Input Validation Schemas
// ==========================================

const ParamsSchema = z.object({
  fid: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()),
})

// ==========================================
// 3. GET Handler
// ==========================================

export async function GET(
  request: NextRequest,
  { params }: { params: { fid: string } }
) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMIT_CONFIG)
    if (!rateLimitResult.success) {
      return createErrorResponse(
        ErrorType.RATE_LIMIT,
        'Too many wallet requests. Please try again later.',
        { retryAfter: rateLimitResult.retryAfter }
      )
    }

    // Validate params
    const validatedParams = ParamsSchema.parse(params)
    const { fid } = validatedParams

    // Get all wallets for this FID
    const wallets = await getAllWalletsForFID(fid)

    return NextResponse.json({
      success: true,
      data: {
        fid,
        wallets,
        count: wallets.length,
      },
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('[API:WalletList] Error:', error)

    if (error instanceof z.ZodError) {
      return createErrorResponse(
        ErrorType.VALIDATION,
        'Invalid FID parameter',
        { errors: error.errors }
      )
    }

    return createErrorResponse(
      ErrorType.INTERNAL,
      'Failed to fetch wallets'
    )
  }
}
