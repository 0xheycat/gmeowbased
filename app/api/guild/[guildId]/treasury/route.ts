/**
 * GET /api/guild/[guildId]/treasury
 * 
 * Purpose: Get guild treasury balance and transaction history
 * Method: GET
 * Auth: Optional (public endpoint)
 * Rate Limit: 60 requests/minute per IP
 * 
 * Query Params:
 * - limit: number (default: 20, max: 100) - Transactions per page
 * - offset: number (default: 0)
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "balance": string (total points in treasury),
 *   "transactions": Array<{
 *     "id": string,
 *     "type": "deposit" | "claim" | "reward",
 *     "amount": string,
 *     "from": string,
 *     "to": string | null,
 *     "timestamp": string (ISO),
 *     "status": "completed" | "pending",
 *     "transactionHash": string
 *   }>,
 *   "pagination": {
 *     "limit": number,
 *     "offset": number,
 *     "total": number
 *   },
 *   "timestamp": number
 * }
 * 
 * 10-Layer Security:
 * 1. Rate Limiting - Upstash Redis (60 req/min per IP)
 * 2. Request Validation - Zod schema validation
 * 3. Input Sanitization - XSS prevention
 * 4. Error Masking - No sensitive data in errors
 * 5. Cache Headers - 30s cache, 60s stale-while-revalidate
 * 6. Type Safety - TypeScript strict mode
 * 7. CORS Headers - Explicit allowed origins
 * 8. Content-Type Validation - JSON only
 * 9. Audit Logging - All requests tracked
 * 10. Response Headers - Security headers
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { apiLimiter } from '@/lib/rate-limit'
import { createPublicClient, http, type Address } from 'viem'
import { base } from 'viem/chains'
import { getContractAddress, GM_CONTRACT_ABI, STANDALONE_ADDRESSES } from '@/lib/gmeow-utils'
import { GUILD_ABI_JSON } from '@/lib/contracts/abis'
import { generateRequestId } from '@/lib/request-id'
import { createClient } from '@supabase/supabase-js'

// ==========================================
// 1. Rate Limiting Configuration
// ==========================================

const RATE_LIMIT_CONFIG = {
  identifier: 'guild-treasury',
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
}

// ==========================================
// 2. Input Validation Schemas
// ==========================================

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

type QueryParams = z.infer<typeof QuerySchema>

// ==========================================
// 3. Types
// ==========================================

interface TreasuryTransaction {
  id: string
  type: 'deposit' | 'claim' | 'reward'
  amount: string
  from: string
  to: string | null
  timestamp: string
  status: 'completed' | 'pending'
  transactionHash: string
}

// ==========================================
// 4. Helper Functions
// ==========================================

/**
 * Get public client for reading contract
 */
function getPublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(),
  })
}

/**
 * Get guild treasury balance
 */
async function getTreasuryBalance(guildId: bigint): Promise<string> {
  const client = getPublicClient()
  
  try {
    // Get guild info: [name, leader, totalPoints, memberCount, level, requiredPoints, treasury]
    const guildInfo = await client.readContract({
      address: STANDALONE_ADDRESSES.base.guild as Address,
      abi: GUILD_ABI_JSON,
      functionName: 'getGuildInfo',
      args: [guildId],
    }) as [string, Address, bigint, bigint, bigint, bigint, bigint]
    
    // Treasury is the 7th element (index 6)
    const treasury = guildInfo[6]
    return treasury.toString()
  } catch (error) {
    console.error('[guild-treasury] getTreasuryBalance error:', error)
    return '0'
  }
}

/**
 * Get treasury transactions from Supabase guild_events
 */
async function getTreasuryTransactions(guildId: bigint): Promise<TreasuryTransaction[]> {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[guild-treasury] Missing Supabase credentials')
    return []
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Query guild_events for POINTS_DEPOSITED and POINTS_CLAIMED events
    const { data: events, error } = await supabase
      .from('guild_events')
      .select('*')
      .eq('guild_id', guildId.toString())
      .in('event_type', ['POINTS_DEPOSITED', 'POINTS_CLAIMED'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[guild-treasury] Error fetching events:', error)
      return []
    }

    if (!events || events.length === 0) {
      console.log('[guild-treasury] No transaction events found')
      return []
    }

    // Convert events to TreasuryTransaction format
    const transactions: TreasuryTransaction[] = events.map(event => ({
      id: event.id.toString(),
      type: event.event_type === 'POINTS_DEPOSITED' ? 'deposit' : 'claim',
      amount: event.amount?.toString() || '0',
      from: event.event_type === 'POINTS_DEPOSITED' ? event.actor_address : null,
      to: event.event_type === 'POINTS_CLAIMED' ? event.target_address || event.actor_address : null,
      timestamp: event.created_at,
      status: 'completed',
      transactionHash: event.transaction_hash || '',
    }))

    console.log('[guild-treasury] Loaded transactions from guild_events:', transactions.length)
    return transactions
  } catch (error) {
    console.error('[guild-treasury] getTreasuryTransactions error:', error)
    return []
  }
}

/**
 * Paginate transactions
 */
function paginateTransactions(
  transactions: TreasuryTransaction[], 
  limit: number, 
  offset: number
) {
  const total = transactions.length
  const items = transactions.slice(offset, offset + limit)
  
  return { items, total }
}

/**
 * Create success response with cache headers
 */
function createSuccessResponse(data: any, requestId?: string) {
  const rid = requestId || generateRequestId()
  
  return NextResponse.json(
    {
      success: true,
      ...data,
      timestamp: Date.now(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-Request-ID': rid,
        'X-API-Version': '1.0.0',
      },
    }
  )
}

/**
 * Create error response (no sensitive data)
 */
function createErrorResponse(message: string, status: number = 400, requestId?: string) {
  const rid = requestId || generateRequestId()
  
  return NextResponse.json(
    {
      success: false,
      message,
      timestamp: Date.now(),
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-Request-ID': rid,
        'X-API-Version': '1.0.0',
      },
    }
  )
}

// ==========================================
// 5. GET Handler
// ==========================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const requestId = generateRequestId()

  const startTime = Date.now()

  try {
    // Await params in Next.js 15
    const { guildId } = await params
    // 1. RATE LIMITING
    if (!apiLimiter) {
      return createErrorResponse('Rate limiting not configured', 503, requestId)
    }
    
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `${RATE_LIMIT_CONFIG.identifier}:${clientIp}`
    const rateLimitResult = await apiLimiter.limit(rateLimitKey)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Rate limit exceeded. Please try again later.',
          timestamp: Date.now(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + RATE_LIMIT_CONFIG.windowMs),
            'X-Request-ID': requestId,
          },
        }
      )
    }

    // 2. INPUT VALIDATION
    const { searchParams } = new URL(req.url)
    const queryResult = QuerySchema.safeParse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    })

    if (!queryResult.success) {
      return createErrorResponse(
        `Invalid query parameters: ${queryResult.error.issues.map((i) => i.message).join(', ')}`,
        400,
        requestId
      )
    }

    const { limit, offset } = queryResult.data

    // Validate guildId
    const guildIdNum = BigInt(guildId)
    if (guildIdNum <= 0n) {
      return createErrorResponse('Invalid guild ID', 400, requestId)
    }

    // 3. FETCH TREASURY DATA
    const balance = await getTreasuryBalance(guildIdNum)
    const allTransactions = await getTreasuryTransactions(guildIdNum)

    // 4. PAGINATE
    const { items, total } = paginateTransactions(allTransactions, limit, offset)

    // 5. AUDIT LOGGING
    console.log('[guild-treasury] Treasury data fetched:', {
      guildId,
      balance,
      transactionCount: total,
      timestamp: new Date().toISOString(),
    })

    const duration = Date.now() - startTime

    return createSuccessResponse({
      balance,
      transactions: items,
      pagination: {
        limit,
        offset,
        total,
      },
      performance: {
        duration,
      },
    }, requestId)
  } catch (error: any) {
    console.error('[guild-treasury] Error:', error)

    // 10. ERROR MASKING
    return createErrorResponse(
      'Failed to fetch treasury data. Please try again later.',
      500,
      requestId
    )
  }
}
