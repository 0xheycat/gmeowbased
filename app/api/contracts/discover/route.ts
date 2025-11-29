/**
 * Contract Discovery API
 * 
 * GET /api/contracts/discover
 * 
 * Dynamically discovers contract deployment blocks and badge addresses
 * from on-chain data for all supported chains.
 * 
 * This is useful for:
 * - Verifying environment variables are correct
 * - Auto-updating contract configuration
 * - Debugging deployment issues
 */

import { NextRequest, NextResponse } from 'next/server'
import { discoverAllContracts, discoverChainContracts } from '@/lib/contract-discovery'
import type { GMChainKey } from '@/lib/gmeow-utils'

export const runtime = 'nodejs' // Needs Node.js for viem's public client
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const chain = searchParams.get('chain') as GMChainKey | null

    // If specific chain requested, discover just that chain
    if (chain) {
      const validChains: GMChainKey[] = ['base', 'op', 'unichain', 'celo', 'ink', 'arbitrum']
      if (!validChains.includes(chain)) {
        return NextResponse.json(
          { error: `Invalid chain: ${chain}. Valid chains: ${validChains.join(', ')}` },
          { status: 400 }
        )
      }

      console.log(`[/api/contracts/discover] Discovering contracts for ${chain}...`)
      const result = await discoverChainContracts(chain)

      return NextResponse.json({
        success: true,
        chain,
        data: result,
        timestamp: new Date().toISOString(),
      })
    }

    // Discover all chains
    console.log('[/api/contracts/discover] Discovering contracts for all chains...')
    const results = await discoverAllContracts()

    // Generate environment variable updates
    const envUpdates: string[] = []
    
    Object.entries(results).forEach(([chainKey, data]) => {
      if (data.core?.deploymentBlock) {
        const envKey = `CHAIN_START_BLOCK_${chainKey.toUpperCase()}`
        envUpdates.push(`${envKey}=${data.core.deploymentBlock}`)
      }
      
      if (data.badge?.address && data.badge?.address !== '0x0000000000000000000000000000000000000000') {
        const envKey = `NEXT_PUBLIC_BADGE_CONTRACT_${chainKey.toUpperCase()}`
        envUpdates.push(`${envKey}=${data.badge.address}`)
      }
    })

    return NextResponse.json({
      success: true,
      data: results,
      envUpdates,
      timestamp: new Date().toISOString(),
      note: 'Copy envUpdates to your .env.local file to update contract configuration',
    })
  } catch (error) {
    console.error('[/api/contracts/discover] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
