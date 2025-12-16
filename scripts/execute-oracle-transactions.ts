#!/usr/bin/env tsx
/**
 * Complete Oracle Transaction Script
 * 
 * Executes all possible transactions using oracle address to verify:
 * - Contract functionality
 * - Subsquid indexing
 * - Database integrity
 * - Missing table detection
 * 
 * Uses latest deployment: Dec 9, 2025
 * Deployment block: 39,270,005
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { ethers } from 'ethers'
import fs from 'fs'

// Load environment
config({ path: resolve(process.cwd(), '.env.local') })

// Contract addresses (Dec 9, 2025 deployment)
const CONTRACTS = {
  CORE: process.env.NEXT_PUBLIC_GM_BASE_CORE!,
  GUILD: process.env.NEXT_PUBLIC_GM_BASE_GUILD!,
  BADGE: process.env.NEXT_PUBLIC_GM_BASE_BADGE!,
  REFERRAL: process.env.NEXT_PUBLIC_GM_BASE_REFERRAL!,
  NFT: process.env.NEXT_PUBLIC_GM_BASE_NFT!,
}

const ORACLE_KEY = process.env.ORACLE_PRIVATE_KEY!
const BASE_RPC = 'https://mainnet.base.org'

// Load ABIs
const coreAbi = JSON.parse(fs.readFileSync('./abi/GmeowCore.abi.json', 'utf8'))
const guildAbi = JSON.parse(fs.readFileSync('./abi/GmeowGuildStandalone.abi.json', 'utf8'))
const badgeAbi = JSON.parse(fs.readFileSync('./abi/GmeowBadge.abi.json', 'utf8'))
const referralAbi = JSON.parse(fs.readFileSync('./abi/GmeowReferralStandalone.abi.json', 'utf8'))
const nftAbi = JSON.parse(fs.readFileSync('./abi/GmeowNFT.abi.json', 'utf8'))

interface TransactionResult {
  name: string
  status: 'success' | 'failed' | 'skipped'
  txHash?: string
  blockNumber?: number
  gasUsed?: string
  error?: string
  data?: any
}

const results: TransactionResult[] = []

async function main() {
  console.log('🚀 Complete Oracle Transaction Script')
  console.log('═'.repeat(80))
  console.log()
  
  // Validate environment
  if (!ORACLE_KEY || !CONTRACTS.CORE) {
    throw new Error('Missing required environment variables')
  }
  
  // Setup
  const provider = new ethers.JsonRpcProvider(BASE_RPC)
  const wallet = new ethers.Wallet(ORACLE_KEY, provider)
  const oracle = wallet.address
  
  console.log('📋 Configuration:')
  console.log(`  Oracle: ${oracle}`)
  console.log(`  Core: ${CONTRACTS.CORE}`)
  console.log(`  Guild: ${CONTRACTS.GUILD}`)
  console.log(`  Badge: ${CONTRACTS.BADGE}`)
  console.log(`  Referral: ${CONTRACTS.REFERRAL}`)
  console.log(`  NFT: ${CONTRACTS.NFT}`)
  console.log()
  
  // Check balance
  const balance = await provider.getBalance(oracle)
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`)
  
  if (balance === 0n) {
    throw new Error('Oracle has no ETH balance')
  }
  
  console.log()
  console.log('═'.repeat(80))
  console.log()
  
  // Create contract instances
  const core = new ethers.Contract(CONTRACTS.CORE, coreAbi, wallet)
  const guild = new ethers.Contract(CONTRACTS.GUILD, guildAbi, wallet)
  const badge = new ethers.Contract(CONTRACTS.BADGE, badgeAbi, wallet)
  const referral = new ethers.Contract(CONTRACTS.REFERRAL, referralAbi, wallet)
  const nft = new ethers.Contract(CONTRACTS.NFT, nftAbi, wallet)
  
  // ============================================================================
  // TEST 1: Send GM (Core Contract)
  // ============================================================================
  
  console.log('📝 Test 1: Send GM')
  console.log('─'.repeat(80))
  
  try {
    // Check cooldown
    const lastGM = await core.lastGMTime(oracle)
    const cooldown = await core.gmCooldown()
    const now = Math.floor(Date.now() / 1000)
    const canGM = now >= Number(lastGM) + Number(cooldown)
    
    console.log(`  Last GM: ${lastGM === 0n ? 'Never' : new Date(Number(lastGM) * 1000).toISOString()}`)
    console.log(`  Cooldown: ${cooldown} seconds (${Number(cooldown) / 3600} hours)`)
    console.log(`  Can GM: ${canGM}`)
    
    if (canGM) {
      console.log('  💸 Sending transaction...')
      
      const tx = await core.sendGM({ gasLimit: 500000 })
      console.log(`  TX: ${tx.hash}`)
      
      const receipt = await tx.wait()
      console.log(`  ✅ Success! Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed}`)
      
      // Check new streak
      const newStreak = await core.gmStreak(oracle)
      const newXP = await core.pointsBalance(oracle)
      console.log(`  New Streak: ${newStreak}`)
      console.log(`  New XP: ${newXP}`)
      
      results.push({
        name: 'Send GM',
        status: 'success',
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        data: { streak: newStreak.toString(), xp: newXP.toString() }
      })
    } else {
      const nextGM = new Date((Number(lastGM) + Number(cooldown)) * 1000)
      console.log(`  ⏸️  Skipped: Cooldown active until ${nextGM.toISOString()}`)
      
      results.push({
        name: 'Send GM',
        status: 'skipped',
        error: 'Cooldown active'
      })
    }
  } catch (error: any) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.push({
      name: 'Send GM',
      status: 'failed',
      error: error.message
    })
  }
  
  console.log()
  console.log('═'.repeat(80))
  console.log()
  
  // ============================================================================
  // TEST 2: Register Referral Code
  // ============================================================================
  
  console.log('📝 Test 2: Register Referral Code')
  console.log('─'.repeat(80))
  
  try {
    const testCode = `ORATEST${Date.now()}`
    console.log(`  Code: ${testCode}`)
    
    // Check if oracle already has a code
    const existingCode = await referral.referralCodeOf(oracle)
    console.log(`  Existing code: ${existingCode || 'None'}`)
    
    if (!existingCode || existingCode === '') {
      console.log('  💸 Sending transaction...')
      
      const tx = await referral.registerReferralCode(testCode, { gasLimit: 300000 })
      console.log(`  TX: ${tx.hash}`)
      
      const receipt = await tx.wait()
      console.log(`  ✅ Success! Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed}`)
      
      // Verify
      const registeredCode = await referral.referralCodeOf(oracle)
      console.log(`  Registered: ${registeredCode}`)
      
      results.push({
        name: 'Register Referral Code',
        status: 'success',
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        data: { code: registeredCode }
      })
    } else {
      console.log(`  ⏸️  Skipped: Oracle already has code "${existingCode}"`)
      
      results.push({
        name: 'Register Referral Code',
        status: 'skipped',
        error: 'Code already registered',
        data: { existingCode }
      })
    }
  } catch (error: any) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.push({
      name: 'Register Referral Code',
      status: 'failed',
      error: error.message
    })
  }
  
  console.log()
  console.log('═'.repeat(80))
  console.log()
  
  // ============================================================================
  // TEST 3: Create Guild
  // ============================================================================
  
  console.log('📝 Test 3: Create Guild')
  console.log('─'.repeat(80))
  
  try {
    // Check if oracle owns a guild
    const guildCount = await guild.guildCount()
    console.log(`  Total guilds: ${guildCount}`)
    
    let ownsGuild = false
    for (let i = 1; i <= Number(guildCount); i++) {
      const guildOwner = await guild.guildOwner(i)
      if (guildOwner.toLowerCase() === oracle.toLowerCase()) {
        console.log(`  Oracle owns Guild #${i}`)
        ownsGuild = true
        break
      }
    }
    
    if (!ownsGuild) {
      console.log('  💸 Creating guild...')
      
      // Guild creation requires deposit
      const minDeposit = await guild.minGuildDeposit()
      console.log(`  Min deposit: ${ethers.formatEther(minDeposit)} ETH`)
      
      const tx = await guild.createGuild(
        'Oracle Test Guild',
        'Testing subsquid indexing',
        { value: minDeposit, gasLimit: 800000 }
      )
      console.log(`  TX: ${tx.hash}`)
      
      const receipt = await tx.wait()
      console.log(`  ✅ Success! Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed}`)
      
      // Get guild ID from events
      const guildId = await guild.guildCount()
      console.log(`  Guild ID: ${guildId}`)
      
      results.push({
        name: 'Create Guild',
        status: 'success',
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        data: { guildId: guildId.toString() }
      })
    } else {
      console.log('  ⏸️  Skipped: Oracle already owns a guild')
      
      results.push({
        name: 'Create Guild',
        status: 'skipped',
        error: 'Already owns guild'
      })
    }
  } catch (error: any) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.push({
      name: 'Create Guild',
      status: 'failed',
      error: error.message
    })
  }
  
  console.log()
  console.log('═'.repeat(80))
  console.log()
  
  // ============================================================================
  // TEST 4: Check Badge Balance
  // ============================================================================
  
  console.log('📝 Test 4: Badge Balance')
  console.log('─'.repeat(80))
  
  try {
    const badgeBalance = await badge.balanceOf(oracle)
    console.log(`  Badge count: ${badgeBalance}`)
    
    results.push({
      name: 'Check Badge Balance',
      status: 'success',
      data: { balance: badgeBalance.toString() }
    })
  } catch (error: any) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.push({
      name: 'Check Badge Balance',
      status: 'failed',
      error: error.message
    })
  }
  
  console.log()
  console.log('═'.repeat(80))
  console.log()
  
  // ============================================================================
  // TEST 5: Check NFT Balance
  // ============================================================================
  
  console.log('📝 Test 5: NFT Balance')
  console.log('─'.repeat(80))
  
  try {
    const nftBalance = await nft.balanceOf(oracle)
    console.log(`  NFT count: ${nftBalance}`)
    
    results.push({
      name: 'Check NFT Balance',
      status: 'success',
      data: { balance: nftBalance.toString() }
    })
  } catch (error: any) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.push({
      name: 'Check NFT Balance',
      status: 'failed',
      error: error.message
    })
  }
  
  console.log()
  console.log('═'.repeat(80))
  console.log('\n📊 Summary\n')
  
  const success = results.filter(r => r.status === 'success').length
  const failed = results.filter(r => r.status === 'failed').length
  const skipped = results.filter(r => r.status === 'skipped').length
  
  console.log(`✅ Success: ${success}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏸️  Skipped: ${skipped}`)
  console.log()
  
  // Print detailed results
  console.log('─'.repeat(80))
  console.log('\n📋 Detailed Results:\n')
  
  results.forEach((result, i) => {
    const icon = result.status === 'success' ? '✅' : result.status === 'failed' ? '❌' : '⏸️'
    console.log(`${icon} ${i + 1}. ${result.name}`)
    
    if (result.txHash) {
      console.log(`   TX: https://basescan.org/tx/${result.txHash}`)
      console.log(`   Block: ${result.blockNumber}`)
      console.log(`   Gas: ${result.gasUsed}`)
    }
    
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
    
    if (result.data) {
      console.log(`   Data: ${JSON.stringify(result.data)}`)
    }
    
    console.log()
  })
  
  // Verification instructions
  console.log('═'.repeat(80))
  console.log('\n🔍 Verification Steps:\n')
  console.log('1. Wait 1-2 minutes for Subsquid to index new blocks')
  console.log('2. Check GraphQL: http://localhost:4350/graphql')
  console.log(`3. Query oracle: ${oracle.toLowerCase()}`)
  console.log()
  console.log('Example query:')
  console.log(`{
  user: userById(id: "${oracle.toLowerCase()}") {
    id
    currentStreak
    lifetimeGMs
    totalXP
    badges { id badgeType }
    guilds { id role guild { id } }
  }
  referralCodes(where: { owner_eq: "${oracle.toLowerCase()}" }) {
    id
    totalUses
    totalRewards
  }
  gmEvents(where: { user_id_eq: "${oracle.toLowerCase()}" }, limit: 5, orderBy: timestamp_DESC) {
    id
    xpAwarded
    streakDay
    timestamp
  }
}`)
  
  console.log('\n✅ Transaction script complete!\n')
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error)
  process.exit(1)
})
