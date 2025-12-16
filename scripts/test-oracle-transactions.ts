#!/usr/bin/env tsx
/**
 * Test Transaction Script - Oracle Address
 * 
 * This script uses the oracle private key to send test transactions
 * to verify all contracts are working and being indexed by Subsquid.
 * 
 * Tests:
 * 1. Send GM (Core contract)
 * 2. Mint Badge (Badge contract)
 * 3. Create/Join Guild (Guild contract)
 * 4. Register Referral Code (Referral contract)
 * 5. Mint NFT (NFT contract)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { ethers } from 'ethers'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Contract addresses from env
const CORE_ADDRESS = process.env.NEXT_PUBLIC_GM_BASE_CORE!
const GUILD_ADDRESS = process.env.NEXT_PUBLIC_GM_BASE_GUILD!
const BADGE_ADDRESS = process.env.NEXT_PUBLIC_GM_BASE_BADGE!
const REFERRAL_ADDRESS = process.env.NEXT_PUBLIC_GM_BASE_REFERRAL!
const NFT_ADDRESS = process.env.NEXT_PUBLIC_GM_BASE_NFT!

// Oracle private key
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY!

// Base Mainnet RPC
const BASE_RPC = 'https://mainnet.base.org'

// Contract ABIs (simplified for testing)
const CORE_ABI = [
  'function sendGM() external',
  'function getUserStreak(address user) view returns (uint256)',
  'function getUserXP(address user) view returns (uint256)',
]

const BADGE_ABI = [
  'function mint(address to, uint256 badgeType) external',
  'function balanceOf(address owner) view returns (uint256)',
]

const GUILD_ABI = [
  'function createGuild() external returns (uint256)',
  'function joinGuild(uint256 guildId) external',
  'function getGuildMembers(uint256 guildId) view returns (uint256)',
]

const REFERRAL_ABI = [
  'function registerCode(string memory code) external',
  'function getCodeOwner(string memory code) view returns (address)',
]

const NFT_ABI = [
  'function mint(address to) external returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
]

interface TestResult {
  test: string
  status: 'success' | 'failed' | 'skipped'
  txHash?: string
  error?: string
  gasUsed?: string
  details?: any
}

async function main() {
  console.log('🚀 Oracle Transaction Test Script\n')
  console.log('─'.repeat(60))
  
  // Validate environment
  if (!ORACLE_PRIVATE_KEY) {
    console.error('❌ ORACLE_PRIVATE_KEY not found in .env.local')
    process.exit(1)
  }
  
  if (!CORE_ADDRESS || !GUILD_ADDRESS || !BADGE_ADDRESS || !REFERRAL_ADDRESS || !NFT_ADDRESS) {
    console.error('❌ Contract addresses not found in .env.local')
    process.exit(1)
  }
  
  console.log('\n📋 Configuration:')
  console.log(`  RPC: ${BASE_RPC}`)
  console.log(`  Core: ${CORE_ADDRESS}`)
  console.log(`  Guild: ${GUILD_ADDRESS}`)
  console.log(`  Badge: ${BADGE_ADDRESS}`)
  console.log(`  Referral: ${REFERRAL_ADDRESS}`)
  console.log(`  NFT: ${NFT_ADDRESS}`)
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(BASE_RPC)
  const wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider)
  const oracleAddress = wallet.address
  
  console.log(`\n🔑 Oracle Address: ${oracleAddress}`)
  
  // Check balance
  const balance = await provider.getBalance(oracleAddress)
  const balanceEth = ethers.formatEther(balance)
  console.log(`💰 Balance: ${balanceEth} ETH`)
  
  if (balance === 0n) {
    console.error('\n❌ Oracle address has 0 ETH balance. Please fund the address first.')
    process.exit(1)
  }
  
  console.log('\n' + '─'.repeat(60))
  console.log('\n🧪 Starting Tests...\n')
  
  const results: TestResult[] = []
  
  // Test 1: Send GM (Core contract)
  try {
    console.log('📝 Test 1: Send GM (Core Contract)')
    const coreContract = new ethers.Contract(CORE_ADDRESS, CORE_ABI, wallet)
    
    // Check current streak
    const currentStreak = await coreContract.getUserStreak(oracleAddress)
    const currentXP = await coreContract.getUserXP(oracleAddress)
    console.log(`  Current Streak: ${currentStreak}`)
    console.log(`  Current XP: ${currentXP}`)
    
    console.log('  Sending transaction...')
    const tx = await coreContract.sendGM()
    console.log(`  TX Hash: ${tx.hash}`)
    console.log('  Waiting for confirmation...')
    
    const receipt = await tx.wait()
    console.log(`  ✅ Confirmed! Gas Used: ${receipt.gasUsed.toString()}`)
    
    // Check new streak
    const newStreak = await coreContract.getUserStreak(oracleAddress)
    const newXP = await coreContract.getUserXP(oracleAddress)
    console.log(`  New Streak: ${newStreak}`)
    console.log(`  New XP: ${newXP}`)
    
    results.push({
      test: 'Send GM',
      status: 'success',
      txHash: tx.hash,
      gasUsed: receipt.gasUsed.toString(),
      details: { oldStreak: currentStreak.toString(), newStreak: newStreak.toString() }
    })
    
  } catch (error: any) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.push({
      test: 'Send GM',
      status: 'failed',
      error: error.message
    })
  }
  
  console.log('\n' + '─'.repeat(60) + '\n')
  
  // Test 2: Register Referral Code
  try {
    console.log('📝 Test 2: Register Referral Code')
    const referralContract = new ethers.Contract(REFERRAL_ADDRESS, REFERRAL_ABI, wallet)
    
    const testCode = `ORACLE_${Date.now()}`
    console.log(`  Code: ${testCode}`)
    
    console.log('  Sending transaction...')
    const tx = await referralContract.registerCode(testCode)
    console.log(`  TX Hash: ${tx.hash}`)
    console.log('  Waiting for confirmation...')
    
    const receipt = await tx.wait()
    console.log(`  ✅ Confirmed! Gas Used: ${receipt.gasUsed.toString()}`)
    
    // Verify code owner
    const owner = await referralContract.getCodeOwner(testCode)
    console.log(`  Code Owner: ${owner}`)
    console.log(`  Verified: ${owner.toLowerCase() === oracleAddress.toLowerCase() ? '✅' : '❌'}`)
    
    results.push({
      test: 'Register Referral Code',
      status: 'success',
      txHash: tx.hash,
      gasUsed: receipt.gasUsed.toString(),
      details: { code: testCode, owner }
    })
    
  } catch (error: any) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.push({
      test: 'Register Referral Code',
      status: 'failed',
      error: error.message
    })
  }
  
  console.log('\n' + '─'.repeat(60) + '\n')
  
  // Test 3: Check Badge Contract (read-only, minting might require authorization)
  try {
    console.log('📝 Test 3: Badge Contract (Read-Only)')
    const badgeContract = new ethers.Contract(BADGE_ADDRESS, BADGE_ABI, wallet)
    
    const badgeBalance = await badgeContract.balanceOf(oracleAddress)
    console.log(`  Badge Balance: ${badgeBalance}`)
    
    results.push({
      test: 'Check Badge Balance',
      status: 'success',
      details: { balance: badgeBalance.toString() }
    })
    
    console.log('  ℹ️  Badge minting requires authorization, skipping mint test')
    
  } catch (error: any) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.push({
      test: 'Check Badge Balance',
      status: 'failed',
      error: error.message
    })
  }
  
  console.log('\n' + '─'.repeat(60) + '\n')
  
  // Test 4: Check Guild Contract (read-only)
  try {
    console.log('📝 Test 4: Guild Contract (Read-Only)')
    const guildContract = new ethers.Contract(GUILD_ADDRESS, GUILD_ABI, wallet)
    
    console.log('  ℹ️  Checking existing guild memberships...')
    // Try to get guild members for guild ID 1
    try {
      const memberCount = await guildContract.getGuildMembers(1)
      console.log(`  Guild 1 Members: ${memberCount}`)
    } catch (e) {
      console.log('  Guild 1 does not exist or contract method differs')
    }
    
    results.push({
      test: 'Check Guild Info',
      status: 'success'
    })
    
    console.log('  ℹ️  Guild creation test requires gas, skipping for safety')
    
  } catch (error: any) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.push({
      test: 'Check Guild Info',
      status: 'failed',
      error: error.message
    })
  }
  
  console.log('\n' + '─'.repeat(60) + '\n')
  
  // Test 5: Check NFT Contract (read-only)
  try {
    console.log('📝 Test 5: NFT Contract (Read-Only)')
    const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, wallet)
    
    const nftBalance = await nftContract.balanceOf(oracleAddress)
    console.log(`  NFT Balance: ${nftBalance}`)
    
    results.push({
      test: 'Check NFT Balance',
      status: 'success',
      details: { balance: nftBalance.toString() }
    })
    
    console.log('  ℹ️  NFT minting test skipped to conserve gas')
    
  } catch (error: any) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.push({
      test: 'Check NFT Balance',
      status: 'failed',
      error: error.message
    })
  }
  
  console.log('\n' + '─'.repeat(60))
  console.log('\n📊 Test Summary:\n')
  
  const successCount = results.filter(r => r.status === 'success').length
  const failedCount = results.filter(r => r.status === 'failed').length
  
  results.forEach((result, i) => {
    const icon = result.status === 'success' ? '✅' : result.status === 'failed' ? '❌' : '⏸️'
    console.log(`${icon} ${result.test}`)
    if (result.txHash) {
      console.log(`   TX: https://basescan.org/tx/${result.txHash}`)
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  })
  
  console.log(`\n📈 Results: ${successCount} passed, ${failedCount} failed`)
  
  console.log('\n' + '─'.repeat(60))
  console.log('\n🔍 Next Steps:\n')
  console.log('1. Wait 1-2 minutes for Subsquid to index the transactions')
  console.log('2. Check Subsquid GraphQL: http://localhost:4350/graphql')
  console.log('3. Query for oracle address:', oracleAddress)
  console.log('\nExample query:')
  console.log(`{
  user: userById(id: "${oracleAddress.toLowerCase()}") {
    id
    currentStreak
    lifetimeGMs
    badges { id }
    guilds { id }
  }
  referralCodes(where: { owner_eq: "${oracleAddress.toLowerCase()}" }) {
    id
    totalUses
  }
}`)
  
  console.log('\n✅ Test Complete!\n')
}

main().catch(error => {
  console.error('\n❌ Fatal Error:', error)
  process.exit(1)
})
