#!/usr/bin/env tsx
/**
 * Leaderboard Cache Warmup Script
 * 
 * Pre-warms cache for top leaderboard users to improve initial response times
 * Run this after deploying or during low-traffic periods
 * 
 * Usage:
 *   tsx scripts/warmup-leaderboard-cache.ts [--limit 100] [--period all_time]
 * 
 * NO HARDCODED COLORS
 * NO EMOJIS
 */

import { getSupabaseServerClient } from '../lib/supabase-server'
import { fetchUserByFid } from '../lib/neynar'
import { setCachedNeynarUser } from '../lib/cache/neynar-cache'
import { setCachedContractData } from '../lib/cache/contract-cache'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { base } from 'viem/chains'
import { CONTRACT_ADDRESSES, GM_CONTRACT_ABI } from '../lib/gmeow-utils'

// Parse command line arguments
const args = process.argv.slice(2)
const limitArg = args.find(arg => arg.startsWith('--limit='))
const periodArg = args.find(arg => arg.startsWith('--period='))

const WARMUP_LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : 100
const WARMUP_PERIOD = (periodArg ? periodArg.split('=')[1] : 'all_time') as 'daily' | 'weekly' | 'all_time'

console.log('[Cache Warmup] Starting cache warmup...')
console.log(`[Cache Warmup] Limit: ${WARMUP_LIMIT} users`)
console.log(`[Cache Warmup] Period: ${WARMUP_PERIOD}`)

/**
 * Get quest points from contract for an address
 */
async function getQuestPointsFromContract(address: string): Promise<number> {
  try {
    const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_BASE || 'https://mainnet.base.org'
    const client = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    })

    const contractAddress = CONTRACT_ADDRESSES.base
    const startBlock = BigInt(process.env.CHAIN_START_BLOCK_BASE || '0')
    const latestBlock = await client.getBlockNumber()

    const questCompletedEvent = parseAbiItem(
      'event QuestCompleted(uint256 indexed questId, address indexed user, uint256 pointsAwarded, uint256 fid, address rewardToken, uint256 tokenAmount)'
    )

    const chunkSize = 100000n
    let totalPoints = 0

    for (let fromBlock = startBlock; fromBlock <= latestBlock; fromBlock += chunkSize) {
      const toBlock = fromBlock + chunkSize > latestBlock ? latestBlock : fromBlock + chunkSize

      const logs = await client.getLogs({
        address: contractAddress,
        event: questCompletedEvent,
        args: { user: address as `0x${string}` },
        fromBlock,
        toBlock,
      })

      for (const log of logs) {
        if (log.args?.pointsAwarded) {
          totalPoints += Number(log.args.pointsAwarded)
        }
      }
    }

    return totalPoints
  } catch (error) {
    console.error(`[Cache Warmup] Error getting quest points for ${address}:`, error)
    return 0
  }
}

/**
 * Get streak bonus from contract for an address
 */
async function getStreakBonusFromContract(address: string): Promise<number> {
  try {
    const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_BASE || 'https://mainnet.base.org'
    const client = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    })

    const contractAddress = CONTRACT_ADDRESSES.base

    const profile = await client.readContract({
      address: contractAddress,
      abi: GM_CONTRACT_ABI,
      functionName: 'getUserProfile',
      args: [address as `0x${string}`],
    })

    if (profile && Array.isArray(profile) && profile.length >= 5) {
      const currentStreak = Number(profile[4])
      return currentStreak * 10
    }

    return 0
  } catch (error) {
    console.error(`[Cache Warmup] Error getting streak for ${address}:`, error)
    return 0
  }
}

/**
 * Warmup cache for a single user
 */
async function warmupUserCache(
  address: string,
  farcasterFid: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Warm up Neynar cache
    const neynarUser = await fetchUserByFid(farcasterFid)
    if (neynarUser) {
      await setCachedNeynarUser(farcasterFid, {
        fid: neynarUser.fid,
        username: neynarUser.username || '',
        displayName: neynarUser.displayName || '',
        pfpUrl: neynarUser.pfpUrl || '',
      })
    }

    // Warm up contract cache
    const basePoints = await getQuestPointsFromContract(address)
    const streakBonus = await getStreakBonusFromContract(address)
    
    await setCachedContractData({
      address,
      basePoints,
      streakBonus,
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Main warmup function
 */
async function main() {
  const startTime = Date.now()
  
  // Get Supabase client
  const supabase = getSupabaseServerClient()
  if (!supabase) {
    console.error('[Cache Warmup] ERROR: Supabase not configured')
    process.exit(1)
  }

  // Fetch top users from leaderboard
  const { data: users, error } = await supabase
    .from('leaderboard_calculations')
    .select('address, farcaster_fid, total_score, global_rank')
    .eq('period', WARMUP_PERIOD)
    .order('total_score', { ascending: false })
    .limit(WARMUP_LIMIT)

  if (error || !users) {
    console.error('[Cache Warmup] ERROR: Failed to fetch users:', error?.message)
    process.exit(1)
  }

  console.log(`[Cache Warmup] Found ${users.length} users to warm up`)

  // Warmup cache for each user
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    const progress = Math.round(((i + 1) / users.length) * 100)
    
    process.stdout.write(
      `\r[Cache Warmup] Progress: ${progress}% (${i + 1}/${users.length}) - Rank #${user.global_rank} (${user.address.slice(0, 8)}...)`
    )

    const result = await warmupUserCache(user.address, user.farcaster_fid)
    
    if (result.success) {
      successCount++
    } else {
      errorCount++
      console.error(
        `\n[Cache Warmup] ERROR warming up ${user.address}: ${result.error}`
      )
    }

    // Small delay to avoid overwhelming APIs
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const duration = Math.round((Date.now() - startTime) / 1000)
  
  console.log('\n')
  console.log('='.repeat(60))
  console.log('[Cache Warmup] COMPLETE!')
  console.log('='.repeat(60))
  console.log(`Success: ${successCount}/${users.length}`)
  console.log(`Errors: ${errorCount}/${users.length}`)
  console.log(`Duration: ${duration}s`)
  console.log(`Average: ${Math.round((duration / users.length) * 1000)}ms per user`)
  console.log('='.repeat(60))
  
  process.exit(errorCount > 0 ? 1 : 0)
}

// Run script
main().catch((error) => {
  console.error('[Cache Warmup] FATAL ERROR:', error)
  process.exit(1)
})
