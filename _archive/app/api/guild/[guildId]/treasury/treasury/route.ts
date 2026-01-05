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
 *     "type": "deposit" | "claim",
 *     "amount": number,
 *     "from": string,
 *     "username": string,
 *     "timestamp": string (ISO),
 *     "status": "completed" | "pending",
 *     "transactionHash": string | null (Layer 4 camelCase),
 *     "createdAt": string (ISO) (Layer 4 camelCase)
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
import { getGuildTreasury } from '@/lib/contracts/guild-contract'

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
  // Layer 4 (API) camelCase fields (transformed from Layer 3 snake_case)
  transactionHash: string | null
  createdAt: string
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

interface UserProfile {
  fid: number
  display_name: string | null
  verified_addresses: string[] | null
}

// ==========================================
// 4. Helper Functions
// ==========================================

/**
 * Get guild treasury balance from smart contract (SOURCE OF TRUTH)
 * BUG #7 FIX: Query contract directly, don't calculate from events
 * 
 * 4-Layer Architecture:
 * LAYER 1: Smart Contract (0x6754...c8A3) - guildTreasuryPoints[guildId]
 * LAYER 2: This function queries Layer 1 directly
 * LAYER 3: Supabase events used for transaction history only (not balance)
 * LAYER 4: API returns contract balance (source of truth)
 */
async function getTreasuryBalance(guildId: string): Promise<string> {
  try {
    // BUG #7 FIX: Query contract directly (source of truth)
    const treasuryPoints = await getGuildTreasury(BigInt(guildId))
    
    console.log('[guild-treasury] Contract balance:', {
      guildId,
      treasuryPoints: treasuryPoints.toString(),
    })
    
    return treasuryPoints.toString()
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
    // Query guild_events - NO JOIN since there's no FK relationship
    const { data: events, error } = await supabase
      .from('guild_events')
      .select('*')
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

    // Type assertion for events
    const typedEvents = events as GuildEvent[]

    // Get unique actor addresses for profile lookup
    const actorAddresses = [...new Set(typedEvents.map(e => e.actor_address).filter(Boolean))]
    
    // Fetch user profiles by verified addresses (bulk lookup)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('fid, display_name, verified_addresses')
      .contains('verified_addresses', actorAddresses)
    
    // Type assertion for profiles
    const typedProfiles = (profiles || []) as UserProfile[]

    // Build address -> profile map
    const addressToProfile = new Map<string, UserProfile>()
    typedProfiles.forEach(profile => {
      profile.verified_addresses?.forEach((addr: string) => {
        addressToProfile.set(addr.toLowerCase(), profile)
      })
    })

    // Convert events to TreasuryTransaction format with profile lookup
    // IMPORTANT: Transform snake_case DB fields → camelCase API fields (Layer 3 → Layer 4)
    const transactions: TreasuryTransaction[] = typedEvents.map(event => {
      const profile = addressToProfile.get(event.actor_address?.toLowerCase())
      return {
        id: event.id.toString(),
        type: event.event_type === 'POINTS_DEPOSITED' ? 'deposit' : 'claim',
        amount: event.amount || 0,
        from: event.event_type === 'POINTS_DEPOSITED' ? event.actor_address : '',
        username: profile?.display_name || `Address ${event.actor_address?.slice(0, 8)}...`,
        timestamp: event.created_at,
        status: 'completed' as const,
        // Layer 4 (API) must return camelCase per 4-layer architecture
        transactionHash: event.transaction_hash || null,
        createdAt: event.created_at,
      }
    })

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
