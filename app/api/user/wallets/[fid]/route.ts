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
import { getClientIp } from '@/lib/middleware/rate-limit'
import { createErrorResponse, ErrorType, handleValidationError } from '@/lib/middleware/error-handler'
import { getAllWalletsForFID } from '@/lib/integrations/neynar-wallet-sync'

// ==========================================
// 1. Input Validation Schemas
// ==========================================

const ParamsSchema = z.object({
  fid: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()),
})

// ==========================================
// 2. GET Handler
// ==========================================

export async function GET(
  request: NextRequest,
  { params }: { params: { fid: string } }
) {
  try {
    // Get client IP for logging
    const clientIp = getClientIp(request)
    console.log('[API:WalletList] Request from IP:', clientIp)

    // Validate params
    const parseResult = ParamsSchema.safeParse(params)
    
    if (!parseResult.success) {
      return handleValidationError(parseResult.error)
    }

    const { fid } = parseResult.data

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
      return handleValidationError(error)
    }

    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'Failed to fetch wallets',
      statusCode: 500,
    })
  }
}
