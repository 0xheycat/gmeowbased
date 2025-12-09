/**
 * Test Guild Creation
 * 
 * Tests creating a guild directly with the Guild contract to identify the exact failure point
 */

import { createPublicClient, http, parseAbiItem } from 'viem'
import { base } from 'viem/chains'

const CORE_CONTRACT = '0x9BDD11aA50456572E3Ea5329fcDEb81974137f92'
const GUILD_CONTRACT = '0x967457be45facE07c22c0374dAfBeF7b2f7cd059'
const YOUR_WALLET = '0x8a3094e44577579d6f41F6214a86C250b7dBDC4e'

// ABI for guild functions
const CORE_ABI = [
  parseAbiItem('function pointsBalance(address) view returns (uint256)'),
]

const GUILD_ABI = [
  parseAbiItem('function createGuild(string name) external'),
  parseAbiItem('function guildOf(address) view returns (uint256)'),
  parseAbiItem('function guildCreationCost() view returns (uint256)'),
]

async function main() {
  const client = createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
  })

  console.log('🔍 Testing Guild Creation...\n')
  
  // 1. Check your points balance (on Core contract)
  console.log('1️⃣ Checking points balance (Core contract)...')
  const points = await client.readContract({
    address: CORE_CONTRACT,
    abi: CORE_ABI,
    functionName: 'pointsBalance',
    args: [YOUR_WALLET],
  })
  console.log(`   Points: ${points}`)
  
  // 2. Check guild membership (on Guild contract)
  console.log('\n2️⃣ Checking guild membership (Guild contract)...')
  const guildId = await client.readContract({
    address: GUILD_CONTRACT,
    abi: GUILD_ABI,
    functionName: 'guildOf',
    args: [YOUR_WALLET],
  })
  console.log(`   Current Guild ID: ${guildId}`)
  
  // 3. Check creation cost (on Guild contract)
  console.log('\n3️⃣ Checking creation cost (Guild contract)...')
  const cost = await client.readContract({
    address: GUILD_CONTRACT,
    abi: GUILD_ABI,
    functionName: 'guildCreationCost',
    args: [],
  })
  console.log(`   Cost: ${cost}`)
  
  // 4. Validate
  console.log('\n4️⃣ Validation:')
  console.log(`   ✅ Has enough points: ${points >= cost}`)
  console.log(`   ✅ Not in guild: ${guildId === 0n}`)
  
  if (points >= cost && guildId === 0n) {
    console.log('\n✅ All checks pass! Guild creation should work.')
    console.log('\n📝 To create guild, use your wallet to call:')
    console.log(`   createGuild("YourGuildName")`)
  } else {
    console.log('\n❌ Cannot create guild:')
    if (points < cost) console.log(`   - Insufficient points (need ${cost}, have ${points})`)
    if (guildId !== 0n) console.log(`   - Already in guild ${guildId}`)
  }
  
  // 5. Try to simulate the transaction
  console.log('\n5️⃣ Simulating transaction (Guild contract)...')
  try {
    await client.simulateContract({
      address: GUILD_CONTRACT,
      abi: GUILD_ABI,
      functionName: 'createGuild',
      args: ['TestGuild123'],
      account: YOUR_WALLET,
    })
    console.log('   ✅ Simulation successful!')
  } catch (error: any) {
    console.log('   ❌ Simulation failed!')
    console.log('   Error:', error.message || error)
    
    // Try to extract revert reason
    if (error.data) {
      console.log('   Revert data:', error.data)
    }
  }
}

main().catch(console.error)
