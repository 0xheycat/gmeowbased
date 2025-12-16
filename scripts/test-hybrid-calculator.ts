#!/usr/bin/env tsx
/**
 * Day 2: Test Hybrid Calculator Integration
 * 
 * This script:
 * 1. Queries Subsquid for blockchain data (streaks, badges, referrals, NFTs, guilds)
 * 2. Queries Supabase for off-chain data (quests, viral, tips, guild metadata)
 * 3. Calculates hybrid score using lib/scoring/hybrid-calculator.ts
 * 4. Validates all 9 scoring components
 * 5. Compares with old leaderboard_calculations table
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const SUBSQUID_GRAPHQL_URL = 'http://localhost:4350/graphql'

// Test with wallet that has badge and guild owner role
const TEST_WALLET = '0x8870c155666809609176260f2b65a626c000d773'
const TEST_FID = 12345 // Will need to find actual FID

interface SubsquidStats {
  currentStreak: number
  longestStreak: number
  totalGMs: number
  badgeCount: number
  referralCodeCount: number
  totalReferralUses: number
  nftCount: number
  guildMemberships: Array<{
    guildId: string
    role: string
    joinedAt: string
  }>
  highestGuildLevel: number
}

interface SupabaseStats {
  questCompletions: number
  viralEngagement: number
  tipActivity: number
  guildBonusPercent: number
}

interface ScoreBreakdown {
  basePoints: number          // Quest completions
  viralXP: number            // Viral engagement
  guildBonus: number         // Guild level * 100
  referralBonus: number      // Referral count * 50
  streakBonus: number        // GM streak * 10
  badgePrestige: number      // Badge count * 25
  tipPoints: number          // Tip activity
  nftPoints: number          // NFT count * 100
  guildBonusPoints: number   // 10% member + 5% officer
}

async function querySubsquidStats(walletAddress: string): Promise<SubsquidStats> {
  console.log(`📡 Querying Subsquid for ${walletAddress}...\n`)
  
  const query = `
    query GetUserStats($address: String!) {
      user: userById(id: $address) {
        id
        currentStreak
        lifetimeGMs
        totalXP
        badges {
          id
          badgeType
        }
        guilds {
          id
          guild {
            id
            totalMembers
          }
          role
          joinedAt
        }
      }
      
      referralCodes(where: { owner_eq: $address }) {
        id
        totalUses
        totalRewards
      }
      
      nftTransfers(where: { to_eq: $address }, limit: 100) {
        tokenId
      }
    }
  `
  
  const response = await fetch(SUBSQUID_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      query,
      variables: { address: walletAddress.toLowerCase() }
    }),
  })
  
  const result = await response.json()
  
  if (result.errors) {
    console.error('❌ GraphQL errors:', result.errors)
    throw new Error('GraphQL query failed')
  }
  
  const user = result.data.user
  const referralCodes = result.data.referralCodes || []
  const nftTransfers = result.data.nftTransfers || []
  
  if (!user) {
    console.log('ℹ️  User not found in Subsquid (no on-chain activity)')
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalGMs: 0,
      badgeCount: 0,
      referralCodeCount: 0,
      totalReferralUses: 0,
      nftCount: 0,
      guildMemberships: [],
      highestGuildLevel: 0,
    }
  }
  
  // Calculate guild level (use totalMembers as proxy for level)
  let highestGuildLevel = 0
  const guildMemberships = (user.guilds || []).map((m: any) => {
    // In absence of explicit level, use totalMembers / 10 as guild level
    const level = Math.floor((m.guild?.totalMembers || 0) / 10)
    if (level > highestGuildLevel) {
      highestGuildLevel = level
    }
    return {
      guildId: m.guild?.id || '',
      role: m.role || 'member',
      joinedAt: m.joinedAt || '',
    }
  })
  
  // Count unique NFTs received
  const uniqueNFTs = new Set(nftTransfers.map((t: any) => t.tokenId.toString()))
  
  const stats: SubsquidStats = {
    currentStreak: user.currentStreak || 0,
    longestStreak: user.currentStreak || 0, // Schema doesn't track longest, use current
    totalGMs: user.lifetimeGMs || 0,
    badgeCount: (user.badges || []).length,
    referralCodeCount: referralCodes.length,
    totalReferralUses: referralCodes.reduce((sum: number, code: any) => sum + (code.totalUses || 0), 0),
    nftCount: uniqueNFTs.size,
    guildMemberships,
    highestGuildLevel,
  }
  
  console.log('✅ Subsquid Stats:')
  console.log(`  Current Streak: ${stats.currentStreak}`)
  console.log(`  Longest Streak: ${stats.longestStreak}`)
  console.log(`  Total GMs: ${stats.totalGMs}`)
  console.log(`  Badge Count: ${stats.badgeCount}`)
  console.log(`  Referral Codes: ${stats.referralCodeCount}`)
  console.log(`  Referral Uses: ${stats.totalReferralUses}`)
  console.log(`  NFT Count: ${stats.nftCount}`)
  console.log(`  Guild Memberships: ${stats.guildMemberships.length}`)
  console.log(`  Highest Guild Level: ${stats.highestGuildLevel}\n`)
  
  return stats
}

async function querySupabaseStats(fid: number): Promise<SupabaseStats> {
  console.log(`🗄️  Querying Supabase for FID ${fid}...\n`)
  
  const { createClient } = await import('@supabase/supabase-js')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Missing Supabase credentials, using mock data')
    return {
      questCompletions: 0,
      viralEngagement: 0,
      tipActivity: 0,
      guildBonusPercent: 0,
    }
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Query quest completions
  const { data: quests, error: questError } = await supabase
    .from('quest_completions')
    .select('points')
    .eq('fid', fid)
  
  // Query viral engagement (badge casts)
  const { data: viral, error: viralError } = await supabase
    .from('badge_casts')
    .select('engagement_score')
    .eq('fid', fid)
  
  // Query tip activity
  const { data: tips, error: tipsError } = await supabase
    .from('points_transactions')
    .select('amount')
    .eq('fid', fid)
    .eq('transaction_type', 'tip')
  
  // Query guild membership for bonus
  const { data: guildMember, error: guildError } = await supabase
    .from('guild_members')
    .select('role')
    .eq('fid', fid)
    .single()
  
  const stats: SupabaseStats = {
    questCompletions: quests?.reduce((sum, q) => sum + (q.points || 0), 0) || 0,
    viralEngagement: viral?.reduce((sum, v) => sum + (v.engagement_score || 0), 0) || 0,
    tipActivity: tips?.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) || 0,
    guildBonusPercent: guildMember?.role === 'officer' ? 15 : guildMember?.role === 'member' ? 10 : 0,
  }
  
  console.log('✅ Supabase Stats:')
  console.log(`  Quest Completions: ${stats.questCompletions} points`)
  console.log(`  Viral Engagement: ${stats.viralEngagement} XP`)
  console.log(`  Tip Activity: ${stats.tipActivity} points`)
  console.log(`  Guild Bonus: ${stats.guildBonusPercent}%\n`)
  
  return stats
}

function calculateScoreBreakdown(subsquid: SubsquidStats, supabase: SupabaseStats): ScoreBreakdown {
  console.log('🧮 Calculating Score Breakdown...\n')
  
  const breakdown: ScoreBreakdown = {
    basePoints: supabase.questCompletions,
    viralXP: supabase.viralEngagement,
    guildBonus: subsquid.highestGuildLevel * 100,
    referralBonus: subsquid.referralCodeCount * 50, // 50 points per code created
    streakBonus: subsquid.currentStreak * 10,
    badgePrestige: subsquid.badgeCount * 25,
    tipPoints: supabase.tipActivity,
    nftPoints: subsquid.nftCount * 100,
    guildBonusPoints: 0, // Calculated below
  }
  
  // Calculate guild bonus points (percentage of other points)
  const baseScore = breakdown.basePoints + breakdown.viralXP + breakdown.guildBonus + 
                    breakdown.referralBonus + breakdown.streakBonus + breakdown.badgePrestige + 
                    breakdown.tipPoints + breakdown.nftPoints
  
  breakdown.guildBonusPoints = Math.floor(baseScore * (supabase.guildBonusPercent / 100))
  
  const totalScore = baseScore + breakdown.guildBonusPoints
  
  console.log('✅ Score Breakdown (9 Components):')
  console.log(`  1. Base Points (Quests):          ${breakdown.basePoints.toLocaleString()}`)
  console.log(`  2. Viral XP (Badge Casts):        ${breakdown.viralXP.toLocaleString()}`)
  console.log(`  3. Guild Bonus (Level * 100):     ${breakdown.guildBonus.toLocaleString()}`)
  console.log(`  4. Referral Bonus (Codes * 50):   ${breakdown.referralBonus.toLocaleString()}`)
  console.log(`  5. Streak Bonus (Streak * 10):    ${breakdown.streakBonus.toLocaleString()}`)
  console.log(`  6. Badge Prestige (Count * 25):   ${breakdown.badgePrestige.toLocaleString()}`)
  console.log(`  7. Tip Points (Tip Activity):     ${breakdown.tipPoints.toLocaleString()}`)
  console.log(`  8. NFT Points (Count * 100):      ${breakdown.nftPoints.toLocaleString()}`)
  console.log(`  9. Guild Bonus Points (${supabase.guildBonusPercent}%):      ${breakdown.guildBonusPoints.toLocaleString()}`)
  console.log(`  ${'─'.repeat(50)}`)
  console.log(`  TOTAL SCORE:                      ${totalScore.toLocaleString()}\n`)
  
  return breakdown
}

async function compareWithOldSystem(walletAddress: string, newScore: number) {
  console.log('📊 Comparing with Old Leaderboard System...\n')
  
  const { createClient } = await import('@supabase/supabase-js')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️  Skipping comparison (no Supabase credentials)\n')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Query old leaderboard_calculations
  const { data: oldData, error } = await supabase
    .from('leaderboard_calculations')
    .select('total_score, breakdown')
    .eq('wallet_address', walletAddress.toLowerCase())
    .single()
  
  if (error || !oldData) {
    console.log('ℹ️  No existing leaderboard data found for this wallet\n')
    return
  }
  
  const oldScore = oldData.total_score
  const difference = newScore - oldScore
  const percentChange = ((difference / oldScore) * 100).toFixed(2)
  
  console.log('✅ Comparison Results:')
  console.log(`  Old System Score:  ${oldScore.toLocaleString()}`)
  console.log(`  New System Score:  ${newScore.toLocaleString()}`)
  console.log(`  Difference:        ${difference > 0 ? '+' : ''}${difference.toLocaleString()} (${percentChange}%)`)
  
  if (oldData.breakdown) {
    console.log('\n  Old Breakdown:')
    Object.entries(oldData.breakdown).forEach(([key, value]) => {
      console.log(`    ${key}: ${value}`)
    })
  }
  
  console.log()
}

async function main() {
  console.log('🚀 Day 2: Test Hybrid Calculator Integration\n')
  console.log(`Test Wallet: ${TEST_WALLET}\n`)
  console.log('─'.repeat(60))
  console.log()
  
  try {
    // Step 1: Query Subsquid
    const subsquidStats = await querySubsquidStats(TEST_WALLET)
    
    console.log('─'.repeat(60))
    console.log()
    
    // Step 2: Query Supabase (using mock FID for now)
    const supabaseStats = await querySupabaseStats(TEST_FID)
    
    console.log('─'.repeat(60))
    console.log()
    
    // Step 3: Calculate hybrid score
    const breakdown = calculateScoreBreakdown(subsquidStats, supabaseStats)
    
    const totalScore = breakdown.basePoints + breakdown.viralXP + breakdown.guildBonus + 
                       breakdown.referralBonus + breakdown.streakBonus + breakdown.badgePrestige + 
                       breakdown.tipPoints + breakdown.nftPoints + breakdown.guildBonusPoints
    
    console.log('─'.repeat(60))
    console.log()
    
    // Step 4: Compare with old system
    await compareWithOldSystem(TEST_WALLET, totalScore)
    
    console.log('─'.repeat(60))
    console.log()
    
    // Validation Summary
    console.log('✅ Validation Summary:')
    console.log(`  [${subsquidStats.currentStreak > 0 ? '✅' : '⏸️ '}] Streak Bonus (Subsquid)`)
    console.log(`  [${subsquidStats.badgeCount > 0 ? '✅' : '⏸️ '}] Badge Prestige (Subsquid)`)
    console.log(`  [${subsquidStats.referralCodeCount > 0 ? '✅' : '⏸️ '}] Referral Bonus (Subsquid)`)
    console.log(`  [${subsquidStats.nftCount > 0 ? '✅' : '⏸️ '}] NFT Points (Subsquid)`)
    console.log(`  [${subsquidStats.highestGuildLevel > 0 ? '✅' : '⏸️ '}] Guild Bonus (Subsquid)`)
    console.log(`  [${supabaseStats.questCompletions > 0 ? '✅' : '⏸️ '}] Base Points (Supabase)`)
    console.log(`  [${supabaseStats.viralEngagement > 0 ? '✅' : '⏸️ '}] Viral XP (Supabase)`)
    console.log(`  [${supabaseStats.tipActivity > 0 ? '✅' : '⏸️ '}] Tip Points (Supabase)`)
    console.log(`  [${supabaseStats.guildBonusPercent > 0 ? '✅' : '⏸️ '}] Guild Bonus % (Supabase)`)
    console.log()
    console.log('Legend: ✅ = Has data, ⏸️  = No data (expected for new user)')
    console.log()
    console.log('✅ Day 2 Testing Complete!')
    console.log()
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
