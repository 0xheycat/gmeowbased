// ============================================================================
// Phase 4: Historical On-Chain Stats API
// ============================================================================
// Endpoint: GET /api/onchain-stats/history
// Purpose: Retrieve historical portfolio snapshots for time-series charts
// Security: 10-layer protection (public endpoint)
// Rate Limit: 60 requests/minute per IP (STANDARD tier)
//
// Query Parameters:
//   - address: Wallet address (required)
//   - chain: Chain identifier (optional, default: 'base')
//   - period: Time period ('7d', '30d', '90d', '1y', 'all') (optional, default: '30d')
//
// Returns:
//   - snapshots: Array of daily snapshots
//   - summary: Change percentage, first/last values, date range
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  applySecurityLayers,
  RateLimitTier,
  validateInput,
  sanitizeAddress,
  sanitizeChain,
  ethereumAddressSchema,
  chainSchema,
  getCorsHeaders,
  getSecurityHeaders,
  createErrorResponse,
  logApiRequest,
} from '@/lib/api-security'
import { getRequestId } from '@/lib/request-id'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Validation schema
const historyQuerySchema = z.object({
  address: ethereumAddressSchema,
  chain: chainSchema.optional().default('base'),
  period: z.enum(['7d', '30d', '90d', '1y', 'all']).optional().default('30d'),
})

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  const requestId = getRequestId()
  
  try {
    // Security Layers 1-10: Apply all security layers (60 req/min)
    const securityError = await applySecurityLayers(req, {
      rateLimitTier: RateLimitTier.STANDARD,
      maxRequestSizeKB: 10,
      logRequests: true,
    })
    if (securityError) return securityError

    const { searchParams } = new URL(req.url)
    const address = searchParams.get('address')
    const chain = searchParams.get('chain') || 'base'
    const period = searchParams.get('period') || '30d'

    if (!address) {
      logApiRequest(req, { status: 400, error: 'Missing address parameter' })
      return createErrorResponse({
        error: 'Validation error',
        message: 'Missing required parameter: address',
        statusCode: 400,
      })
    }

    // Validate inputs with Zod
    const validation = validateInput(historyQuerySchema, {
      address,
      chain,
      period,
    })

    if (!validation.success) {
      logApiRequest(req, { status: 400, error: 'Validation failed' })
      return validation.error
    }

    // Sanitize inputs
    const sanitizedAddress = sanitizeAddress(validation.data.address)
    const sanitizedChain = sanitizeChain(validation.data.chain)

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call RPC function to get historical stats
    const { data, error } = await supabase.rpc('get_historical_stats', {
      p_address: sanitizedAddress.toLowerCase(),
      p_chain: sanitizedChain,
      p_period: validation.data.period,
    })

    if (error) {
      console.error('[Historical Stats API] RPC error:', error)
      logApiRequest(req, { status: 500, error: error.message })
      return createErrorResponse({
        error: 'Database error',
        message: 'Failed to fetch historical stats',
        statusCode: 500,
      })
    }

    const duration = Date.now() - startTime
    logApiRequest(req, { status: 200, duration })

    // Return historical data with metadata
    return NextResponse.json(
      {
        success: true,
        address: sanitizedAddress.toLowerCase(),
        chain: sanitizedChain,
        period: validation.data.period,
        ...data,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          ...getCorsHeaders(req.headers.get('origin')),
          ...getSecurityHeaders(),
          'X-Response-Time': `${duration}ms`,
          'X-Request-ID': requestId, // GitHub/Stripe pattern
        },
      }
    )
  } catch (err: any) {
    const duration = Date.now() - startTime
    console.error('[Historical Stats API] Unexpected error:', err)
    logApiRequest(req, { status: 500, duration, error: err?.message })
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: err?.message || 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'X-Request-ID': requestId, // GitHub/Stripe pattern
        },
      }
    )
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...getCorsHeaders(req.headers.get('origin')),
      ...getSecurityHeaders(),
    },
  })
}
