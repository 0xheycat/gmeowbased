/**
 * POST /api/user/wallets/sync
 * 
 * Purpose: Sync multi-wallet configuration for a user
 * Security: 10-layer pattern
 * Rate Limit: 30 requests/minute per IP
 * 
 * Infrastructure:
 * - Uses server-side Supabase client
 * - Fetches from Neynar API
 * - Updates user_profiles table
 * - Returns wallet list
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/middleware/rate-limit'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'
import { syncWalletsFromNeynar, getAllWalletsForFID } from '@/lib/integrations/neynar-wallet-sync'

// ==========================================
// 1. Rate Limiting Configuration
// ==========================================

const RATE_LIMIT_CONFIG = {
  identifier: 'user-wallet-sync',
  maxRequests: 30,
  windowMs: 60 * 1000,
}

// ==========================================
// 2. Input Validation Schemas
// ==========================================

const RequestSchema = z.object({
  fid: z.number().int().positive(),
  connectedAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  forceUpdate: z.boolean().optional().default(false),
})

type RequestBody = z.infer<typeof RequestSchema>

// ==========================================
// 3. POST Handler
// ==========================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMIT_CONFIG)
    if (!rateLimitResult.success) {
      return createErrorResponse(
        ErrorType.RATE_LIMIT,
        'Too many wallet sync requests. Please try again later.',
        { retryAfter: rateLimitResult.retryAfter }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = RequestSchema.parse(body)

    const { fid, connectedAddress, forceUpdate } = validatedData

    // Sync wallets from Neynar
    const walletData = await syncWalletsFromNeynar(fid, forceUpdate, connectedAddress)

    if (!walletData) {
      return createErrorResponse(
        ErrorType.EXTERNAL_SERVICE,
        'Failed to sync wallets from Neynar',
        { fid }
      )
    }

    // Get all wallets for this FID
    const allWallets = await getAllWalletsForFID(fid)

    return NextResponse.json({
      success: true,
      data: {
        fid,
        wallets: allWallets,
        custody_address: walletData.custody_address,
        verified_addresses: walletData.verified_addresses,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store', // Don't cache wallet sync results
      },
    })
  } catch (error) {
    console.error('[API:WalletSync] Error:', error)

    if (error instanceof z.ZodError) {
      return createErrorResponse(
        ErrorType.VALIDATION,
        'Invalid request data',
        { errors: error.errors }
      )
    }

    return createErrorResponse(
      ErrorType.INTERNAL,
      'Failed to sync wallets'
    )
  }
}
