/**
 * Transaction Pattern Analysis API
 * 
 * Analyzes transaction patterns and behavioral characteristics inspired by
 * professional platforms like Nansen, Zerion, and Arkham Intelligence.
 * 
 * Security: 10-layer protection (rate limiting, validation, sanitization, etc.)
 * Rate Limit: 60 requests/minute per IP
 * 
 * Features:
 * - 24-hour activity heatmap (0-23 hours)
 * - Days of week analysis (0-6, Sunday-Saturday)
 * - Whale classification (4 tiers based on portfolio value)
 * - Bot detection (MEV bot, arbitrageur, high-frequency trader)
 * - Transaction frequency metrics (daily/weekly/monthly averages)
 * - Contract interaction patterns
 * 
 * GET /api/transaction-patterns?address=0x...&chain=base
 * Response: { whaleTier: string, isBot: boolean, activeHours: {...}, patterns: {...} }
 */

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
} from '@/lib/middleware/api-security'
import { z } from 'zod'
import { generateRequestId } from '@/lib/middleware/request-id'

// Blockscout MCP integration
const BLOCKSCOUT_DOMAINS: Record<string, string> = {
  base: 'base.blockscout.com',
  ethereum: 'eth.blockscout.com',
  optimism: 'optimism.blockscout.com',
  arbitrum: 'arbitrum.blockscout.com',
  polygon: 'polygon.blockscout.com',
  gnosis: 'gnosis.blockscout.com',
  celo: 'celo.blockscout.com',
  scroll: 'scroll.blockscout.com',
  zksync: 'zksync.blockscout.com',
}

// Whale classification thresholds (inspired by Nansen)
const WHALE_TIERS = {
  MEGA_WHALE: 10_000_000, // $10M+
  WHALE: 1_000_000,       // $1M+
  DOLPHIN: 100_000,       // $100K+
  SHRIMP: 0,              // < $100K
}

interface Transaction {
  hash: string
  timestamp: string
  from: string
  to: string | null
  value: string
  gas_used: string
  gas_price: string
  method: string | null
}

interface PatternAnalysis {
  address: string
  chain: string
  active_hours: Record<string, number>
  active_days_of_week: Record<string, number>
  daily_avg_txs: number
  weekly_avg_txs: number
  monthly_avg_txs: number
  whale_classification: 'mega_whale' | 'whale' | 'dolphin' | 'shrimp'
  portfolio_value_usd: number
  is_bot: boolean
  is_mev_bot: boolean
  is_arbitrageur: boolean
  is_high_frequency: boolean
  bot_confidence_score: number
}

// Query parameter validation schema
const patternsQuerySchema = z.object({
  address: ethereumAddressSchema,
  chain: chainSchema.optional().default('base'),
})

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()

  try {
    // ============================================================================
    // SECURITY: Apply 10-layer protection
    // ============================================================================
    const securityError = await applySecurityLayers(request, {
      rateLimitTier: RateLimitTier.STANDARD, // 60 req/min
      maxRequestSizeKB: 10,
      logRequests: true,
    })

    if (securityError) return securityError

    // ============================================================================
    // INPUT VALIDATION & SANITIZATION
    // ============================================================================
    const { searchParams } = new URL(request.url)
    const rawParams = {
      address: searchParams.get('address'),
      chain: searchParams.get('chain') || 'base',
    }

    // Validate query parameters
    const validation = validateInput(patternsQuerySchema, rawParams)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', message: validation.error },
        {
          status: 400,
          headers: {
            ...getCorsHeaders(request.headers.get('origin')),
            ...getSecurityHeaders(),
            'X-Request-ID': requestId,
          },
        }
      )
    }

    // Sanitize inputs
    const address = sanitizeAddress(validation.data.address)
    const chain = sanitizeChain(validation.data.chain)

    console.log(`[Transaction Patterns] Analyzing patterns for ${address} on ${chain}`)

    // Step 1: Fetch transactions from Blockscout
    const domain = BLOCKSCOUT_DOMAINS[chain.toLowerCase()]
    if (!domain) {
      return NextResponse.json(
        { error: `Unsupported chain: ${chain}` },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    const txUrl = `https://${domain}/api/v2/addresses/${address.toLowerCase()}/transactions`
    const txResponse = await fetch(txUrl, {
      headers: { Accept: 'application/json' },
    })

    if (!txResponse.ok) {
      console.error(`[Transaction Patterns] Failed to fetch transactions:`, txResponse.status)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    const txData: any = await txResponse.json()
    const transactions: Transaction[] = txData.items || []

    console.log(`[Transaction Patterns] Found ${transactions.length} transactions`)

    // Step 2: Fetch portfolio value for whale classification
    const statsUrl = `https://${domain}/api/v2/addresses/${address.toLowerCase()}`
    const statsResponse = await fetch(statsUrl, {
      headers: { Accept: 'application/json' },
    })

    let portfolioValue = 0
    if (statsResponse.ok) {
      const statsData: any = await statsResponse.json()
      portfolioValue = parseFloat(statsData.coin_balance || '0')
    }

    // Step 3: Analyze time patterns
    const activeHours: Record<string, number> = {}
    const activeDays: Record<string, number> = {}

    for (let i = 0; i < 24; i++) activeHours[i.toString()] = 0
    for (let i = 0; i < 7; i++) activeDays[i.toString()] = 0

    let contractInteractions = 0
    let highFrequencyIntervals = 0
    let avgTimeBetweenTxs = 0

    const timestamps = transactions.map(tx => new Date(tx.timestamp).getTime()).sort((a, b) => a - b)

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i]
      const date = new Date(tx.timestamp)

      // Hour analysis (0-23)
      const hour = date.getUTCHours()
      activeHours[hour.toString()]++

      // Day of week analysis (0-6, Sunday-Saturday)
      const dayOfWeek = date.getUTCDay()
      activeDays[dayOfWeek.toString()]++

      // Contract interactions (to address is not null = contract call)
      if (tx.to !== null) {
        contractInteractions++
      }

      // Time between transactions
      if (i > 0) {
        const timeDiff = timestamps[i] - timestamps[i - 1]
        avgTimeBetweenTxs += timeDiff

        // High-frequency detection: < 1 minute between txs
        if (timeDiff < 60_000) {
          highFrequencyIntervals++
        }
      }
    }

    avgTimeBetweenTxs = transactions.length > 1 ? avgTimeBetweenTxs / (transactions.length - 1) : 0

    // Step 4: Bot detection logic (inspired by Nansen)
    const totalTxs = transactions.length
    const contractInteractionRate = totalTxs > 0 ? contractInteractions / totalTxs : 0
    const highFrequencyRate = totalTxs > 1 ? highFrequencyIntervals / (totalTxs - 1) : 0
    
    // Bot indicators:
    // - High contract interaction rate (> 80%)
    // - High frequency transactions (> 30% within 1 minute)
    // - Low time between transactions (< 5 minutes average)
    const avgMinutesBetweenTxs = avgTimeBetweenTxs / 60_000

    const isMevBot = highFrequencyRate > 0.5 && contractInteractionRate > 0.9
    const isArbitrageur = highFrequencyRate > 0.3 && contractInteractionRate > 0.8
    const isHighFrequency = avgMinutesBetweenTxs < 5 && totalTxs > 50

    const isBot = isMevBot || isArbitrageur || isHighFrequency

    // Bot confidence score (0-100)
    const botConfidence = Math.min(100, Math.round(
      (highFrequencyRate * 50) +
      (contractInteractionRate * 30) +
      ((avgMinutesBetweenTxs < 5 ? 1 : 0) * 20)
    ))

    // Step 5: Whale classification
    let whaleClass: 'mega_whale' | 'whale' | 'dolphin' | 'shrimp' = 'shrimp'
    if (portfolioValue >= WHALE_TIERS.MEGA_WHALE) whaleClass = 'mega_whale'
    else if (portfolioValue >= WHALE_TIERS.WHALE) whaleClass = 'whale'
    else if (portfolioValue >= WHALE_TIERS.DOLPHIN) whaleClass = 'dolphin'

    // Step 6: Calculate frequency metrics
    if (transactions.length > 0) {
      const oldestTx = new Date(transactions[transactions.length - 1].timestamp).getTime()
      const newestTx = new Date(transactions[0].timestamp).getTime()
      const totalDays = (newestTx - oldestTx) / (1000 * 60 * 60 * 24)

      const dailyAvg = totalDays > 0 ? totalTxs / totalDays : 0
      const weeklyAvg = dailyAvg * 7
      const monthlyAvg = dailyAvg * 30

      const analysis: PatternAnalysis = {
        address: address.toLowerCase(),
        chain: chain.toLowerCase(),
        active_hours: activeHours,
        active_days_of_week: activeDays,
        daily_avg_txs: Math.round(dailyAvg * 10) / 10,
        weekly_avg_txs: Math.round(weeklyAvg * 10) / 10,
        monthly_avg_txs: Math.round(monthlyAvg * 10) / 10,
        whale_classification: whaleClass,
        portfolio_value_usd: Math.round(portfolioValue * 100) / 100,
        is_bot: isBot,
        is_mev_bot: isMevBot,
        is_arbitrageur: isArbitrageur,
        is_high_frequency: isHighFrequency,
        bot_confidence_score: botConfidence,
      }

      // Step 7: Store pattern analysis in database
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('[Transaction Patterns] Missing Supabase credentials')
      } else {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { error: insertError } = await supabase
          .from('transaction_patterns')
          .upsert([analysis], {
            onConflict: 'address,chain',
          })

        if (insertError) {
          console.error('[Transaction Patterns] Failed to store analysis:', insertError)
        } else {
          console.log(`[Transaction Patterns] Stored pattern analysis in database`)
        }
      }

      // Step 8: Return summary
      const summary = {
        success: true,
        address,
        chain,
        totalTransactions: totalTxs,
        whaleTier: whaleClass,
        portfolioValue: `$${portfolioValue.toFixed(2)}`,
        behaviorType: isBot ? 'Bot' : 'Human',
        botFlags: {
          isMevBot,
          isArbitrageur,
          isHighFrequency,
          confidence: `${botConfidence}%`,
        },
        activityMetrics: {
          dailyAvg: analysis.daily_avg_txs,
          weeklyAvg: analysis.weekly_avg_txs,
          monthlyAvg: analysis.monthly_avg_txs,
          avgMinutesBetweenTxs: Math.round(avgMinutesBetweenTxs * 10) / 10,
        },
        activeHours: Object.entries(activeHours)
          .filter(([_, count]) => count > 0)
          .sort(([_, a], [__, b]) => b - a)
          .slice(0, 5)
          .map(([hour, count]) => ({ hour: `${hour}:00 UTC`, count })),
        activeDays: Object.entries(activeDays)
          .map(([day, count]) => ({
            day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(day)],
            count,
          }))
          .filter(d => d.count > 0)
          .sort((a, b) => b.count - a.count),
      }

      console.log(`[Transaction Patterns] Summary:`, summary)

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
          'X-Request-ID': requestId,
          'Cache-Control': 's-maxage=180, stale-while-revalidate=360', // 3min cache for pattern analysis
        },
      })
    } else {
      logApiRequest(request, {
        duration: Date.now() - startTime,
        status: 200,
      })

      return NextResponse.json(
        {
          success: true,
          address,
          chain,
          totalTransactions: 0,
          whaleTier: 'shrimp',
          portfolioValue: '$0.00',
          behaviorType: 'Unknown',
          message: 'No transactions found',
        },
        {
          headers: {
            ...getCorsHeaders(request.headers.get('origin')),
            ...getSecurityHeaders(),
            'X-Response-Time': `${Date.now() - startTime}ms`,
            'X-Request-ID': requestId,
            'Cache-Control': 's-maxage=180, stale-while-revalidate=360', // 3min cache for pattern analysis
          },
        }
      )
    }
  } catch (error) {
    console.error('[Transaction Patterns] Error:', error)
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
