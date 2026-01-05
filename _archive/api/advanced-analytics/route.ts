/**
 * Advanced Analytics Batch Processing API
 * 
 * Runs all Phase 5 analytics (DeFi positions, PnL, transaction patterns)
 * for multiple addresses in a single request.
 * 
 * Security: 10-layer protection with STRICT rate limiting
 * Rate Limit: 10 requests/minute per IP (strict - expensive endpoint)
 * Max Batch Size: 10 addresses per request
 * 
 * Use case: Analyze multiple wallet addresses simultaneously for
 * portfolio management, user dashboards, or research purposes.
 * 
 * POST /api/advanced-analytics
 * Body: { addresses: string[], chain: string }
 * Response: { succeeded: number, failed: number, results: [...] }
 */

import { NextRequest, NextResponse } from 'next/server'
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
} from '@/lib/middleware/api-security'
import { z } from 'zod'
import { generateRequestId } from '@/lib/middleware/request-id'

interface AnalyticsResult {
  address: string
  defiPositions?: any
  pnlSummary?: any
  transactionPatterns?: any
  errors: string[]
}

// Batch request validation schema
const batchAnalyticsSchema = z.object({
  addresses: z.array(ethereumAddressSchema).min(1).max(10),
  chain: chainSchema.optional().default('base'),
})

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()

  try {
    // ============================================================================
    // SECURITY: Apply STRICT 10-layer protection (expensive endpoint)
    // ============================================================================
    const securityError = await applySecurityLayers(request, {
      rateLimitTier: RateLimitTier.STRICT, // 10 req/min (strict limit)
      maxRequestSizeKB: 50, // Larger for batch requests
      logRequests: true,
    })

    if (securityError) {
      securityError.headers.set('X-Request-ID', requestId)
      return securityError
    }

    // ============================================================================
    // INPUT VALIDATION & SANITIZATION
    // ============================================================================
    let requestBody
    try {
      requestBody = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        {
          status: 400,
          headers: {
            ...getCorsHeaders(request.headers.get('origin')),
            ...getSecurityHeaders(),
          },
        }
      )
    }

    // Validate input schema
    const validation = validateInput(batchAnalyticsSchema, requestBody)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', message: validation.error },
        {
          status: 400,
          headers: {
            ...getCorsHeaders(request.headers.get('origin')),
            ...getSecurityHeaders(),
          },
        }
      )
    }

    // Sanitize inputs (Phase 8.5: sanitizeAddress now returns null for invalid addresses)
    const addresses = validation.data.addresses.map(sanitizeAddress).filter((a): a is `0x${string}` => a !== null)
    const chain = sanitizeChain(validation.data.chain)

    console.log(`[Advanced Analytics] Processing ${addresses.length} addresses on ${chain}`)

    const results: AnalyticsResult[] = []
    let succeeded = 0
    let failed = 0

    // Process each address
    for (const address of addresses) {
      const result: AnalyticsResult = {
        address,
        errors: [],
      }

      try {
        // 1. Fetch DeFi Positions
        try {
          const defiResponse = await fetch(`${request.nextUrl.origin}/api/defi-positions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, chain }),
          })

          if (defiResponse.ok) {
            result.defiPositions = await defiResponse.json()
          } else {
            result.errors.push(`DeFi positions failed: ${defiResponse.status}`)
          }
        } catch (error) {
          result.errors.push(`DeFi positions error: ${error instanceof Error ? error.message : String(error)}`)
        }

        // 2. Fetch PnL Summary
        try {
          const pnlResponse = await fetch(
            `${request.nextUrl.origin}/api/pnl-summary?address=${address}&chain=${chain}`,
            { method: 'GET' }
          )

          if (pnlResponse.ok) {
            result.pnlSummary = await pnlResponse.json()
          } else {
            result.errors.push(`PnL summary failed: ${pnlResponse.status}`)
          }
        } catch (error) {
          result.errors.push(`PnL summary error: ${error instanceof Error ? error.message : String(error)}`)
        }

        // 3. Fetch Transaction Patterns
        try {
          const patternsResponse = await fetch(
            `${request.nextUrl.origin}/api/transaction-patterns?address=${address}&chain=${chain}`,
            { method: 'GET' }
          )

          if (patternsResponse.ok) {
            result.transactionPatterns = await patternsResponse.json()
          } else {
            result.errors.push(`Transaction patterns failed: ${patternsResponse.status}`)
          }
        } catch (error) {
          result.errors.push(`Transaction patterns error: ${error instanceof Error ? error.message : String(error)}`)
        }

        if (result.errors.length === 0) {
          succeeded++
        } else {
          failed++
        }
      } catch (error) {
        result.errors.push(`Overall error: ${error instanceof Error ? error.message : String(error)}`)
        failed++
      }

      results.push(result)
      console.log(`[Advanced Analytics] Completed ${address}: ${result.errors.length === 0 ? 'SUCCESS' : 'PARTIAL'}`)
    }

    // Summary
    const summary = {
      success: true,
      totalAddresses: addresses.length,
      succeeded,
      failed,
      chain,
      results: results.map(r => ({
        address: r.address,
        status: r.errors.length === 0 ? 'success' : 'partial',
        defiPositions: r.defiPositions ? {
          totalPositions: r.defiPositions.totalPositions,
          totalValueUSD: r.defiPositions.totalValueUSD,
          protocolCount: r.defiPositions.protocolCount,
        } : null,
        pnlSummary: r.pnlSummary ? {
          totalTrades: r.pnlSummary.totalTrades,
          totalPnL: r.pnlSummary.totalPnL,
          winRate: r.pnlSummary.winRate,
        } : null,
        transactionPatterns: r.transactionPatterns ? {
          totalTransactions: r.transactionPatterns.totalTransactions,
          whaleTier: r.transactionPatterns.whaleTier,
          behaviorType: r.transactionPatterns.behaviorType,
        } : null,
        errors: r.errors,
      })),
    }

    console.log(`[Advanced Analytics] Batch complete: ${succeeded}/${addresses.length} succeeded`)

    // Log successful request
    logApiRequest(request, {
      duration: Date.now() - startTime,
      status: 200,
    })

    return NextResponse.json(summary, {
      headers: {
        ...getCorsHeaders(request.headers.get('origin')),
        ...getSecurityHeaders(),
        'X-Response-Time': `${Date.now() - startTime}ms`,
        'X-Batch-Size': addresses.length.toString(),
      },
    })
  } catch (error) {
    console.error('[Advanced Analytics] Error:', error)
    logApiRequest(request, {
      duration: Date.now() - startTime,
      status: 500,
      error: error instanceof Error ? error.message : String(error),
    })
    return createErrorResponse(error)
  }
}

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      headers: {
        ...getCorsHeaders(request.headers.get('origin')),
        ...getSecurityHeaders(),
      },
    }
  )
}
