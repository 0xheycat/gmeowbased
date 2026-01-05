/**
 * DeFi Position Detection API
 * 
 * Detects DeFi protocol positions from token holdings using professional logic
 * inspired by DeBank, Zerion, and other major portfolio platforms.
 * 
 * Security: 10-layer protection (rate limiting, validation, sanitization, etc.)
 * Rate Limit: 60 requests/minute per IP
 * 
 * Protocols supported:
 * - Aave (aTokens, debtTokens)
 * - Compound (cTokens)
 * - Uniswap V2 (UNI-V2 LP tokens)
 * - Uniswap V3 (position NFTs)
 * - Curve (LP tokens)
 * - SushiSwap (SLP tokens)
 * - Balancer (BPT tokens)
 * 
 * POST /api/defi-positions
 * Body: { address: string, chain: string }
 * Response: { positions: [...], totalValueUSD: number, protocolCount: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Address } from 'viem'
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

// Blockscout MCP integration for token balances
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

// Protocol detection patterns (inspired by DeBank's protocol aggregation)
const PROTOCOL_PATTERNS = {
  aave: {
    tokenPatterns: ['aToken', 'a', 'debtToken'],
    protocolName: 'Aave',
    positionTypes: ['lending', 'borrowing'],
  },
  compound: {
    tokenPatterns: ['cToken', 'c'],
    protocolName: 'Compound',
    positionTypes: ['lending', 'borrowing'],
  },
  uniswapV2: {
    tokenPatterns: ['UNI-V2'],
    protocolName: 'Uniswap V2',
    positionTypes: ['liquidity'],
  },
  uniswapV3: {
    tokenPatterns: ['UNI-V3', 'Uniswap V3 Position'],
    protocolName: 'Uniswap V3',
    positionTypes: ['liquidity'],
  },
  curve: {
    tokenPatterns: ['Curve', 'CRV', '3Crv'],
    protocolName: 'Curve',
    positionTypes: ['liquidity'],
  },
  sushiswap: {
    tokenPatterns: ['SLP', 'SushiSwap LP'],
    protocolName: 'SushiSwap',
    positionTypes: ['liquidity'],
  },
  balancer: {
    tokenPatterns: ['BPT', 'Balancer'],
    protocolName: 'Balancer',
    positionTypes: ['liquidity'],
  },
}

interface TokenBalance {
  token_address: string
  token_symbol: string
  token_name: string
  balance: string
  decimals: number
  price_usd?: number
}

interface DeFiPosition {
  protocol: string
  position_type: string
  token_address: string
  token_symbol: string
  token_name: string
  balance: string
  value_usd: number
  detected_at: string
}

// Request validation schema
const defiPositionsSchema = z.object({
  address: ethereumAddressSchema,
  chain: chainSchema.optional().default('base'),
})

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()

  try {
    // ============================================================================
    // SECURITY: Apply 10-layer protection
    // ============================================================================
    const securityError = await applySecurityLayers(request, {
      rateLimitTier: RateLimitTier.STANDARD, // 60 req/min
      maxRequestSizeKB: 10, // Small request body
      logRequests: true,
    })

    if (securityError) return securityError

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
            'X-Request-ID': requestId,
          },
        }
      )
    }

    // Validate input schema
    const validation = validateInput(defiPositionsSchema, requestBody)
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

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    console.log(`[DeFi Positions] Detecting positions for ${address} on ${chain}`)

    // Step 1: Fetch token balances from Blockscout
    const domain = BLOCKSCOUT_DOMAINS[chain.toLowerCase()]
    if (!domain) {
      return NextResponse.json(
        { error: `Unsupported chain: ${chain}` },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    const balancesUrl = `https://${domain}/api/v2/addresses/${address.toLowerCase()}/token-balances`
    const balancesResponse = await fetch(balancesUrl, {
      headers: { Accept: 'application/json' },
    })

    if (!balancesResponse.ok) {
      console.error(`[DeFi Positions] Failed to fetch token balances:`, balancesResponse.status)
      return NextResponse.json(
        { error: 'Failed to fetch token balances' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    const balancesData: any = await balancesResponse.json()
    
    // Handle both array and object responses from Blockscout
    const tokenBalances: TokenBalance[] = Array.isArray(balancesData)
      ? balancesData.filter(item => item.token && item.value).map((item: any) => ({
          token_address: item.token.address,
          token_symbol: item.token.symbol,
          token_name: item.token.name,
          balance: item.value,
          decimals: parseInt(item.token.decimals) || 18,
          price_usd: 0, // Blockscout doesn't provide price in this endpoint
        }))
      : (balancesData.items || []).map((item: any) => ({
          token_address: item.token_address,
          token_symbol: item.token_symbol,
          token_name: item.token_name,
          balance: item.balance,
          decimals: item.decimals || 18,
          price_usd: item.price_usd || 0,
        }))

    console.log(`[DeFi Positions] Found ${tokenBalances.length} token balances`)

    // Step 2: Detect DeFi positions using pattern matching
    const detectedPositions: DeFiPosition[] = []
    let totalValueUSD = 0

    for (const token of tokenBalances) {
      // Skip zero balances
      if (!token.balance || token.balance === '0') continue

      // Check each protocol pattern
      for (const [protocolKey, protocolConfig] of Object.entries(PROTOCOL_PATTERNS)) {
        let isMatch = false
        let positionType = 'unknown'

        // Pattern matching against token symbol and name
        for (const pattern of protocolConfig.tokenPatterns) {
          if (
            token.token_symbol?.includes(pattern) ||
            token.token_name?.includes(pattern)
          ) {
            isMatch = true
            
            // Determine position type
            if (token.token_symbol?.includes('debt') || token.token_name?.toLowerCase().includes('debt')) {
              positionType = 'borrowing'
            } else if (protocolConfig.positionTypes.includes('lending')) {
              positionType = 'lending'
            } else if (protocolConfig.positionTypes.includes('liquidity')) {
              positionType = 'liquidity'
            }
            
            break
          }
        }

        if (isMatch) {
          // Calculate value in USD
          const rawBalance = BigInt(token.balance)
          const decimals = token.decimals || 18
          const balanceFloat = Number(rawBalance) / Math.pow(10, decimals)
          const priceUSD = token.price_usd || 0
          const valueUSD = balanceFloat * priceUSD

          totalValueUSD += valueUSD

          const position: DeFiPosition = {
            protocol: protocolConfig.protocolName,
            position_type: positionType,
            token_address: token.token_address,
            token_symbol: token.token_symbol,
            token_name: token.token_name,
            balance: balanceFloat.toString(),
            value_usd: valueUSD,
            detected_at: new Date().toISOString(),
          }

          detectedPositions.push(position)
          console.log(`[DeFi Positions] Detected ${protocolConfig.protocolName} position:`, position.token_symbol, `$${valueUSD.toFixed(2)}`)
          
          // Only match once per token
          break
        }
      }
    }

    // Step 3: Store positions in database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[DeFi Positions] Missing Supabase credentials')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    if (detectedPositions.length > 0) {
      const dbPositions = detectedPositions.map(pos => ({
        address: address.toLowerCase(),
        chain: chain.toLowerCase(),
        protocol: pos.protocol,
        position_type: pos.position_type,
        token_address: pos.token_address,
        token_symbol: pos.token_symbol,
        token_name: pos.token_name,
        balance: pos.balance,
        value_usd: pos.value_usd,
        detected_at: pos.detected_at,
      }))

      const { error: insertError } = await supabase
        .from('defi_positions')
        .upsert(dbPositions, {
          onConflict: 'address,chain,protocol,token_address',
        })

      if (insertError) {
        console.error('[DeFi Positions] Failed to store positions:', insertError)
      } else {
        console.log(`[DeFi Positions] Stored ${dbPositions.length} positions in database`)
      }
    }

    // Step 4: Get summary statistics
    const protocolSet = new Set(detectedPositions.map(p => p.protocol))
    const protocolCount = protocolSet.size

    const summary = {
      totalPositions: detectedPositions.length,
      protocolCount,
      totalValueUSD: Math.round(totalValueUSD * 100) / 100,
      protocols: Array.from(protocolSet),
      positions: detectedPositions.map(p => ({
        protocol: p.protocol,
        type: p.position_type,
        token: p.token_symbol,
        value: `$${p.value_usd.toFixed(2)}`,
      })),
    }

    console.log(`[DeFi Positions] Summary:`, summary)

    // Log successful request
    logApiRequest(request, {
      duration: Date.now() - startTime,
      status: 200,
    })

    return NextResponse.json(
      {
        success: true,
        address,
        chain,
        ...summary,
      },
      {
        headers: {
          ...getCorsHeaders(request.headers.get('origin')),
          ...getSecurityHeaders(),
          'X-Response-Time': `${Date.now() - startTime}ms`,
          'X-Request-ID': requestId,
          'Cache-Control': 's-maxage=180, stale-while-revalidate=360', // 3min cache for DeFi positions
        },
      }
    )
  } catch (error) {
    console.error('[DeFi Positions] Error:', error)
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
