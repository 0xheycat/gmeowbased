/**
 * @file scripts/oracle/deposit-referral-points.ts
 * @description Oracle script to deposit referral bonus points to ScoringModule
 * 
 * Flow:
 * 1. Query Subsquid for all referral codes with rewards
 * 2. Calculate total rewards per user from ReferralUses
 * 3. Check current on-chain referralPoints
 * 4. Deposit difference to ScoringModule.addReferralPoints(user, bonus)
 * 5. Track tx hashes for audit trail
 * 
 * Usage:
 *   pnpm tsx scripts/oracle/deposit-referral-points.ts [--dry-run]
 */

import { createWalletClient, http, parseAbi, formatUnits, createPublicClient } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// ==========================================
// Constants
// ==========================================

const SCORING_ADDRESS = (process.env.NEXT_PUBLIC_GM_BASE_SCORING || '0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6') as `0x${string}`
const SUBSQUID_URL = 'https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql'
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'

// ==========================================
// Types
// ==========================================

interface ReferralCode {
  id: string
  owner: string
  totalUses: number
  totalRewards: string
}

interface UserReferralBonus {
  userAddress: string
  totalRewards: bigint
  referralCodes: {
    code: string
    uses: number
    rewards: bigint
  }[]
}

// ==========================================
// Subsquid Query
// ==========================================

async function fetchAllReferralData(): Promise<Map<string, UserReferralBonus>> {
  const query = `
    query {
      referralCodes {
        id
        owner
        totalUses
        totalRewards
      }
    }
  `

  const fetchImpl = globalThis.fetch || (await import('node-fetch')).default
  
  const response = await fetchImpl(SUBSQUID_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    throw new Error(`Subsquid query failed: ${response.statusText}`)
  }

  const json = await response.json()

  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`)
  }

  const referralCodes: ReferralCode[] = json.data?.referralCodes || []

  // Aggregate rewards per user
  const userBonusMap = new Map<string, UserReferralBonus>()

  for (const code of referralCodes) {
    const userAddress = code.owner.toLowerCase()
    const totalRewards = BigInt(code.totalRewards)

    if (!userBonusMap.has(userAddress)) {
      userBonusMap.set(userAddress, {
        userAddress,
        totalRewards: 0n,
        referralCodes: [],
      })
    }

    const userBonus = userBonusMap.get(userAddress)!

    userBonus.referralCodes.push({
      code: code.id,
      uses: code.totalUses,
      rewards: totalRewards,
    })

    userBonus.totalRewards += totalRewards
  }

  return userBonusMap
}

// ==========================================
// On-Chain Verification
// ==========================================

async function getCurrentReferralPoints(userAddress: string): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(RPC_URL),
  })

  const abi = parseAbi([
    'function getStats(address user) view returns (uint256 totalScore, uint256 level, uint8 rankTier, uint256 pointsBalance, uint256 viralPoints, uint256 questPoints, uint256 guildPoints, uint256 referralPoints)',
  ])

  try {
    const result = await publicClient.readContract({
      address: SCORING_ADDRESS,
      abi,
      functionName: 'getStats',
      args: [userAddress as `0x${string}`],
    })

    // Return referralPoints (index 7)
    return result[7] as bigint
  } catch (error: any) {
    console.error(`   ⚠️  Failed to get on-chain referral points:`, error.message)
    return 0n
  }
}

// ==========================================
// Oracle Deposit
// ==========================================

async function depositReferralPoints(userBonuses: Map<string, UserReferralBonus>, dryRun: boolean = false) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let client: any = null

  if (!dryRun) {
    const privateKey = process.env.ORACLE_PRIVATE_KEY as `0x${string}`
    if (!privateKey) throw new Error('ORACLE_PRIVATE_KEY not set')

    const account = privateKeyToAccount(privateKey)
    client = createWalletClient({
      account,
      chain: base,
      transport: http(RPC_URL),
    })

    console.log('\n🔐 Oracle wallet:', account.address)
  }

  const abi = parseAbi(['function addReferralPoints(address user, uint256 amount) external'])

  let successCount = 0
  let totalDeposited = 0n

  console.log(`\n📊 Processing ${userBonuses.size} users with referral bonuses...\n`)

  for (const [userAddress, userBonus] of userBonuses) {
    if (userBonus.totalRewards === 0n) {
      console.log(`⏭️  ${userAddress}: No referral rewards`)
      continue
    }

    // Check current on-chain value
    const currentOnChain = await getCurrentReferralPoints(userAddress)
    
    // Only deposit if different
    if (currentOnChain === userBonus.totalRewards) {
      console.log(`⏭️  ${userAddress}: Already synced (${userBonus.totalRewards} points)`)
      continue
    }

    const amountToDeposit = userBonus.totalRewards - currentOnChain

    console.log(`\n👤 ${userAddress}`)
    console.log(`   Current on-chain: ${currentOnChain}`)
    console.log(`   Subsquid total: ${userBonus.totalRewards}`)
    console.log(`   Amount to deposit: ${amountToDeposit}`)
    console.log(`   Referral Codes:`)

    for (const code of userBonus.referralCodes) {
      console.log(`     - "${code.code}" (${code.uses} uses, ${code.rewards} rewards)`)
    }

    if (dryRun) {
      console.log(`   🔍 DRY RUN: Would deposit ${amountToDeposit} referral points`)
      successCount++
      totalDeposited += amountToDeposit
      continue
    }

    try {
      const hash = await client!.writeContract({
        address: SCORING_ADDRESS,
        abi,
        functionName: 'addReferralPoints',
        args: [userAddress as `0x${string}`, amountToDeposit],
      })

      console.log(`   ✅ Deposited ${amountToDeposit} points`)
      console.log(`   📝 TX: ${hash}`)

      // Log to audit table
      const { error: insertError } = await supabase.from('referral_deposits').insert({
        user_address: userAddress,
        referral_bonus: amountToDeposit.toString(),
        referral_codes: userBonus.referralCodes.map((c) => ({
          code: c.code,
          uses: c.uses,
          rewards: c.rewards.toString(),
        })),
        tx_hash: hash,
        deposited_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error(`   ⚠️  Failed to log to referral_deposits:`, insertError.message)
      }

      successCount++
      totalDeposited += amountToDeposit
    } catch (err: any) {
      console.error(`   ❌ Deposit failed:`, err.message)
    }
  }

  console.log('\n' + '─'.repeat(60))
  console.log(`✅ ${successCount}/${userBonuses.size} users processed`)
  console.log(`📊 Total referral bonus deposited: ${totalDeposited}`)
  console.log('─'.repeat(60))
}

// ==========================================
// Main
// ==========================================

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  console.log('🎁 Referral Points Oracle Deposit')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE DEPOSIT'}`)
  console.log('Chain: Base')
  console.log(`ScoringModule: ${SCORING_ADDRESS}`)
  console.log('─'.repeat(60))

  // Validate environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase credentials not configured')
  }

  // Fetch data from Subsquid
  console.log('📊 Fetching referral codes from Subsquid...')
  const userBonuses = await fetchAllReferralData()

  console.log(`Found ${userBonuses.size} users with referral codes`)

  if (userBonuses.size === 0) {
    console.log('\n✅ No referral bonuses to deposit')
    return
  }

  // Deposit to ScoringModule
  await depositReferralPoints(userBonuses, dryRun)

  console.log('\n✅ Referral points deposit complete')
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
