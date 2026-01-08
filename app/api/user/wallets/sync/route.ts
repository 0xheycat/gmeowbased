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
import { getClientIp } from '@/lib/middleware/rate-limit'
import { createErrorResponse, ErrorType, handleValidationError } from '@/lib/middleware/error-handler'
import { syncWalletsFromNeynar, getAllWalletsForFID } from '@/lib/integrations/neynar-wallet-sync'

// ==========================================
// 1. Input Validation Schemas
// ==========================================

const RequestSchema = z.object({
  fid: z.number().int().positive(),
  connectedAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  forceUpdate: z.boolean().optional().default(false),
})

type RequestBody = z.infer<typeof RequestSchema>

// ==========================================
// 2. POST Handler
// ==========================================

export async function POST(request: NextRequest) {
  try {
    // Get client IP for logging
    const clientIp = getClientIp(request)
    console.log('[API:WalletSync] Request from IP:', clientIp)

    // Parse and validate request body
    const body = await request.json()
    const parseResult = RequestSchema.safeParse(body)
    
    if (!parseResult.success) {
      return handleValidationError(parseResult.error)
    }

    const { fid, connectedAddress, forceUpdate } = parseResult.data

    // Sync wallets from Neynar
    const walletData = await syncWalletsFromNeynar(fid, forceUpdate, connectedAddress)

    if (!walletData) {
      return createErrorResponse({
        type: ErrorType.EXTERNAL_API,
        message: 'Failed to sync wallets from Neynar',
        statusCode: 502,
      })
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
      return handleValidationError(error)
    }

    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'Failed to sync wallets',
      statusCode: 500,
    })
  }
}
