#!/usr/bin/env tsx
/**
 * Viral Points Oracle Deposit Script
 * 
 * Aggregates viral_bonus_xp from badge_casts table and deposits to ScoringModule
 * via setViralPoints() oracle function.
 * 
 * FLOW:
 * 1. Query Supabase: Aggregate SUM(viral_bonus_xp) GROUP BY fid
 * 2. Join user_profiles: Get wallet addresses for each FID
 * 3. Batch process: Group users into batches of 50
 * 4. Call ScoringModule.setViralPoints(wallet, totalViralXP) for each user
 * 5. Track deposits: Log tx_hash to viral_deposits table
 * 
 * SECURITY:
 * - Oracle wallet must be authorized via setAuthorizedOracle()
 * - ORACLE_PRIVATE_KEY from environment (DO NOT COMMIT)
 * - Dry run mode for testing before live deposits
 * 
 * Usage:
 *   pnpm tsx scripts/oracle/deposit-viral-points.ts [--dry-run]
 * 
 * Created: January 11, 2026
 * Reference: LEADERBOARD-CATEGORY-SORTING-FIX.md (Viral XP Pipeline)
 */

import { config } from 'dotenv'
config({ path: process.env.DOTENV_PATH || '.env.local', override: true })

import { createClient } from '@supabase/supabase-js'
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import type { Database } from '../../types/supabase'

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY
const SCORING_MODULE_ADDRESS = process.env.NEXT_PUBLIC_GM_BASE_SCORING as `0x${string}`
const BATCH_SIZE = 50
const CHAIN = base

// ============================================================================
// Contract ABI
// ============================================================================

const SCORING_ABI = parseAbi([
  'function setViralPoints(address user, uint256 amount) external',
  'function viralPoints(address user) view returns (uint256)',
  'function authorizedOracles(address oracle) view returns (bool)',
])

// ============================================================================
// Types
// ============================================================================

type ViralXpAggregate = {
  fid: number
  total_viral_xp: number
  wallet_address: string
}

type DepositResult = {
  wallet: string
  fid: number
  viralXp: number
  txHash?: string
  error?: string
}

// ============================================================================
// Database Operations
// ============================================================================

async function fetchViralXpAggregates(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<ViralXpAggregate[]> {
  console.log('📊 Aggregating viral XP from badge_casts...')

  const { data, error } = await supabase.rpc('get_viral_xp_aggregates')

  if (error) {
    // If RPC function doesn't exist, fall back to manual aggregation
    console.log('⚠️  RPC function not found, using manual aggregation...')
    
    const { data: casts, error: castsError } = await supabase
      .from('badge_casts')
      .select('fid, viral_bonus_xp')
      .gt('viral_bonus_xp', 0)

    if (castsError) {
      throw new Error(`Failed to fetch badge casts: ${castsError.message}`)
    }

    // Manual aggregation
    const aggregates = new Map<number, number>()
    for (const cast of casts as any[]) {
      const current = aggregates.get(cast.fid) || 0
      aggregates.set(cast.fid, current + cast.viral_bonus_xp)
    }

    // Join with user_profiles to get wallet addresses
    const fids = Array.from(aggregates.keys())
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('fid, wallet_address')
      .in('fid', fids)
      .not('wallet_address', 'is', null)

    if (profilesError) {
      throw new Error(`Failed to fetch user profiles: ${profilesError.message}`)
    }

    return (profiles as any[]).map(profile => ({
      fid: profile.fid,
      total_viral_xp: aggregates.get(profile.fid) || 0,
      wallet_address: profile.wallet_address,
    }))
  }

  return data as ViralXpAggregate[]
}

async function logDeposit(
  supabase: ReturnType<typeof createClient<Database>>,
  fid: number,
  wallet: string,
  viralXp: number,
  txHash: string
) {
  // Log to viral_deposits table (create if doesn't exist)
  const { error } = await supabase.from('viral_deposits').insert({
    fid,
    wallet_address: wallet,
    viral_xp: viralXp,
    tx_hash: txHash,
    deposited_at: new Date().toISOString(),
  })

  if (error) {
    console.warn(`Failed to log deposit for FID ${fid}:`, error.message)
  }
}

// ============================================================================
// On-Chain Operations
// ============================================================================

async function verifyOracleAuthorization(
  publicClient: ReturnType<typeof createPublicClient>,
  oracleAddress: `0x${string}`
): Promise<boolean> {
  console.log('🔐 Verifying oracle authorization...')
  
  const isAuthorized = await publicClient.readContract({
    address: SCORING_MODULE_ADDRESS,
    abi: SCORING_ABI,
    functionName: 'authorizedOracles',
    args: [oracleAddress],
  })

  console.log(`Oracle ${oracleAddress}: ${isAuthorized ? '✅ Authorized' : '❌ Not Authorized'}`)
  return isAuthorized
}

async function depositViralPoints(
  walletClient: ReturnType<typeof createWalletClient>,
  publicClient: ReturnType<typeof createPublicClient>,
  user: `0x${string}`,
  viralXp: bigint
): Promise<string> {
  // Check current on-chain viral points
  const currentPoints = await publicClient.readContract({
    address: SCORING_MODULE_ADDRESS,
    abi: SCORING_ABI,
    functionName: 'viralPoints',
    args: [user],
  })

  console.log(`  Current on-chain: ${currentPoints}, New total: ${viralXp}`)

  // Only deposit if new amount is different
  if (currentPoints === viralXp) {
    console.log('  ⏭️  Already synced, skipping')
    throw new Error('ALREADY_SYNCED')
  }

  // Call setViralPoints
  const { request } = await publicClient.simulateContract({
    address: SCORING_MODULE_ADDRESS,
    abi: SCORING_ABI,
    functionName: 'setViralPoints',
    args: [user, viralXp],
    account: walletClient.account,
  })

  const txHash = await walletClient.writeContract(request)
  
  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash: txHash })
  
  return txHash
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run') || args.includes('-n')

  console.log('🚀 Viral Points Oracle Deposit')
  console.log(`Mode: ${dryRun ? 'DRY RUN (simulation only)' : 'LIVE (real deposits)'}`)
  console.log(`Chain: ${CHAIN.name}`)
  console.log(`ScoringModule: ${SCORING_MODULE_ADDRESS}`)
  console.log('─'.repeat(60))

  // Validate environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase credentials not configured')
  }

  if (!dryRun && !ORACLE_PRIVATE_KEY) {
    throw new Error('ORACLE_PRIVATE_KEY not configured (required for live deposits)')
  }

  if (!SCORING_MODULE_ADDRESS) {
    throw new Error('NEXT_PUBLIC_GM_BASE_SCORING not configured')
  }

  // Initialize clients
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(),
  })

  let walletClient: ReturnType<typeof createWalletClient> | null = null
  let oracleAddress: `0x${string}` | null = null

  if (!dryRun) {
    const oracleAccount = privateKeyToAccount(ORACLE_PRIVATE_KEY as `0x${string}`)
    oracleAddress = oracleAccount.address
    walletClient = createWalletClient({
      account: oracleAccount,
      chain: CHAIN,
      transport: http(),
    })

    // Verify oracle is authorized
    const isAuthorized = await verifyOracleAuthorization(publicClient, oracleAddress)
    if (!isAuthorized) {
      throw new Error(`Oracle wallet ${oracleAddress} is not authorized. Run setAuthorizedOracle() first.`)
    }
  }

  // Fetch viral XP data
  const aggregates = await fetchViralXpAggregates(supabase)
  console.log(`Found ${aggregates.length} users with viral XP\n`)

  if (aggregates.length === 0) {
    console.log('✅ No viral XP to deposit')
    return
  }

  // Process in batches
  const results: DepositResult[] = []
  
  for (let i = 0; i < aggregates.length; i += BATCH_SIZE) {
    const batch = aggregates.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(aggregates.length / BATCH_SIZE)
    
    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} users)`)
    console.log('─'.repeat(60))

    for (const user of batch) {
      try {
        console.log(`[${user.fid}] ${user.wallet_address} - ${user.total_viral_xp} XP`)

        if (dryRun) {
          console.log('  [DRY RUN] Would deposit to ScoringModule')
          results.push({
            wallet: user.wallet_address,
            fid: user.fid,
            viralXp: user.total_viral_xp,
          })
        } else {
          const txHash = await depositViralPoints(
            walletClient!,
            publicClient,
            user.wallet_address as `0x${string}`,
            BigInt(user.total_viral_xp)
          )

          console.log(`  ✅ Deposited: ${txHash}`)
          results.push({
            wallet: user.wallet_address,
            fid: user.fid,
            viralXp: user.total_viral_xp,
            txHash,
          })

          // Log to database
          await logDeposit(supabase, user.fid, user.wallet_address, user.total_viral_xp, txHash)
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'ALREADY_SYNCED') {
          results.push({
            wallet: user.wallet_address,
            fid: user.fid,
            viralXp: user.total_viral_xp,
          })
          continue
        }

        console.error(`  ❌ Error:`, error)
        results.push({
          wallet: user.wallet_address,
          fid: user.fid,
          viralXp: user.total_viral_xp,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      // Rate limit protection
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(60))
  console.log('📈 Deposit Summary:')
  console.log(`  Total users: ${aggregates.length}`)
  console.log(`  Successful: ${results.filter(r => !r.error).length}`)
  console.log(`  Errors: ${results.filter(r => r.error).length}`)
  console.log(`  Total XP deposited: ${aggregates.reduce((sum, u) => sum + u.total_viral_xp, 0)}`)
  console.log('✅ Complete')
}

// Run
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { fetchViralXpAggregates, depositViralPoints }
