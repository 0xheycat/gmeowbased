/**
 * @file scripts/oracle/deposit-guild-points.ts
 * @description Oracle script to deposit guild bonus points to ScoringModule
 * 
 * Flow:
 * 1. Query Subsquid for all active guild members
 * 2. Calculate role-based bonus: OWNER 2.0x | OFFICER 1.5x | MEMBER 1.0x
 * 3. Aggregate bonus per user: pointsContributed × multiplier
 * 4. Deposit to ScoringModule.addGuildPoints(user, bonus)
 * 5. Track tx hashes for audit trail
 * 
 * Usage:
 *   pnpm tsx scripts/oracle/deposit-guild-points.ts [--dry-run]
 */

import { createWalletClient, http, parseAbi, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// ==========================================
// Constants
// ==========================================

const SCORING_ADDRESS = '0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6'
const SUBSQUID_URL = 'https://4d343279-1b28-406c-886e-e47719c79639.squids.live/gmeow-indexer@v1/api/graphql'

const ROLE_MULTIPLIERS: Record<string, number> = {
  leader: 2.0,   // Guild owner
  officer: 1.5,  // Guild officer
  member: 1.0,   // Regular member
}

// ==========================================
// Types
// ==========================================

interface GuildMemberData {
  user: { id: string }
  pointsContributed: string
  role: string
}

interface GuildData {
  id: string
  name: string
  members: GuildMemberData[]
}

interface UserGuildBonus {
  userAddress: string
  totalBonus: bigint
  guilds: {
    guildId: string
    guildName: string
    pointsContributed: bigint
    role: string
    multiplier: number
    bonus: bigint
  }[]
}

// ==========================================
// Subsquid Query
// ==========================================

async function fetchAllGuildMembers(): Promise<GuildData[]> {
  const query = `
    query {
      guilds {
        id
        name
        members {
          user { id }
          pointsContributed
          role
        }
      }
    }
  `

  // Use dynamic import for node-fetch in Node.js environment
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

  return json.data?.guilds || []
}

// ==========================================
// Guild Bonus Calculation
// ==========================================

function calculateGuildBonuses(guilds: GuildData[]): Map<string, UserGuildBonus> {
  const userBonusMap = new Map<string, UserGuildBonus>()

  for (const guild of guilds) {
    for (const member of guild.members) {
      const userAddress = member.user.id.toLowerCase()
      const pointsContributed = BigInt(member.pointsContributed)
      const role = member.role.toLowerCase()
      const multiplier = ROLE_MULTIPLIERS[role] || 1.0
      const bonus = BigInt(Math.floor(Number(pointsContributed) * multiplier))

      // Initialize user entry if not exists
      if (!userBonusMap.has(userAddress)) {
        userBonusMap.set(userAddress, {
          userAddress,
          totalBonus: 0n,
          guilds: [],
        })
      }

      const userBonus = userBonusMap.get(userAddress)!

      // Add guild contribution
      userBonus.guilds.push({
        guildId: guild.id,
        guildName: guild.name,
        pointsContributed,
        role,
        multiplier,
        bonus,
      })

      // Accumulate total bonus
      userBonus.totalBonus += bonus
    }
  }

  return userBonusMap
}

// ==========================================
// Oracle Deposit
// ==========================================

async function depositGuildPoints(userBonuses: Map<string, UserGuildBonus>, dryRun: boolean = false) {
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
      transport: http('https://mainnet.base.org'),
    })

    console.log('\n🔐 Oracle wallet:', account.address)
  }

  const abi = parseAbi(['function addGuildPoints(address user, uint256 amount) external'])

  let successCount = 0
  let totalBonus = 0n

  console.log(`\n📊 Processing ${userBonuses.size} users with guild bonuses...\n`)

  for (const [userAddress, userBonus] of userBonuses) {
    if (userBonus.totalBonus === 0n) {
      console.log(`⏭️  ${userAddress}: No bonus (0 points contributed)`)
      continue
    }

    console.log(`\n👤 ${userAddress}`)
    console.log(`   Total Bonus: ${userBonus.totalBonus}`)
    console.log(`   Guilds:`)

    for (const guild of userBonus.guilds) {
      console.log(`     - ${guild.guildName} (#${guild.guildId})`)
      console.log(`       Role: ${guild.role} (${guild.multiplier}x)`)
      console.log(`       Contributed: ${guild.pointsContributed}`)
      console.log(`       Bonus: ${guild.bonus}`)
    }

    if (dryRun) {
      console.log(`   🔍 DRY RUN: Would deposit ${userBonus.totalBonus} guild points`)
      successCount++
      totalBonus += userBonus.totalBonus
      continue
    }

    try {
      const hash = await client!.writeContract({
        address: SCORING_ADDRESS,
        abi,
        functionName: 'addGuildPoints',
        args: [userAddress as `0x${string}`, userBonus.totalBonus],
      })

      console.log(`   ✅ Deposited ${userBonus.totalBonus} points`)
      console.log(`   📝 TX: ${hash}`)

      // Log to audit table (guild_deposits)
      const { error: insertError } = await supabase.from('guild_deposits').insert({
        user_address: userAddress,
        guild_bonus: userBonus.totalBonus.toString(),
        guilds: userBonus.guilds.map((g) => ({
          id: g.guildId,
          name: g.guildName,
          role: g.role,
          contributed: g.pointsContributed.toString(),
          bonus: g.bonus.toString(),
        })),
        tx_hash: hash,
        deposited_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error(`   ⚠️  Failed to log to guild_deposits:`, insertError.message)
      }

      successCount++
      totalBonus += userBonus.totalBonus
    } catch (err: any) {
      console.error(`   ❌ Deposit failed:`, err.message)
    }
  }

  console.log('\n' + '─'.repeat(60))
  console.log(`✅ ${successCount}/${userBonuses.size} users processed`)
  console.log(`📊 Total guild bonus: ${totalBonus}`)
  console.log('─'.repeat(60))
}

// ==========================================
// Main
// ==========================================

async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  console.log('🏰 Guild Points Oracle Deposit')
  console.log(isDryRun ? 'Mode: DRY RUN (simulation only)' : 'Mode: LIVE DEPOSIT')
  console.log('Chain: Base')
  console.log('ScoringModule:', SCORING_ADDRESS)
  console.log('─'.repeat(60))

  try {
    console.log('📊 Fetching guild members from Subsquid...')
    const guilds = await fetchAllGuildMembers()
    console.log(`Found ${guilds.length} guilds`)

    const userBonuses = calculateGuildBonuses(guilds)
    console.log(`Calculated bonuses for ${userBonuses.size} users`)

    // Filter users with bonus > 0
    const filteredBonuses = new Map(
      Array.from(userBonuses).filter(([_, bonus]) => bonus.totalBonus > 0n)
    )

    if (filteredBonuses.size === 0) {
      console.log('\n✅ No guild bonuses to deposit')
      return
    }

    await depositGuildPoints(filteredBonuses, isDryRun)

    if (isDryRun) {
      console.log('\n💡 Run without --dry-run to execute live deposits')
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

main()
