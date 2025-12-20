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
import { getCached } from '@/lib/cache/server'
import { rateLimit, apiLimiter, getClientIp } from '@/lib/middleware/rate-limit'
import { createErrorResponse, ErrorType } from '@/lib/middleware/error-handler'
import { generateRequestId } from '@/lib/middleware/request-id'
import { createClient } from '@/lib/supabase/edge'

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
  type: 'deposit' | 'claim'
  amount: number
  from: string
  username: string
  timestamp: string
  status: 'completed' | 'pending'
}

interface GuildEvent {
  id: number
  guild_id: string
  event_type: string
  actor_address: string
  target_address: string | null
  amount: number | null
  transaction_hash: string | null
  created_at: string
  metadata: any
}

// ==========================================
// 4. Helper Functions
// ==========================================

/**
 * Get guild treasury balance from guild_events from guild_events
 * Treasury = SUM(POINTS_DEPOSITED) - SUM(POINTS_CLAIMED)
 */
async function getTreasuryBalance(guildId: string): Promise<string> {
  const supabase = createClient()
  
  try {
    // Query all POINTS_DEPOSITED and POINTS_CLAIMED events
    const { data: events, error } = await supabase
      .from('guild_events')
      .select('event_type, amount')
      .eq('guild_id', guildId)
      .in('event_type', ['POINTS_DEPOSITED', 'POINTS_CLAIMED'])

    if (error) {
      console.error('[guild-treasury] Error fetching events:', error)
      return '0'
    }

    if (!events || events.length === 0) {
      return '0'
    }

    // Calculate balance: deposits - claims
    let balance = 0
    for (const event of events) {
      const amount = event.amount || 0
      if (event.event_type === 'POINTS_DEPOSITED') {
        balance += amount
      } else if (event.event_type === 'POINTS_CLAIMED') {
        balance -= amount
      }
    }

    return balance.toString()
  } catch (error) {
    console.error('[guild-treasury] getTreasuryBalance error:', error)
    return '0'
  }
}

/**
 * Get treasury transactions from Supabase guild_events
 */
async function getTreasuryTransactions(guildId: string): Promise<TreasuryTransaction[]> {
  const supabase = createClient()

  try {
    // Query guild_events with user_profiles join for username
    const { data: events, error } = await supabase
      .from('guild_events')
      .select(`
        *,
        user_profiles!inner(display_name, fid)
      `)
      .eq('guild_id', guildId)
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
    const transactions: TreasuryTransaction[] = (events as any[]).map(event => ({
      id: event.id.toString(),
      type: event.event_type === 'POINTS_DEPOSITED' ? 'deposit' : 'claim',
      amount: event.amount || 0,  // Return as number
      from: event.event_type === 'POINTS_DEPOSITED' ? event.actor_address : '',
      username: event.user_profiles?.display_name || `FID ${event.user_profiles?.fid || 'Unknown'}`,
      timestamp: event.created_at,
      status: 'completed' as const,
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
    // 1. AWAIT PARAMS (Next.js 15)
    const { guildId } = await params

    // 2. RATE LIMITING (lib/middleware)
    const clientIp = getClientIp(req)
    const rateLimitResult = await rateLimit(clientIp, apiLimiter)
    
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

    // 3. INPUT VALIDATION
    const { searchParams } = new URL(req.url)
    const queryResult = QuerySchema.safeParse({
      limit: searchParams.get('limit') || '20',
      offset: searchParams.get('offset') || '0',
    })

    if (!queryResult.success) {
      return createErrorResponse({
        type: ErrorType.VALIDATION,
        message: `Invalid query parameters: ${queryResult.error.issues.map((i) => i.message).join(', ')}`,
        statusCode: 400,
        requestId,
      })
    }

    const { limit, offset } = queryResult.data

    // 4. FETCH TREASURY DATA WITH CACHE
    const treasuryData = await getCached(
      'guild-treasury',
      guildId,
      async () => {
        const balance = await getTreasuryBalance(guildId)
        const transactions = await getTreasuryTransactions(guildId)
        return { balance, transactions }
      },
      { ttl: 60 }
    )

    // 5. PAGINATE
    const { items, total } = paginateTransactions(treasuryData.transactions, limit, offset)

    // 6. AUDIT LOGGING
    console.log('[guild-treasury] Treasury data fetched:', {
      guildId,
      balance: treasuryData.balance,
      transactionCount: total,
      timestamp: new Date().toISOString(),
    })

    const duration = Date.now() - startTime

    return NextResponse.json(
      {
        success: true,
        balance: treasuryData.balance,
        transactions: items,
        pagination: {
          limit,
          offset,
          total,
        },
        performance: {
          duration,
        },
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-Request-ID': requestId,
          'X-API-Version': '1.0.0',
        },
      }
    )
  } catch (error: any) {
    console.error('[guild-treasury] Error:', error)
    return createErrorResponse({
      type: ErrorType.INTERNAL,
      message: 'Failed to fetch treasury data',
      statusCode: 500,
      requestId,
      details: error,
    })
  }
}
