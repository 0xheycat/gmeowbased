/**
 * Rewards Claim API
 * 
 * Gaming Platform Pattern: Pending Rewards System
 * 
 * FLOW:
 * 1. User sees pending_rewards in profile
 * 2. Clicks "Claim Rewards" button
 * 3. Signs message with wallet
 * 4. Backend verifies signature
 * 5. Oracle wallet deposits points to contract
 * 6. pending_rewards → spendable balance
 * 
 * SECURITY:
 * - Signature verification (user owns wallet)
 * - Cooldown: 24 hours between claims
 * - Minimum claim: 100 points
 * - Rate limiting: 3 claims/week max
 * 
 * Created: December 19, 2025
 * Reference: GAMING-PLATFORM-PATTERN.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/edge'
import { getSubsquidClient, getGuildMembershipByAddress, getReferralCodeByOwner, getBadgeStakesByAddress } from '@/lib/subsquid-client'
import { verifyMessage, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { getPublicClient } from '@/lib/contracts/rpc-client-pool'

// Configuration
const MIN_CLAIM_AMOUNT = 100
const COOLDOWN_HOURS = 24
const MAX_CLAIMS_PER_WEEK = 3

// Contract configuration
const GMEOW_CORE_ADDRESS = (process.env.NEXT_PUBLIC_GM_BASE_CORE || '0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73') as `0x${string}`
const ORACLE_WALLET_ADDRESS = '0x8870C155666809609176260F2B65a626C000D773' as `0x${string}`
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY as `0x${string}`

const GMEOW_CORE_ABI = [
  {
    name: 'depositFor',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

/**
 * Calculate pending rewards for an address
 * Same logic as leaderboard-service.ts but isolated for claim
 */
async function calculatePendingRewards(address: string): Promise<{
  viralPoints: number
  guild_bonus: number
  referral_bonus: number
  streak_bonus: number
  badge_prestige: number
  total: number
}> {
  const supabase = createClient()
  const client = getSubsquidClient()
  
  // Layer 1: Subsquid on-chain data
  const usersQuery = `
    query GetUser($address: String!) {
      users(where: { id_eq: $address }) {
        id
        currentStreak
      }
    }
  `
  
  const userData = await (client as any).query(usersQuery, { address: address.toLowerCase() }) as any
  const user = userData?.data?.users?.[0]
  
  if (!user) {
    return { viralPoints: 0, guild_bonus: 0, referral_bonus: 0, streak_bonus: 0, badge_prestige: 0, total: 0 }
  }
  
  // Layer 2: Supabase off-chain metadata
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('xp')
    .eq('wallet_address', address.toLowerCase())
    .single()
  
  const viralBonus = (profile as any)?.xp || 0
  
  // Guild bonus
  let guildBonus = 0
  const guildMembership = await getGuildMembershipByAddress(address)
  if (guildMembership) {
    const membership = guildMembership?.[0] as any
    const pointsContributed = parseInt(membership?.pointsContributed || '0')
    const roleMultiplier = membership?.role === 'Owner' ? 2.0
      : membership?.role === 'Officer' ? 1.5
      : 1.0
    guildBonus = Math.floor(pointsContributed * roleMultiplier)
  }
  
  // Referral bonus
  let referralBonus = 0
  const referralCode = await getReferralCodeByOwner(address)
  if (referralCode) {
    const totalRewards = parseInt(referralCode.totalRewards || '0')
    const totalUses = parseInt(referralCode.totalUses || '0')
    referralBonus = totalRewards + (totalUses * 10)
  }
  
  // Streak bonus
  let streakBonus = 0
  const currentStreak = parseInt(user.currentStreak || '0')
  if (currentStreak >= 7 && currentStreak <= 29) {
    streakBonus = currentStreak * 5
  } else if (currentStreak >= 30 && currentStreak <= 89) {
    streakBonus = currentStreak * 10
  } else if (currentStreak >= 90) {
    streakBonus = currentStreak * 20
  }
  
  // Badge prestige
  let badgePrestige = 0
  const badgeStakes = await getBadgeStakesByAddress(address)
  if (badgeStakes && badgeStakes.length > 0) {
    badgePrestige = badgeStakes.reduce((total, stake) => {
      const rewardsEarned = parseInt(stake.rewardsEarned || '0')
      const powerMultiplier = parseFloat(stake.badge?.powerMultiplier || '1.0')
      return total + rewardsEarned + Math.floor(powerMultiplier * 100)
    }, 0)
  }
  
  const total = viralBonus + guildBonus + referralBonus + streakBonus + badgePrestige
  
  return {
    viralPoints: viralBonus,
    guild_bonus: guildBonus,
    referral_bonus: referralBonus,
    streak_bonus: streakBonus,
    badge_prestige: badgePrestige,
    total
  }
}

/**
 * Oracle deposit to contract
 * Deposits pending rewards to user's on-chain balance
 */
async function oracleDeposit(
  userAddress: string, 
  amount: number
): Promise<{ hash: string }> {
  if (!ORACLE_PRIVATE_KEY) {
    throw new Error('ORACLE_PRIVATE_KEY not configured')
  }
  
  const amountBigInt = BigInt(amount)
  
  // Create oracle wallet account
  const oracleAccount = privateKeyToAccount(ORACLE_PRIVATE_KEY)
  
  // Create wallet client
  const walletClient = createWalletClient({
    account: oracleAccount,
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_RPC_BASE),
  })
  
  // Get public client
  const publicClient = getPublicClient(base.id)
  
  // Simulate transaction first
  const { request } = await publicClient.simulateContract({
    address: GMEOW_CORE_ADDRESS,
    abi: GMEOW_CORE_ABI,
    functionName: 'depositFor',
    args: [userAddress as `0x${string}`, amountBigInt],
    account: oracleAccount,
  })
  
  // Execute deposit
  const hash = await walletClient.writeContract(request)
  console.log(`[Oracle Deposit] ${amount} points to ${userAddress}: ${hash}`)
  
  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  
  if (receipt.status !== 'success') {
    throw new Error(`Oracle deposit failed: ${hash}`)
  }
  
  console.log(`[Oracle Deposit] ✓ Confirmed: ${hash}`)
  return { hash }
}
async function canClaim(address: string, pendingAmount: number): Promise<{
  allowed: boolean
  reason?: string
  hoursRemaining?: number
}> {
  const supabase = createClient()
  
  // Check minimum amount
  if (pendingAmount < MIN_CLAIM_AMOUNT) {
    return {
      allowed: false,
      reason: `Minimum claim amount is ${MIN_CLAIM_AMOUNT} points`
    }
  }
  
  // Check last claim time (24h cooldown)
  const { data: lastClaim } = await supabase
    .from('reward_claims')
    .select('claimed_at')
    .eq('wallet_address', address.toLowerCase())
    .order('claimed_at', { ascending: false } as any)
    .limit(1)
    .maybeSingle()
  
  if (lastClaim) {
    const hoursSinceLastClaim = (Date.now() - new Date((lastClaim as any).claimed_at).getTime()) / (1000 * 60 * 60)
    
    if (hoursSinceLastClaim < COOLDOWN_HOURS) {
      return {
        allowed: false,
        reason: 'Cooldown active',
        hoursRemaining: Math.ceil(COOLDOWN_HOURS - hoursSinceLastClaim)
      }
    }
  }
  
  // Check weekly claim limit
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('reward_claims')
    .select('*', { count: 'exact', head: true } as any)
    .eq('wallet_address', address.toLowerCase())
    .gte('claimed_at', oneWeekAgo) as any
  
  if (count && count >= MAX_CLAIMS_PER_WEEK) {
    return {
      allowed: false,
      reason: `Maximum ${MAX_CLAIMS_PER_WEEK} claims per week`
    }
  }
  
  return { allowed: true }
}

/**
 * POST /api/rewards/claim
 * 
 * Claim pending rewards via oracle deposit
 * 
 * Body:
 * {
 *   walletAddress: string
 *   message: string
 *   signature: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress, message, signature } = await request.json()
    
    // Validate inputs
    if (!walletAddress || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, message, signature' },
        { status: 400 }
      )
    }
    
    // Verify signature
    const isValid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }
    
    // Calculate pending rewards
    const pending = await calculatePendingRewards(walletAddress)
    
    // Check if user can claim
    const claimCheck = await canClaim(walletAddress, pending.total)
    if (!claimCheck.allowed) {
      return NextResponse.json(
        { 
          error: claimCheck.reason,
          hoursRemaining: claimCheck.hoursRemaining 
        },
        { status: 403 }
      )
    }
    
    // Oracle deposits to contract
    let txHash: string | null = null
    
    try {
      const depositResult = await oracleDeposit(walletAddress, pending.total)
      txHash = depositResult.hash
    } catch (error) {
      console.error('[Claim] Oracle deposit failed:', error)
      return NextResponse.json(
        { error: 'Failed to deposit rewards on-chain. Please try again.' },
        { status: 500 }
      )
    }
    
    const supabase = createClient()
    
    // Record claim in database
    const { data: claim, error: claimError } = await supabase
      .from('reward_claims')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        viral_bonus_points_claimed: pending.viralPoints,
        guild_bonus_claimed: pending.guild_bonus,
        referral_bonus_claimed: pending.referral_bonus,
        streak_bonus_claimed: pending.streak_bonus,
        badge_prestige_claimed: pending.badge_prestige,
        total_claimed: pending.total,
        tx_hash: txHash,
        oracle_address: ORACLE_WALLET_ADDRESS,
      } as any)
      .select()
      .single() as any
    
    if (claimError) {
      console.error('Error recording claim:', claimError)
      // Don't fail the request - deposit succeeded
      // Just log the error for manual intervention
    }
    
    return NextResponse.json({
      success: true,
      claimed: pending.total,
      breakdown: {
        viralPoints: pending.viralPoints,
        guild_bonus: pending.guild_bonus,
        referral_bonus: pending.referral_bonus,
        streak_bonus: pending.streak_bonus,
        badge_prestige: pending.badge_prestige,
      },
      tx_hash: txHash,
      message: 'Rewards claimed successfully!',
    })
    
  } catch (error) {
    console.error('Claim error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rewards/claim?address=0x...
 * 
 * Get pending rewards and claim status for an address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    
    if (!address) {
      return NextResponse.json(
        { error: 'Missing address parameter' },
        { status: 400 }
      )
    }
    
    // Calculate pending rewards
    const pending = await calculatePendingRewards(address)
    
    // Check claim eligibility
    const claimCheck = await canClaim(address, pending.total)
    
    // Get last claim
    const supabase = createClient()
    const { data: lastClaim } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('wallet_address', address.toLowerCase())
      .order('claimed_at', { ascending: false } as any)
      .limit(1)
      .single() as any
    
    return NextResponse.json({
      address,
      pending_rewards: pending.total,
      breakdown: {
        viralPoints: pending.viralPoints,
        guild_bonus: pending.guild_bonus,
        referral_bonus: pending.referral_bonus,
        streak_bonus: pending.streak_bonus,
        badge_prestige: pending.badge_prestige,
      },
      can_claim: claimCheck.allowed,
      claim_reason: claimCheck.reason,
      hours_until_claim: claimCheck.hoursRemaining,
      last_claim: lastClaim ? {
        amount: (lastClaim as any).total_claimed,
        claimed_at: (lastClaim as any).claimed_at,
        tx_hash: (lastClaim as any).tx_hash,
      } : null,
    })
    
  } catch (error) {
    console.error('Get claim status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
