/**
 * Onchain Stats API Route - PUBLIC RPC ONLY (Zero Cost)
 * 
 * Endpoint: /api/onchain-stats/[chain]?address=0x...
 * Cost: $0/month (public RPC only, no API keys)
 * Security: 10-layer protection (rate limiting, validation, sanitization, etc.)
 * Rate Limit: 60 requests/minute per IP (STANDARD tier)
 * 
 * Strategy:
 * - Binary search for first transaction (like Uniswap/OpenSea)
 * - Smart sampling for volume estimation
 * - Recent block scanning for contract deployments
 * - Heavy caching (1-5 min TTL)
 * 
 * Supports all 15 chains from OnchainStats.tsx
 * 
 * Example:
 * GET /api/onchain-stats/base?address=0x123...
 */

import { NextRequest, NextResponse } from 'next/server'
import { DataSourceRouter } from '@/lib/onchain-stats/data-source-router-rpc-only'
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
import { trackApiUsage } from '@/app/api/admin/usage-metrics/route'
import { generateRequestId } from '@/lib/request-id'
import { z } from 'zod'

type ChainKey = 'base' | 'ethereum' | 'optimism' | 'arbitrum' | 'polygon' | 'gnosis' | 'celo' | 'scroll' | 'unichain' | 'soneium' | 'zksync' | 'zora' | 'op'

const VALID_CHAINS: ChainKey[] = [
  'base', 'ethereum', 'optimism', 'op', 'arbitrum', 'polygon', 'gnosis', 
  'celo', 'scroll', 'unichain', 'soneium', 'zksync', 'zora'
]

// Global request deduplication (prevent duplicate API calls)
const ongoingRequests = new Map<string, Promise<any>>()

// Validation schema for query parameters
const onchainStatsQuerySchema = z.object({
  address: ethereumAddressSchema,
  chain: z.enum(['base', 'ethereum', 'optimism', 'op', 'arbitrum', 'polygon', 'gnosis', 'celo', 'scroll', 'unichain', 'soneium', 'zksync', 'zora']),
  force: z.boolean().optional(),
})

export async function GET(request: NextRequest, context: { params: Promise<{ chain: string }> }) {
  const startTime = Date.now()
  const requestId = generateRequestId()

  try {
    // Security Layer 1-10: Apply all security layers (60 req/min)
    const securityError = await applySecurityLayers(request, {
      rateLimitTier: RateLimitTier.STANDARD,
      maxRequestSizeKB: 10,
      logRequests: true,
    })
    if (securityError) return securityError

    // Await params (Next.js 15 requirement)
    const params = await context.params
    
    // Get query parameters
    const address = request.nextUrl.searchParams.get('address')
    const force = request.nextUrl.searchParams.get('force') === 'true'

    if (!address) {
      logApiRequest(request, { status: 400, error: 'Missing address parameter' })
      return createErrorResponse({
        error: 'Validation error',
        message: 'Missing address parameter',
        statusCode: 400,
      })
    }

    // Validate inputs with Zod
    const validation = validateInput(onchainStatsQuerySchema, {
      address,
      chain: params.chain,
      force,
    })

    if (!validation.success) {
      logApiRequest(request, { status: 400, error: 'Validation failed' })
      const errorResponse = validation.error
      errorResponse.headers.set('Request-Id', requestId)
      errorResponse.headers.set('X-Request-Id', requestId)
      return errorResponse
    }

    // Sanitize inputs
    const sanitizedAddress = sanitizeAddress(validation.data.address)
    const sanitizedChain = sanitizeChain(validation.data.chain) as ChainKey

    // Request deduplication key
    const requestKey = `${sanitizedChain}:${sanitizedAddress}`

    // Check if same request is already in progress
    if (ongoingRequests.has(requestKey)) {
      console.log(`[API] Request deduplication HIT for ${requestKey}`)
      const result = await ongoingRequests.get(requestKey)!
      
      const duration = Date.now() - startTime
      logApiRequest(request, { status: 200, duration })
      
      // Track usage (cache hit, no Etherscan calls)
      trackApiUsage(sanitizedAddress, sanitizedChain, true, 0)
      
      return NextResponse.json(
        {
          ...result,
          deduped: true,
        },
        {
          headers: {
            ...getCorsHeaders(request.headers.get('origin')),
            ...getSecurityHeaders(),
            'X-Response-Time': `${duration}ms`,
            'Request-Id': requestId,
            'X-Request-Id': requestId,
          },
        }
      )
    }

    // Create router and fetch stats
    const router = new DataSourceRouter(sanitizedChain)
    const statsPromise = router.fetchStats(sanitizedAddress as `0x${string}`)
    ongoingRequests.set(requestKey, statsPromise)

    try {
      const stats = await statsPromise
      const duration = Date.now() - startTime

      console.log(`[API] Stats fetched for ${sanitizedChain}:${sanitizedAddress} in ${duration}ms`)

      logApiRequest(request, { status: 200, duration })
      
      // Track usage (cache miss - estimate 5 Etherscan calls for RPC-only approach)
      // Note: With Etherscan API (Phase 1 plan), this would be actual API call count
      const estimatedEtherscanCalls = 5 // Conservative estimate for RPC fallback
      trackApiUsage(sanitizedAddress, sanitizedChain, false, estimatedEtherscanCalls)

      return NextResponse.json(
        {
          ...stats,
          duration,
        },
        {
          headers: {
            ...getCorsHeaders(request.headers.get('origin')),
            ...getSecurityHeaders(),
            'X-Response-Time': `${duration}ms`,
            'Request-Id': requestId,
            'X-Request-Id': requestId,
          },
        }
      )
    } finally {
      ongoingRequests.delete(requestKey)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[API] [${requestId}] Error fetching onchain stats:`, error)
    
    logApiRequest(request, { status: 500, duration, error: error instanceof Error ? error.message : 'Unknown error' })
    
    const errorResponse = createErrorResponse({
      error: 'Internal server error',
      message: 'Failed to fetch onchain stats',
      statusCode: 500,
    })
    errorResponse.headers.set('X-Request-ID', requestId)
    return errorResponse
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...getCorsHeaders(request.headers.get('origin')),
      ...getSecurityHeaders(),
    },
  })
}
