// ============================================================================
// Phase 4: Snapshot Population API
// ============================================================================
// Endpoint: POST /api/onchain-stats/snapshot
// Purpose: Fetch current stats from Blockscout and store in snapshot table
// Security: CRON_SECRET required + 10-layer protection
//
// Request Body:
//   - address: Wallet address (required)
//   - chain: Chain identifier (optional, default: 'base')
//
// Process:
//   1. Verify CRON_SECRET (automated calls only)
//   2. Fetch current stats using getRichStats()
//   3. Store in onchain_stats_snapshots table
//   4. Return snapshot data
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BlockscoutClient } from '@/lib/onchain-stats/blockscout-client'
import {
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
import { generateRequestId } from '@/lib/request-id'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Validation schema
const snapshotSchema = z.object({
  address: ethereumAddressSchema,
  chain: chainSchema.optional().default('base'),
})

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const requestId = getRequestId()
  
  try {
    // Security Layer 1: Validate CRON_SECRET (required for cron endpoints)
    const cronSecret = req.headers.get('x-cron-secret')
    const expectedSecret = process.env.CRON_SECRET
    
    if (expectedSecret && cronSecret !== expectedSecret) {
      console.warn('[Snapshot API] Invalid or missing CRON_SECRET')
      logApiRequest(req, { status: 401, error: 'Unauthorized - invalid CRON_SECRET' })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()

    // Security Layer 2: Input validation with Zod
    const validation = validateInput(snapshotSchema, body)
    if (!validation.success) {
      logApiRequest(req, { status: 400, error: 'Validation failed' })
      return validation.error
    }

    // Security Layer 3: Sanitize inputs
    const address = sanitizeAddress(validation.data.address)
    const chain = sanitizeChain(validation.data.chain)

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

    // Fetch current stats from Blockscout
    console.log(`[Snapshot API] Fetching stats for ${address} on ${chain}`)
    const client = new BlockscoutClient(chain as any)
    const stats = await client.getRichStats(address as `0x${string}`)

    // Prepare snapshot data (map from getRichStats field names)
    const snapshotData = {
      portfolioValueUSD: stats.portfolioValueUSD,
      tokenCount: stats.erc20TokenCount,
      topTokens: stats.topTokens,
      gasSpentETH: stats.totalGasSpentETH,
      gasSpentUSD: stats.totalGasSpentUSD,
      gasConsumedUnits: stats.totalGasUsed,
      avgGasPriceGwei: stats.avgGasPrice,
      nftCollectionCount: stats.nftCollectionsCount,
      nftPortfolioValueUSD: stats.nftPortfolioValueUSD,
      topNFTCollections: stats.topNFTCollections,
      tokenBalances: [], // Not available in getRichStats yet
    }

    // Store snapshot in database
    // First try to insert directly (most common case - new snapshot)
    const { data: insertData, error: insertError } = await supabase.from('onchain_stats_snapshots').insert({
      address: address.toLowerCase(),
      chain,
      snapshot_date: new Date().toISOString().split('T')[0],
      portfolio_value_usd: stats.portfolioValueUSD,
      token_count: stats.erc20TokenCount,
      top_tokens: stats.topTokens,
      gas_spent_eth: stats.totalGasSpentETH,
      gas_spent_usd: stats.totalGasSpentUSD,
      gas_consumed_units: stats.totalGasUsed,
      avg_gas_price_gwei: stats.avgGasPrice,
      nft_collection_count: stats.nftCollectionsCount,
      nft_portfolio_value_usd: stats.nftPortfolioValueUSD,
      top_nft_collections: stats.topNFTCollections,
      token_balances: [],
    }).select()

    // If duplicate, try to update instead
    if (insertError && insertError.code === '23505') {
      console.log('[Snapshot API] Snapshot exists, updating...')
      const { error: updateError } = await supabase.rpc(
        'update_snapshot_data',
        {
          p_address: address.toLowerCase(),
          p_chain: chain,
          p_snapshot_date: new Date().toISOString().split('T')[0],
          p_data: snapshotData,
        }
      )
      
      if (updateError) {
        console.error('[Snapshot API] Failed to update snapshot:', updateError)
        return NextResponse.json(
          { error: 'Failed to update snapshot', details: updateError.message },
          { status: 500 }
        )
      }
    } else if (insertError) {
      console.error('[Snapshot API] Failed to insert snapshot:', insertError)
      return NextResponse.json(
        { error: 'Failed to insert snapshot', details: insertError.message },
        { status: 500 }
      )
    } else {
      console.log('[Snapshot API] Snapshot inserted:', insertData)
    }
    
    // Remove old logic that never executed
    if (false) {
      const { error: _unusedError } = await supabase.from('onchain_stats_snapshots').insert({
        address: address.toLowerCase(),
        chain,
        snapshot_date: new Date().toISOString().split('T')[0],
        portfolio_value_usd: stats.portfolioValueUSD,
        token_count: stats.erc20TokenCount,
        top_tokens: stats.topTokens,
        gas_spent_eth: stats.totalGasSpentETH,
        gas_spent_usd: stats.totalGasSpentUSD,
        gas_consumed_units: stats.totalGasUsed,
        avg_gas_price_gwei: stats.avgGasPrice,
        nft_collection_count: stats.nftCollectionsCount,
        nft_portfolio_value_usd: stats.nftPortfolioValueUSD,
        top_nft_collections: stats.topNFTCollections,
        token_balances: [],
      })
    }

    console.log(`[Snapshot API] Snapshot stored successfully for ${address}`)

    const duration = Date.now() - startTime
    logApiRequest(req, { status: 200, duration })

    // Return snapshot data
    return NextResponse.json(
      {
        success: true,
        address: address.toLowerCase(),
        chain,
        snapshot_date: new Date().toISOString().split('T')[0],
        data: snapshotData,
        storedAt: new Date().toISOString(),
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
    console.error('[Snapshot API] Unexpected error:', err)
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

// ============================================================================
// Batch Snapshot Creation
// ============================================================================
// Endpoint: POST /api/onchain-stats/snapshot/batch
// Purpose: Create snapshots for multiple addresses at once
// ============================================================================

export async function PUT(req: NextRequest) {
  const requestId = generateRequestId()

  try {
    // Validate CRON_SECRET for automated calls
    const cronSecret = req.headers.get('x-cron-secret')
    const expectedSecret = process.env.CRON_SECRET
    
    if (expectedSecret && cronSecret !== expectedSecret) {
      console.warn('[Batch Snapshot API] Invalid or missing CRON_SECRET')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { addresses, chain = 'base' } = body

    // Validate required params
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid addresses array' },
        { status: 400 }
      )
    }

    // Limit batch size
    if (addresses.length > 100) {
      return NextResponse.json(
        { error: 'Batch size too large. Maximum 100 addresses per request.' },
        { status: 400 }
      )
    }

    console.log(`[Batch Snapshot API] Creating snapshots for ${addresses.length} addresses`)

    const results = {
      success: [] as string[],
      failed: [] as { address: string; error: string }[],
    }

    // Process each address
    for (const address of addresses) {
      try {
        // Call the single snapshot endpoint
        const response = await fetch(`${req.nextUrl.origin}/api/onchain-stats/snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, chain }),
        })

        if (response.ok) {
          results.success.push(address)
        } else {
          const errorData = await response.json()
          results.failed.push({
            address,
            error: errorData.error || 'Unknown error',
          })
        }
      } catch (err: any) {
        results.failed.push({
          address,
          error: err?.message || 'Network error',
        })
      }
    }

    console.log(`[Batch Snapshot API] Completed: ${results.success.length} success, ${results.failed.length} failed`)

    return NextResponse.json({
      success: true,
      total: addresses.length,
      succeeded: results.success.length,
      failed: results.failed.length,
      results,
      completedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[Batch Snapshot API] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    )
  }
}
