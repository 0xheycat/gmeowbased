/**
 * Onchain Stats API Route
 * 
 * Source: Extracted from old foundation OnchainStats.tsx
 * Optimized: Server-side caching, rate limiting, error handling
 * Purpose: Fetch onchain metrics without spamming RPCs
 */

import { NextResponse } from 'next/server'
import { createPublicClient, http, formatEther, type Address } from 'viem'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { withErrorHandler } from '@/lib/error-handler'
import { CHAIN_REGISTRY, type ChainKey } from '@/lib/chain-registry'
import { createEmptyStats, type OnchainStatsData } from '@/lib/onchain-stats-types'
import { fetchFidByAddress } from '@/lib/neynar'
import { getUserContractCount, getUserFeaturedContract } from '@/lib/supabase/contracts'

const ETHERSCAN_V2_BASE = 'https://api.etherscan.io/v2/api'
const STATS_CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes
const RPC_TIMEOUT_MS = 10000
const FETCH_TIMEOUT_MS = 4500

// In-memory cache (consider Redis for production)
const statsCache = new Map<string, { fetchedAt: number; stats: OnchainStatsData }>()

/**
 * Fetch JSON with timeout and abort controller
 */
async function fetchWithTimeout(url: string, timeout: number = FETCH_TIMEOUT_MS): Promise<any> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    return await response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * RPC call with timeout fallback
 */
async function rpcWithTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), RPC_TIMEOUT_MS))
  ])
}

/**
 * Count deployed contracts using Etherscan v2 API
 * Optimized: Paginated, early termination, deduplication
 */
async function countDeployedContracts(
  address: string,
  chainId: number,
  apiKey: string
): Promise<{ count: number; contracts: string[] }> {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
  const LIMIT = 1000
  const MAX_PAGES = 100
  let startBlock = 0
  
  const seenTxHashes = new Set<string>()
  const contractAddresses = new Set<string>()
  
  for (let page = 0; page < MAX_PAGES; page++) {
    try {
      const url = `${ETHERSCAN_V2_BASE}?chainid=${chainId}&module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=latest&page=1&offset=${LIMIT}&sort=asc&apikey=${apiKey}`
      
      const data = await fetchWithTimeout(url, 12000)
      const transactions: any[] = data?.status === '1' && Array.isArray(data.result) ? data.result : []
      
      if (transactions.length === 0) break
      
      for (const tx of transactions) {
        const hash = String(tx?.hash || '')
        if (!hash || seenTxHashes.has(hash)) continue
        
        seenTxHashes.add(hash)
        
        const toEmpty = !tx?.to || tx.to === ''
        const contractAddr = tx?.contractAddress || ''
        const normalizedAddr = typeof contractAddr === 'string' && contractAddr && contractAddr !== ZERO_ADDRESS
          ? contractAddr.toLowerCase()
          : null
        
        if (toEmpty || normalizedAddr) {
          contractAddresses.add(normalizedAddr || `tx:${hash}`)
        }
      }
      
      const lastTx = transactions[transactions.length - 1]
      const lastBlock = Number(lastTx?.blockNumber || 0)
      
      if (!lastBlock || transactions.length < LIMIT) break
      
      startBlock = Math.max(0, lastBlock - 1)
      
      // Rate limit: 140ms delay between requests
      await new Promise(resolve => setTimeout(resolve, 140))
    } catch (error) {
      console.warn(`Failed to fetch contracts page ${page}:`, error)
      break
    }
  }
  
  return {
    count: contractAddresses.size,
    contracts: Array.from(contractAddresses),
  }
}

/**
 * Compute total ETH volume (inbound + outbound)
 * Optimized: Parallel fetching, early termination
 */
async function computeEthTotalVolume(
  address: string,
  chainId: number,
  apiKey: string,
  nativeSymbol: string
): Promise<string | null> {
  const LIMIT = 1000
  const MAX_PAGES = 100
  const addressLower = address.toLowerCase()
  
  let inboundWei = 0n
  let outboundWei = 0n
  
  const processAction = async (action: 'txlist' | 'txlistinternal') => {
    let startBlock = 0
    
    for (let page = 0; page < MAX_PAGES; page++) {
      try {
        const url = `${ETHERSCAN_V2_BASE}?chainid=${chainId}&module=account&action=${action}&address=${address}&startblock=${startBlock}&endblock=99999999&page=1&offset=${LIMIT}&sort=asc&apikey=${apiKey}`
        
        const data = await fetchWithTimeout(url, 12000)
        const transactions: any[] = data?.status === '1' && Array.isArray(data.result) ? data.result : []
        
        if (transactions.length === 0) break
        
        for (const tx of transactions) {
          const value = BigInt(tx?.value || '0')
          const from = String(tx?.from || '').toLowerCase()
          const to = String(tx?.to || '').toLowerCase()
          
          if (from === addressLower && to !== addressLower) {
            outboundWei += value
          }
          
          if (to === addressLower && from !== addressLower) {
            inboundWei += value
          }
        }
        
        const lastTx = transactions[transactions.length - 1]
        const lastBlock = Number(lastTx?.blockNumber || 0)
        
        if (!lastBlock || transactions.length < LIMIT) break
        
        startBlock = Math.max(0, lastBlock - 1)
        
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 140))
      } catch (error) {
        console.warn(`Failed to fetch volume ${action} page ${page}:`, error)
        break
      }
    }
  }
  
  // Process both transaction types in parallel
  await Promise.all([
    processAction('txlist'),
    processAction('txlistinternal'),
  ])
  
  const totalWei = inboundWei + outboundWei
  const totalEth = Number(formatEther(totalWei))
  
  return `${totalEth.toFixed(4)} ${nativeSymbol}`
}

/**
 * Fetch Talent Protocol builder score
 */
async function fetchTalentScore(
  address: string,
  fid?: number
): Promise<{ score: number | null; updatedAt: string | null }> {
  const talentKey = process.env.NEXT_PUBLIC_TALENT_API_KEY || process.env.TALENT_API_KEY
  
  if (!talentKey) {
    return { score: null, updatedAt: null }
  }
  
  try {
    const id = fid != null ? String(fid) : address
    const source = fid != null ? 'farcaster' : 'wallet'
    
    const params = new URLSearchParams({ id })
    if (source) params.set('account_source', source)
    
    const response = await fetchWithTimeout(
      `https://api.talentprotocol.com/scores?${params.toString()}`,
      3500
    )
    
    if (!response) return { score: null, updatedAt: null }
    
    const scores = Array.isArray(response?.scores) ? response.scores : []
    const builderScore = scores.find((s: any) => String(s?.slug) === 'builder_score')
    
    if (!builderScore) return { score: null, updatedAt: null }
    
    return {
      score: typeof builderScore.points === 'number' 
        ? builderScore.points 
        : Number(builderScore.points),
      updatedAt: builderScore.last_calculated_at || null,
    }
  } catch (error) {
    console.warn('Failed to fetch Talent score:', error)
    return { score: null, updatedAt: null }
  }
}

/**
 * Fetch Neynar score and power badge
 */
async function fetchNeynarMetrics(
  address: string,
  fid?: number
): Promise<{ score: number | null; powerBadge: boolean | null }> {
  const neynarKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || process.env.NEYNAR_API_KEY
  
  if (!neynarKey) {
    return { score: null, powerBadge: null }
  }
  
  try {
    let resolvedFid = fid
    
    // Resolve FID from address if not provided
    if (resolvedFid == null) {
      try {
        const fetchedFid = await fetchFidByAddress(address)
        resolvedFid = fetchedFid ?? undefined
      } catch (error) {
        console.warn('Failed to resolve FID:', error)
        return { score: null, powerBadge: null }
      }
    }
    
    if (resolvedFid == null) {
      return { score: null, powerBadge: null }
    }
    
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${resolvedFid}`,
      {
        headers: {
          'x-api-key': neynarKey,
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    )
    
    if (!response.ok) {
      return { score: null, powerBadge: null }
    }
    
    const data = await response.json()
    const user = Array.isArray(data?.users) ? data.users[0] : null
    
    if (!user) {
      return { score: null, powerBadge: null }
    }
    
    const score = typeof user.score === 'number'
      ? user.score
      : (typeof user.experimental?.neynar_user_score === 'number' 
          ? user.experimental.neynar_user_score 
          : null)
    
    const powerBadge = typeof user.power_badge === 'boolean'
      ? user.power_badge
      : (typeof user.power_badge === 'string' ? user.power_badge === 'true' : null)
    
    return {
      score: score != null ? Number(score) : null,
      powerBadge,
    }
  } catch (error) {
    console.warn('Failed to fetch Neynar metrics:', error)
    return { score: null, powerBadge: null }
  }
}

/**
 * Main GET handler
 */
export const GET = withErrorHandler(async (req: Request) => {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { ok: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }
  
  const url = new URL(req.url)
  const address = url.searchParams.get('address')
  const chainKey = (url.searchParams.get('chain') || 'base') as ChainKey
  const force = url.searchParams.get('force') === 'true'
  
  if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid address format' },
      { status: 400 }
    )
  }
  
  const chainConfig = CHAIN_REGISTRY[chainKey]
  
  if (!chainConfig) {
    return NextResponse.json(
      { ok: false, error: 'Unsupported chain' },
      { status: 400 }
    )
  }
  
  const normalizedAddress = address.toLowerCase()
  const cacheKey = `stats:${normalizedAddress}:${chainKey}`
  
  // Check cache
  if (!force) {
    const cached = statsCache.get(cacheKey)
    if (cached && Date.now() - cached.fetchedAt < STATS_CACHE_TTL_MS) {
      return NextResponse.json({
        ok: true,
        data: cached.stats,
        cachedAt: cached.fetchedAt,
      })
    }
  }
  
  // Fetch fresh data
  const stats = createEmptyStats()
  
  try {
    // Create RPC client
    const client = createPublicClient({
      transport: http(chainConfig.rpc),
    })
    
    // Fetch basic RPC data (nonce and balance)
    const [nonce, balance] = await Promise.all([
      rpcWithTimeout(client.getTransactionCount({ address: normalizedAddress as Address }), 0),
      rpcWithTimeout(client.getBalance({ address: normalizedAddress as Address }), 0n),
    ])
    
    stats.totalOutgoingTxs = nonce
    stats.baseBalanceEth = `${Number(formatEther(balance)).toFixed(4)} ${chainConfig.nativeSymbol}`
    
    // Fetch Etherscan data if available
    const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 
                   process.env.NEXT_PUBLIC_BASESCAN_API_KEY || 
                   process.env.ETHERSCAN_API_KEY
    
    if (apiKey && chainConfig.hasEtherscanV2) {
      try {
        // Fetch first and last transaction timestamps
        const [firstTxData, lastTxData] = await Promise.all([
          fetchWithTimeout(
            `${ETHERSCAN_V2_BASE}?chainid=${chainConfig.chainId}&module=account&action=txlist&address=${normalizedAddress}&startblock=0&endblock=latest&page=1&offset=1&sort=asc&apikey=${apiKey}`,
            5000
          ),
          fetchWithTimeout(
            `${ETHERSCAN_V2_BASE}?chainid=${chainConfig.chainId}&module=account&action=txlist&address=${normalizedAddress}&startblock=0&endblock=latest&page=1&offset=1&sort=desc&apikey=${apiKey}`,
            5000
          ),
        ])
        
        const firstTx = firstTxData?.status === '1' && Array.isArray(firstTxData.result) ? firstTxData.result[0] : null
        const lastTx = lastTxData?.status === '1' && Array.isArray(lastTxData.result) ? lastTxData.result[0] : null
        
        if (firstTx?.timeStamp) {
          stats.firstTxAt = Number(firstTx.timeStamp)
          const nowSec = Math.floor(Date.now() / 1000)
          stats.baseAgeSeconds = Math.max(0, nowSec - stats.firstTxAt)
        }
        
        if (lastTx?.timeStamp) {
          stats.lastTxAt = Number(lastTx.timeStamp)
        }
        
        // Fetch contract deployments from Supabase (faster, more reliable)
        try {
          const contractCount = await getUserContractCount(normalizedAddress, chainKey)
          stats.contractsDeployed = contractCount
          
          // Get featured contract if available
          const featured = await getUserFeaturedContract(normalizedAddress, chainKey)
          if (featured) {
            stats.featured = {
              address: featured.contract_address,
              creator: featured.creator_address,
              creationTx: featured.deployment_tx,
              firstTxHash: null, // Not tracked in Supabase
              firstTxTime: featured.deployed_at ? Math.floor(new Date(featured.deployed_at).getTime() / 1000) : null,
              lastTxHash: null, // Not tracked in Supabase
              lastTxTime: null,
            }
          }
        } catch (error) {
          console.warn('Supabase contract query failed:', error)
          stats.contractsDeployed = 0
        }
        
        // Fetch total volume (runs in background)
        const volumePromise = computeEthTotalVolume(normalizedAddress, chainConfig.chainId, apiKey, chainConfig.nativeSymbol)
          .then(volume => {
            stats.totalVolumeEth = volume
          })
          .catch(() => {
            stats.totalVolumeEth = null
          })
        
        // Wait for volume calculation
        await volumePromise
      } catch (error) {
        console.warn('Etherscan API error:', error)
      }
    }
    
    // Fetch social metrics (Talent + Neynar) in parallel
    const [talentMetrics, neynarMetrics] = await Promise.all([
      fetchTalentScore(normalizedAddress),
      fetchNeynarMetrics(normalizedAddress),
    ])
    
    stats.talentScore = talentMetrics.score
    stats.talentUpdatedAt = talentMetrics.updatedAt
    stats.neynarScore = neynarMetrics.score
    stats.powerBadge = neynarMetrics.powerBadge
    
    // Cache results
    statsCache.set(cacheKey, {
      fetchedAt: Date.now(),
      stats,
    })
    
    // Clean old cache entries (keep last 1000)
    if (statsCache.size > 1000) {
      const entries = Array.from(statsCache.entries())
      entries.sort((a, b) => b[1].fetchedAt - a[1].fetchedAt)
      entries.slice(1000).forEach(([key]) => statsCache.delete(key))
    }
    
    return NextResponse.json({
      ok: true,
      data: stats,
    })
  } catch (error) {
    console.error('Failed to fetch onchain stats:', error)
    
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
      },
      { status: 500 }
    )
  }
})
