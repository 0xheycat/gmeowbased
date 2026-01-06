/**
 * @file lib/contracts/scoring-module-client.ts
 * @description CLIENT-SAFE wrapper for scoring module (no server-side cache imports)
 * 
 * Phase: Production Fix - January 6, 2026
 * Issue: Client components cannot import scoring-module.ts due to server-side cache
 * Solution: Provide cache-free RPC-only wrappers for client components
 * 
 * Usage:
 * - Client components: import from '@/lib/contracts/scoring-module-client'
 * - Server components/API routes: import from '@/lib/contracts/scoring-module'
 */

import { type Address, getAddress } from 'viem'
import { getPublicClient } from '@/lib/contracts/rpc-client-pool'
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils'
import { SCORING_ABI } from '@/lib/contracts/abis'
import type { UserStats, LevelProgress, RankProgress, ScoreBreakdown } from '@/lib/contracts/scoring-module'

/** ScoringModule contract address (Base mainnet) */
const SCORING_MODULE_ADDRESS = STANDALONE_ADDRESSES.base.scoringModule

/**
 * Get user stats from ScoringModule contract (NO CACHE - CLIENT SAFE)
 * 
 * Direct RPC call without server-side caching.
 * Use this in client components. For server/API routes, use scoring-module.ts for cached version.
 * 
 * @param address - User wallet address (will be checksummed)
 * @returns User stats (level, rankTier, totalScore, multiplier)
 */
export async function getUserStatsOnChainClient(
  address: string
): Promise<UserStats> {
  const checksummedAddress = getAddress(address)
  const client = getPublicClient(8453) // Base mainnet
  
  const result = await client.readContract({
    address: SCORING_MODULE_ADDRESS,
    abi: SCORING_ABI,
    functionName: 'getUserStats',
    args: [checksummedAddress as Address],
  }) as [bigint, number, bigint, number]

  return {
    level: Number(result[0]),
    rankTier: result[1],
    totalScore: result[2],
    multiplier: result[3],
  }
}

/**
 * Get user level progress (NO CACHE - CLIENT SAFE)
 * 
 * Direct RPC call without server-side caching.
 */
export async function getLevelProgressOnChainClient(
  address: string
): Promise<LevelProgress> {
  const checksummedAddress = getAddress(address)
  const client = getPublicClient(8453) // Base mainnet
  
  const result = await client.readContract({
    address: SCORING_MODULE_ADDRESS,
    abi: SCORING_ABI,
    functionName: 'getLevelProgress',
    args: [checksummedAddress as Address],
  }) as [number, bigint, bigint, number]

  return {
    currentLevel: result[0],
    currentLevelXP: result[1],
    nextLevelXP: result[2],
    progress: result[3],
  }
}

/**
 * Get user rank progress (NO CACHE - CLIENT SAFE)
 * 
 * Direct RPC call without server-side caching.
 */
export async function getRankProgressOnChainClient(
  address: string
): Promise<RankProgress> {
  const checksummedAddress = getAddress(address)
  const client = getPublicClient(8453) // Base mainnet
  
  const result = await client.readContract({
    address: SCORING_MODULE_ADDRESS,
    abi: SCORING_ABI,
    functionName: 'getRankProgress',
    args: [checksummedAddress as Address],
  }) as [number, bigint, bigint, number]

  return {
    currentRank: result[0],
    currentRankScore: result[1],
    nextRankScore: result[2],
    progress: result[3],
  }
}

/**
 * Get user score breakdown (NO CACHE - CLIENT SAFE)
 * 
 * Direct RPC call without server-side caching.
 */
export async function getScoreBreakdownOnChainClient(
  address: string
): Promise<ScoreBreakdown> {
  const checksummedAddress = getAddress(address)
  const client = getPublicClient(8453) // Base mainnet
  
  const result = await client.readContract({
    address: SCORING_MODULE_ADDRESS,
    abi: SCORING_ABI,
    functionName: 'getScoreBreakdown',
    args: [checksummedAddress as Address],
  }) as [bigint, bigint, bigint, bigint, bigint]

  return {
    gmScore: result[0],
    questScore: result[1],
    guildScore: result[2],
    referralScore: result[3],
    stakingScore: result[4],
  }
}
