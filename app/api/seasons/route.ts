// /api/seasons/route.ts
import { NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { CONTRACT_ADDRESSES, CHAIN_IDS, ALL_CHAIN_IDS, normalizeToGMChain, GM_CONTRACT_ABI, gmContractHasFunction, type ChainKey, type GMChainKey } from '@/lib/contracts/gmeow-utils'
import { getRpcUrl } from '@/lib/contracts/rpc'
import { SeasonQuerySchema } from '@/lib/validation/api-schemas'
import { withErrorHandler, handleValidationError, handleExternalApiError } from '@/lib/middleware/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { generateRequestId } from '@/lib/middleware/request-id'

type SeasonTuple = readonly [bigint, bigint, bigint, boolean, string, boolean]
type SeasonInfo = {
  id: number
  startTime: number
  endTime: number
  totalRewards: string
  isActive: boolean
  rewardToken: string
  finalized: boolean
  current: boolean
}

type SeasonsResponse = {
  ok: true
  chain: ChainKey
  seasons: SeasonInfo[]
  reason?: string
}

const CACHE_TTL = 30_000
let cache: { key: string; at: number; data: SeasonsResponse } | null = null

const HAS_SEASON_ABI = gmContractHasFunction('getAllSeasons') && gmContractHasFunction('getSeason')

export const GET = withTiming(withErrorHandler(async (req: Request) => {
  const requestId = generateRequestId()
  const url = new URL(req.url)
  
  // Validate query parameters with Zod
  const queryValidation = SeasonQuerySchema.safeParse({
    chain: url.searchParams.get('chain') || undefined,
  })
  
  if (!queryValidation.success) {
    return NextResponse.json(
      { error: 'validation_error', issues: queryValidation.error.issues },
      { status: 400 }
    )
  }
  
  const chain = (queryValidation.data.chain || 'base') as ChainKey
  
  // Validate chain parameter and convert to GMChainKey for contract access
  const gmChain = normalizeToGMChain(chain) || 'base'
  const contractAddr = CONTRACT_ADDRESSES[gmChain]
  const chainId = ALL_CHAIN_IDS[chain]
  if (!contractAddr || !chainId) {
    return handleValidationError(new Error(`Invalid chain parameter: ${chain}. Supported chains: ${Object.keys(CONTRACT_ADDRESSES).join(', ')}`))
  }

    const key = `seasons:${chain}`
    if (cache && cache.key === key && Date.now() - cache.at < CACHE_TTL) {
      return NextResponse.json(cache.data, { headers: { 'cache-control': 's-maxage=30, stale-while-revalidate=60', 'X-Request-ID': requestId } })
    }

    if (!HAS_SEASON_ABI) {
      const data: SeasonsResponse = { ok: true, chain, seasons: [], reason: 'season_contract_functions_unavailable' }
      cache = { key, at: Date.now(), data }
      return NextResponse.json(data, { headers: { 'cache-control': 's-maxage=30, stale-while-revalidate=60', 'X-Request-ID': requestId } })
    }

  let rpc = ''
  try {
    rpc = getRpcUrl(chain)
  } catch (error) {
    rpc = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_BASE || ''
    if (!rpc) {
      throw handleExternalApiError(error instanceof Error ? error : new Error('RPC URL not configured'), 'RPC')
    }
  }
  const client = createPublicClient({ transport: http(rpc) })

  // Read all seasons count via getAllSeasons (returns ids)
  let ids: readonly bigint[] = []
  try {
    const res = await client.readContract({
      address: contractAddr,
      abi: GM_CONTRACT_ABI,
      functionName: 'getAllSeasons',
      args: [],
    })
    ids = Array.isArray(res) ? (res as unknown as readonly bigint[]) : []
  } catch (error) {
    // Empty season list is acceptable fallback
    console.warn(`[Seasons] Failed to read getAllSeasons for ${chain}:`, error)
    ids = []
  }

    const out: SeasonInfo[] = []
    const now = Date.now() / 1000
    for (const id of ids || []) {
      try {
        const s = await client.readContract({
          address: contractAddr,
          abi: GM_CONTRACT_ABI,
          functionName: 'getSeason',
          args: [id],
        })
        // getSeason returns (startTime,endTime,totalRewards,isActive,rewardToken,finalized)
        const [startTime, endTime, totalRewards, isActive, rewardToken, finalized] = s as unknown as SeasonTuple
        out.push({
          id: Number(id),
          startTime: Number(startTime),
          endTime: Number(endTime),
          totalRewards: String(totalRewards || 0n),
          isActive: Boolean(isActive),
          rewardToken: String(rewardToken),
          finalized: Boolean(finalized),
          current: Number(startTime) <= now && (Number(endTime) === 0 || Number(endTime) >= now) && Boolean(isActive),
        })
      } catch {
        // ignore per-season errors
      }
    }

  // mark "current" explicitly
  const data: SeasonsResponse = { ok: true, chain, seasons: out.sort((a, b) => b.id - a.id) }
  cache = { key, at: Date.now(), data }
  return NextResponse.json(data, { headers: { 'cache-control': 's-maxage=30, stale-while-revalidate=60', 'X-Request-ID': requestId } })
}))
