/**
 * Blockscout Contract Deployments API
 * 
 * Purpose: Get accurate contract deployment count using Blockscout MCP
 * Endpoint: /api/blockscout/contract-deployments?address=0x...&chain=base
 * 
 * Why: RPC-based detection is impractical (would need 100+ calls)
 *      Blockscout has indexed data, instant and free
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateRequestId } from '@/lib/request-id'

type ChainKey = 'base' | 'ethereum' | 'optimism' | 'arbitrum' | 'polygon' | 'gnosis' | 'celo' | 'scroll' | 'unichain' | 'soneium' | 'zksync' | 'zora'

const CHAIN_IDS: Record<ChainKey, string> = {
  base: '8453',
  ethereum: '1',
  optimism: '10',
  arbitrum: '42161',
  polygon: '137',
  gnosis: '100',
  celo: '42220',
  scroll: '534352',
  unichain: '130',
  soneium: '1868',
  zksync: '324',
  zora: '7777777',
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const address = request.nextUrl.searchParams.get('address')
    const chain = request.nextUrl.searchParams.get('chain') as ChainKey

    if (!address || !chain) {
      return NextResponse.json(
        { error: 'Missing address or chain parameter' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    if (!CHAIN_IDS[chain]) {
      return NextResponse.json(
        { error: `Unsupported chain: ${chain}. Supported: ${Object.keys(CHAIN_IDS).join(', ')}` },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Get contract deployments from Blockscout MCP
    // Note: This would use Blockscout MCP tools server-side
    // For now, we'll use Blockscout HTTP API directly
    
    const chainId = CHAIN_IDS[chain]
    const blockscoutDomain = getBlockscoutDomain(chain)
    
    // Fetch all transactions with pagination to find contract creations
    const allContractCreations: any[] = []
    let nextPageUrl: string | null = `https://${blockscoutDomain}/api/v2/addresses/${address}/transactions`
    let pageCount = 0
    const maxPages = 5 // Limit to 5 pages (250 transactions)
    
    while (nextPageUrl && pageCount < maxPages) {
      const pageResponse: Response = await fetch(nextPageUrl, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!pageResponse.ok) {
        throw new Error(`Blockscout API error: ${pageResponse.status}`)
      }

      const pageData: any = await pageResponse.json()
      
      // Filter contract creations from this page
      // Contract creation = "to" field is null
      const contractCreations = (pageData.items || []).filter(
        (tx: any) => {
          const isContractCreation = tx.to === null || tx.to === undefined
          const fromAddress = typeof tx.from === 'string' ? tx.from : tx.from?.hash
          const isFromUser = fromAddress?.toLowerCase() === address.toLowerCase()
          return isContractCreation && isFromUser
        }
      )
      
      allContractCreations.push(...contractCreations)
      
      // Check if there's a next page
      nextPageUrl = pageData.next_page_params ? 
        `https://${blockscoutDomain}/api/v2/addresses/${address}/transactions?${new URLSearchParams(pageData.next_page_params).toString()}` :
        null
      
      pageCount++
      
      // Stop if we found some contracts and no more pages
      if (allContractCreations.length > 0 && !nextPageUrl) {
        break
      }
    }

    return NextResponse.json({
      ok: true,
      address: address.toLowerCase(),
      chain,
      chainId,
      count: allContractCreations.length,
      deployedContracts: allContractCreations.map((tx: any) => ({
        address: tx.created_contract?.hash,
        name: tx.created_contract?.name,
        txHash: tx.hash,
        timestamp: tx.timestamp,
        verified: tx.created_contract?.is_verified,
      })),
    }, { headers: { 'X-Request-ID': requestId } })
  } catch (error: any) {
    console.error('[Blockscout API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contract deployments' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}

function getBlockscoutDomain(chain: ChainKey): string {
  const domains: Record<ChainKey, string> = {
    base: 'base.blockscout.com',
    ethereum: 'eth.blockscout.com',
    optimism: 'optimism.blockscout.com',
    arbitrum: 'arbitrum.blockscout.com',
    polygon: 'polygon.blockscout.com',
    gnosis: 'gnosis.blockscout.com',
    celo: 'celo.blockscout.com',
    scroll: 'scroll.blockscout.com',
    unichain: 'unichain.blockscout.com',
    soneium: 'soneium.blockscout.com',
    zksync: 'zksync.blockscout.com',
    zora: 'zora.blockscout.com',
  }
  return domains[chain]
}
