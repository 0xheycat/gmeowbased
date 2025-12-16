#!/usr/bin/env tsx
/**
 * Day 1 Task 4: Compare Subsquid vs Supabase Referral Data
 * 
 * This script:
 * 1. Queries Subsquid GraphQL for referral codes
 * 2. Queries Supabase referral_stats table
 * 3. Compares data accuracy
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const SUBSQUID_GRAPHQL_URL = 'http://localhost:4350/graphql'

interface SubsquidReferralCode {
  id: string
  owner: string
  totalUses: number
  totalRewards: string
  createdAt: string
}

interface SupabaseReferralStat {
  fid: number
  address: string
  total_referrals: number
  successful_referrals: number
  points_earned: number
  created_at: string
}

async function querySubsquid(): Promise<SubsquidReferralCode[]> {
  console.log('📡 Querying Subsquid GraphQL...')
  
  const query = `
    query {
      referralCodes(limit: 100, orderBy: id_ASC) {
        id
        owner
        totalUses
        totalRewards
        createdAt
      }
    }
  `
  
  const response = await fetch(SUBSQUID_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  
  const result = await response.json()
  
  if (result.errors) {
    console.error('❌ GraphQL errors:', result.errors)
    throw new Error('GraphQL query failed')
  }
  
  return result.data.referralCodes
}

async function querySupabase(): Promise<SupabaseReferralStat[]> {
  console.log('🗄️  Querying Supabase referral_stats...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    console.error('URL:', supabaseUrl)
    console.error('Key:', supabaseKey ? '[SET]' : '[MISSING]')
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY required')
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  const { data, error } = await supabase
    .from('referral_stats')
    .select('fid, address, total_referrals, successful_referrals, points_earned, created_at')
    .order('fid', { ascending: true })
  
  if (error) {
    console.error('❌ Supabase error:', error)
    throw error
  }
  
  return data || []
}

function compareData(subsquid: SubsquidReferralCode[], supabase: SupabaseReferralStat[]) {
  console.log('\n📊 Comparison Results\n')
  
  console.log(`Subsquid: ${subsquid.length} referral codes`)
  console.log(`Supabase: ${supabase.length} users with referral stats\n`)
  
  // Create maps for easy lookup - map by wallet address
  const subsquidByOwner = new Map<string, SubsquidReferralCode[]>()
  for (const code of subsquid) {
    const owner = code.owner.toLowerCase()
    if (!subsquidByOwner.has(owner)) {
      subsquidByOwner.set(owner, [])
    }
    subsquidByOwner.get(owner)!.push(code)
  }
  
  const supabaseMap = new Map(supabase.map(s => [s.address?.toLowerCase() || '', s]))
  
  // Check codes in Subsquid
  console.log('🔍 Referral Codes in Subsquid:')
  for (const code of subsquid) {
    const supabaseStat = supabaseMap.get(code.owner.toLowerCase())
    
    console.log(`\n  Code: "${code.id}"`)
    console.log(`    Owner: ${code.owner}`)
    console.log(`    Uses: ${code.totalUses}`)
    console.log(`    Rewards: ${code.totalRewards}`)
    console.log(`    Created: ${new Date(Number(code.createdAt) * 1000).toISOString()}`)
    
    if (supabaseStat) {
      console.log(`    ✅ Owner found in Supabase referral_stats`)
      console.log(`       Supabase Total Referrals: ${supabaseStat.total_referrals}`)
      console.log(`       Supabase Successful: ${supabaseStat.successful_referrals}`)
      console.log(`       Supabase Points: ${supabaseStat.points_earned}`)
      
      // Note: Can't directly compare since Subsquid tracks per-code, Supabase tracks per-user
      if (code.totalUses > 0 && supabaseStat.total_referrals === 0) {
        console.log(`       ⚠️  Mismatch: Code has uses but user has no referrals in Supabase`)
      }
    } else {
      console.log(`    ℹ️  Owner not found in Supabase referral_stats (may not have referred anyone yet)`)
    }
  }
  
  // Check users with referrals in Supabase
  console.log('\n\n🔍 Users with Referrals in Supabase:')
  let supabaseWithReferrals = 0
  for (const stat of supabase) {
    if (stat.total_referrals > 0) {
      supabaseWithReferrals++
      const userCodes = subsquidByOwner.get(stat.address?.toLowerCase() || '')
      
      console.log(`\n  Address: ${stat.address}`)
      console.log(`    Total Referrals: ${stat.total_referrals}`)
      console.log(`    Points Earned: ${stat.points_earned}`)
      
      if (userCodes) {
        console.log(`    ✅ Has ${userCodes.length} referral code(s) in Subsquid`)
        userCodes.forEach(c => {
          console.log(`       Code: "${c.id}" (${c.totalUses} uses, ${c.totalRewards} rewards)`)
        })
      } else {
        console.log(`    ⚠️  No referral codes found in Subsquid`)
      }
    }
  }
  
  if (supabaseWithReferrals === 0) {
    console.log('  ℹ️  No users with referrals found in Supabase')
  }
  
  // Summary
  console.log('\n\n📈 Summary:')
  console.log(`  Subsquid referral codes: ${subsquid.length}`)
  console.log(`  Subsquid unique owners: ${subsquidByOwner.size}`)
  console.log(`  Supabase users with stats: ${supabase.length}`)
  console.log(`  Supabase users with referrals: ${supabaseWithReferrals}`)
  console.log(`\n  ℹ️  Note: Data sources are not directly comparable:`)
  console.log(`     - Subsquid indexes ReferralCodeRegistered events (code creation)`)
  console.log(`     - Supabase tracks referral_stats (actual referral uses)`)
  console.log(`     - Codes can exist without any uses yet`)
}

async function main() {
  console.log('🚀 Day 1 Task 4: Compare Referral Data\n')
  
  try {
    const [subsquidData, supabaseData] = await Promise.all([
      querySubsquid(),
      querySupabase(),
    ])
    
    compareData(subsquidData, supabaseData)
    
    console.log('\n✅ Day 1 Task 4 Complete!')
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main()
