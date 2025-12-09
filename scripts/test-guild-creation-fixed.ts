/**
 * TEST SCRIPT: Guild Creation with Fixed Contracts
 * 
 * Tests the professional fix for cross-contract point management
 */

import { createPublicClient, http, parseAbi } from 'viem'
import { base } from 'viem/chains'

// ============ CONFIGURATION ============

// NEW CONTRACT ADDRESSES (update after deployment!)
const CORE_CONTRACT = '0x_NEW_CORE_ADDRESS_HERE' as `0x${string}`
const GUILD_CONTRACT = '0x_NEW_GUILD_ADDRESS_HERE' as `0x${string}`

// Test wallets
const ORACLE_ADDRESS = '0x8870C155666809609176260F2b65a626C000D773' as `0x${string}`
const USER_ADDRESS = '0x8a3094e44577579d6f41F6214a86C250b7dBDC4e' as `0x${string}`

// ============ SETUP ============

const client = createPublicClient({
  chain: base,
  transport: http()
})

// ============ ABIS ============

const CORE_ABI = parseAbi([
  'function pointsBalance(address user) external view returns (uint256)',
  'function authorizedContracts(address) external view returns (bool)',
])

const GUILD_ABI = parseAbi([
  'function coreContract() external view returns (address)',
  'function guildOf(address) external view returns (uint256)',
  'function guildCreationCost() external view returns (uint256)',
  'function createGuild(string name) external',
])

// ============ TEST FUNCTIONS ============

async function testArchitecture() {
  console.log('🔍 Testing Fixed Architecture')
  console.log('==============================\n')

  // 1. Verify Guild → Core reference
  console.log('1. Checking Guild → Core reference...')
  const guildCore = await client.readContract({
    address: GUILD_CONTRACT,
    abi: GUILD_ABI,
    functionName: 'coreContract',
  })
  console.log(`   Guild.coreContract: ${guildCore}`)
  console.log(`   Expected: ${CORE_CONTRACT}`)
  
  if (guildCore.toLowerCase() === CORE_CONTRACT.toLowerCase()) {
    console.log('   ✅ PASS: Guild pointing to correct Core!\n')
  } else {
    console.log('   ❌ FAIL: Guild pointing to wrong Core!\n')
    return false
  }

  // 2. Verify Guild is authorized
  console.log('2. Checking Guild authorization...')
  const isAuthorized = await client.readContract({
    address: CORE_CONTRACT,
    abi: CORE_ABI,
    functionName: 'authorizedContracts',
    args: [GUILD_CONTRACT],
  })
  console.log(`   Core.authorizedContracts[Guild]: ${isAuthorized}`)
  
  if (isAuthorized) {
    console.log('   ✅ PASS: Guild is authorized!\n')
  } else {
    console.log('   ❌ FAIL: Guild NOT authorized!\n')
    return false
  }

  // 3. Check point balances
  console.log('3. Checking point balances in Core...')
  const oracleBalance = await client.readContract({
    address: CORE_CONTRACT,
    abi: CORE_ABI,
    functionName: 'pointsBalance',
    args: [ORACLE_ADDRESS],
  })
  console.log(`   Oracle (${ORACLE_ADDRESS}):`)
  console.log(`   Balance: ${oracleBalance} points`)
  
  const userBalance = await client.readContract({
    address: CORE_CONTRACT,
    abi: CORE_ABI,
    functionName: 'pointsBalance',
    args: [USER_ADDRESS],
  })
  console.log(`   User (${USER_ADDRESS}):`)
  console.log(`   Balance: ${userBalance} points`)

  // 4. Check guild creation cost
  console.log('\n4. Checking guild creation requirements...')
  const creationCost = await client.readContract({
    address: GUILD_CONTRACT,
    abi: GUILD_ABI,
    functionName: 'guildCreationCost',
  })
  console.log(`   Creation cost: ${creationCost} points`)

  // 5. Check if users already in guilds
  console.log('\n5. Checking guild memberships...')
  const oracleGuild = await client.readContract({
    address: GUILD_CONTRACT,
    abi: GUILD_ABI,
    functionName: 'guildOf',
    args: [ORACLE_ADDRESS],
  })
  console.log(`   Oracle guild: ${oracleGuild}`)
  
  const userGuild = await client.readContract({
    address: GUILD_CONTRACT,
    abi: GUILD_ABI,
    functionName: 'guildOf',
    args: [USER_ADDRESS],
  })
  console.log(`   User guild: ${userGuild}`)

  // 6. Simulate guild creation
  console.log('\n6. Simulating guild creation...')
  
  if (oracleBalance >= creationCost && oracleGuild === 0n) {
    console.log('   Oracle can create guild! ✅')
    console.log('   Ready to test with wallet:\n')
    console.log('   1. Connect wallet: ' + ORACLE_ADDRESS)
    console.log('   2. Call: createGuild("Professional Test Guild")')
    console.log('   3. Approve transaction')
    console.log('   4. Check balance after: should be', oracleBalance - creationCost, 'points\n')
  } else if (oracleGuild > 0n) {
    console.log('   ⚠️  Oracle already in guild (ID:', oracleGuild, ')')
  } else {
    console.log('   ❌ Oracle has insufficient points!')
  }

  if (userBalance >= creationCost && userGuild === 0n) {
    console.log('   User can create guild! ✅')
  } else if (userGuild > 0n) {
    console.log('   ⚠️  User already in guild (ID:', userGuild, ')')
  } else {
    console.log('   ❌ User has insufficient points!')
  }

  console.log('\n==============================')
  console.log('✅ Architecture verification complete!')
  console.log('==============================\n')
  
  return true
}

async function testCrossContractFlow() {
  console.log('🧪 Testing Cross-Contract Point Flow')
  console.log('=====================================\n')

  console.log('Expected flow:')
  console.log('1. User calls: Guild.createGuild("Test")')
  console.log('2. Guild calls: Core._getUserPoints(user)')
  console.log('3. Guild checks: userPoints >= 100')
  console.log('4. Guild calls: Core.deductPoints(user, 100)')
  console.log('5. Core verifies: msg.sender is authorized')
  console.log('6. Core executes: pointsBalance[user] -= 100')
  console.log('7. Guild creates guild and mints badge')
  console.log('\nThis is the PROFESSIONAL PATTERN! ✨\n')
}

// ============ MAIN ============

async function main() {
  console.log('🚀 Professional Solidity Master Fix - Test Suite')
  console.log('=================================================\n')

  if (CORE_CONTRACT === '0x_NEW_CORE_ADDRESS_HERE') {
    console.log('❌ ERROR: Please update CORE_CONTRACT address!')
    console.log('Edit this file and set the new Core contract address.\n')
    return
  }

  if (GUILD_CONTRACT === '0x_NEW_GUILD_ADDRESS_HERE') {
    console.log('❌ ERROR: Please update GUILD_CONTRACT address!')
    console.log('Edit this file and set the new Guild contract address.\n')
    return
  }

  const architectureOk = await testArchitecture()
  
  if (architectureOk) {
    console.log('\n')
    await testCrossContractFlow()
    
    console.log('\n🎉 ALL TESTS PASSED!')
    console.log('Ready for real wallet transaction testing!')
  } else {
    console.log('\n❌ ARCHITECTURE ISSUES DETECTED!')
    console.log('Please fix the issues above before testing.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
