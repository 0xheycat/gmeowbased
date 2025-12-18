/**
 * @file lib/contracts/referral-contract.ts
 * @description Type-safe wrapper for ReferralModule contract functions
 * 
 * PHASE: Phase 7.1 - Contracts (December 17, 2025)
 * 
 * Contract: GmeowReferralStandalone
 * Address: 0x9E7c32C1fB3a2c08e973185181512a442b90Ba44 (Base - VERIFIED)
 * Previous: 0x3FBd8B03ad8Ac22B73Baa7b152323739f2070e94 (deprecated proxy)
 * Verified: BaseScan December 11, 2025
 * 
 * FEATURES:
 *   - Custom referral code registration (3-32 characters)
 *   - One-time referrer setting with auto-rewards
 *   - Automatic point distribution (50 referrer, 25 referee)
 *   - Auto-badge minting at milestones (1, 5, 10 referrals)
 *   - Referral statistics tracking
 *   - Referral code ownership queries
 *   - Type-safe contract interaction wrappers
 * 
 * Functions from ReferralModule.sol:
 * - registerReferralCode(string code) - Register custom referral code (3-32 chars)
 * - setReferrer(string code) - Set referrer (one-time, auto-rewards both parties)
 * - referralCodeOf(address user) view returns (string) - Get user's referral code
 * - referralOwnerOf(string code) view returns (address) - Get code owner
 * - referrerOf(address user) view returns (address) - Get user's referrer
 * - referralStats(address user) view returns (ReferralStats) - Get referral stats
 * 
 * Auto-rewards:
 * - Referrer: +50 points per successful referral
 * - Referee: +25 points when setting referrer
 * 
 * Auto-badges (via BadgeContract):
 * - Bronze Referrer: 1 referral
 * - Silver Referrer: 5 referrals
 * - Gold Referrer: 10 referrals
 * 
 * REFERENCE DOCUMENTATION:
 *   - Contract source: contract/src/GmeowReferralStandalone.sol
 *   - Referral UI: components/referral/
 *   - Badge system: lib/badges/badges.ts
 *   - BaseScan: https://basescan.org/address/0x9E7c32C1fB3a2c08e973185181512a442b90Ba44
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Base blockchain (8453)
 *   - Referral codes: 3-32 characters, alphanumeric
 *   - Referrer can only be set once per user (irreversible)
 *   - Users must register code before others can use it
 *   - NO EMOJIS in referral codes
 * 
 * TODO:
 *   - [ ] Add referral code validation (profanity filter)
 *   - [ ] Add referral code availability check before registration
 *   - [ ] Add referral leaderboard (top referrers)
 *   - [ ] Add referral campaign tracking
 *   - [ ] Add referral analytics (conversion rates, sources)
 *   - [ ] Add custom referral rewards for special campaigns
 *   - [ ] Add referral expiration system
 * 
 * CRITICAL:
 *   - Referrer can ONLY be set once per user (warn before setting)
 *   - Referral codes must be unique (check availability first)
 *   - Users cannot refer themselves (validate client-side)
 *   - Referral rewards distribute immediately (no claiming needed)
 *   - Badge minting happens automatically at milestones
 *   - Deprecated proxy address should not be used
 * 
 * SUGGESTIONS:
 *   - Add referral code suggestions if desired code is taken
 *   - Add referral link generator with QR codes
 *   - Add social sharing for referral codes
 *   - Add referral tracking in user profile
 *   - Cache referral stats for frequently checked users
 *   - Add referral attribution to analytics
 * 
 * AVOID:
 *   - Allowing offensive or inappropriate referral codes
 *   - Letting users change referrer after setting (impossible on-chain)
 *   - Using deprecated proxy address for new interactions
 *   - Referral code spam (rate limit registrations)
 *   - Displaying raw addresses instead of codes
 *   - Hardcoding referral rewards (read from contract)
 * 
 * @updated December 11, 2025 - Migrated to verified standalone contract
 */

import { type Address } from 'viem'
import { base } from 'viem/chains'
import { getPublicClient } from '@/lib/contracts/rpc-client-pool'
import {
  getReferralAddress,
  getReferralABI,
  createRegisterReferralCodeTx,
  createSetReferrerTx,
  type GMChainKey,
} from '@/lib/contracts/gmeow-utils'

// ==========================================
// Types
// ==========================================

export interface ReferralStats {
  totalReferred: bigint
  totalPointsEarned: bigint
  totalTokenEarned: bigint
}

export interface ReferralData {
  code: string | null
  referrer: Address | null
  stats: ReferralStats
  tier: number // 0 = none, 1 = Bronze, 2 = Silver, 3 = Gold
}

// ==========================================
// Public Client
// ==========================================

// Phase 8.2.2: Use centralized RPC client pool
const publicClient = getPublicClient(base.id)

// ==========================================
// Read Functions
// ==========================================

/**
 * Get user's referral code
 * @param userAddress User's wallet address
 * @returns Referral code or null if not registered
 */
export async function getReferralCode(userAddress: Address): Promise<string | null> {
  try {
    const code = await publicClient.readContract({
      address: getReferralAddress('base'),
      abi: getReferralABI(),
      functionName: 'referralCodeOf',
      args: [userAddress],
    }) as string
    
    return code || null
  } catch (error) {
    console.error('[referral-contract] getReferralCode error:', error)
    return null
  }
}

/**
 * Get owner of a referral code
 * @param code Referral code
 * @returns Owner address or null if code doesn't exist
 */
export async function getReferralOwner(code: string): Promise<Address | null> {
  try {
    const owner = await publicClient.readContract({
      address: getReferralAddress('base'),
      abi: getReferralABI(),
      functionName: 'referralOwnerOf',
      args: [code],
    }) as Address
    
    return owner === '0x0000000000000000000000000000000000000000' ? null : owner
  } catch (error) {
    console.error('[referral-contract] getReferralCodeOwner error:', error)
    return null
  }
}

/**
 * Get user's referrer
 * @param userAddress User's wallet address
 * @returns Referrer address or null if no referrer set
 */
export async function getReferrer(userAddress: Address): Promise<Address | null> {
  try {
    const referrer = await publicClient.readContract({
      address: getReferralAddress('base'),
      abi: getReferralABI(),
      functionName: 'referrerOf',
      args: [userAddress],
    }) as Address
    
    return referrer === '0x0000000000000000000000000000000000000000' ? null : referrer
  } catch (error) {
    console.error('[referral-contract] getReferrer error:', error)
    return null
  }
}

/**
 * Get user's referral stats
 * @param userAddress User's wallet address
 * @returns Referral statistics
 */
export async function getReferralStats(userAddress: Address): Promise<ReferralStats> {
  try {
    const stats = await publicClient.readContract({
      address: getReferralAddress('base'),
      abi: getReferralABI(),
      functionName: 'referralStats',
      args: [userAddress],
    }) as any
    
    return {
      totalReferred: BigInt(stats.totalReferred || 0),
      totalPointsEarned: BigInt(stats.totalPointsEarned || 0),
      totalTokenEarned: BigInt(stats.totalTokenEarned || 0),
    }
  } catch (error) {
    console.error('[referral-contract] getReferralStats error:', error)
    return {
      totalReferred: 0n,
      totalPointsEarned: 0n,
      totalTokenEarned: 0n,
    }
  }
}

/**
 * Get user's referral tier (badge level)
 * @param userAddress User's wallet address
 * @returns 0 = none, 1 = Bronze (1+ refs), 2 = Silver (5+ refs), 3 = Gold (10+ refs)
 */
export async function getReferralTier(userAddress: Address): Promise<number> {
  try {
    const stats = await getReferralStats(userAddress)
    const totalRefs = Number(stats.totalReferred)
    
    if (totalRefs >= 10) return 3 // Gold
    if (totalRefs >= 5) return 2  // Silver
    if (totalRefs >= 1) return 1  // Bronze
    return 0 // None
  } catch (error) {
    console.error('[referral-contract] getReferralTier error:', error)
    return 0
  }
}

/**
 * Get complete referral data for a user
 * @param userAddress User's wallet address
 * @returns Complete referral data
 */
export async function getReferralData(userAddress: Address): Promise<ReferralData> {
  try {
    const [code, referrer, stats, tier] = await Promise.all([
      getReferralCode(userAddress),
      getReferrer(userAddress),
      getReferralStats(userAddress),
      getReferralTier(userAddress),
    ])
    
    return { code, referrer, stats, tier }
  } catch (error) {
    console.error('[referral-contract] getReferralData error:', error)
    return {
      code: null,
      referrer: null,
      stats: { totalReferred: 0n, totalPointsEarned: 0n, totalTokenEarned: 0n },
      tier: 0,
    }
  }
}

/**
 * Check if a referral code is available
 * @param code Referral code to check
 * @returns true if available, false if taken
 */
export async function isReferralCodeAvailable(code: string): Promise<boolean> {
  if (code.length < 3 || code.length > 32) return false
  
  const owner = await getReferralOwner(code)
  return owner === null
}

/**
 * Check if a user can set a referrer
 * @param userAddress User's wallet address
 * @returns true if user has no referrer yet, false if already set
 */
export async function canSetReferrer(userAddress: Address): Promise<boolean> {
  const referrer = await getReferrer(userAddress)
  return referrer === null
}

// ==========================================
// Write Function Builders
// ==========================================

/**
 * Build transaction to register a referral code
 * @param code Referral code (3-32 chars)
 * @param chain Chain to use (default: 'base')
 * @returns Transaction object for use with wagmi/viem
 */
export function buildRegisterReferralCodeTx(code: string, chain: GMChainKey = 'base') {
  return createRegisterReferralCodeTx(code, chain)
}

/**
 * Build transaction to set referrer by code
 * @param code Referral code of referrer
 * @param chain Chain to use (default: 'base')
 * @returns Transaction object for use with wagmi/viem
 */
export function buildSetReferrerTx(code: string, chain: GMChainKey = 'base') {
  return createSetReferrerTx(code, chain)
}

// ==========================================
// Validation
// ==========================================

/**
 * Validate referral code format
 * @param code Referral code
 * @returns { valid: boolean, error?: string }
 */
export function validateReferralCode(code: string): { valid: boolean; error?: string } {
  if (!code) {
    return { valid: false, error: 'Code is required' }
  }
  
  if (code.length < 3) {
    return { valid: false, error: 'Code must be at least 3 characters' }
  }
  
  if (code.length > 32) {
    return { valid: false, error: 'Code must be at most 32 characters' }
  }
  
  // Allow alphanumeric and underscores only
  if (!/^[a-zA-Z0-9_]+$/.test(code)) {
    return { valid: false, error: 'Code can only contain letters, numbers, and underscores' }
  }
  
  return { valid: true }
}

// ==========================================
// Constants
// ==========================================

export const REFERRAL_REWARDS = {
  REFERRER_POINTS: 50,
  REFEREE_POINTS: 25,
  REFERRER_TOKEN: 0,
  REFEREE_TOKEN: 0,
} as const

export const REFERRAL_TIERS = {
  BRONZE: { level: 1, minReferrals: 1, badgeName: 'Bronze Referrer' },
  SILVER: { level: 2, minReferrals: 5, badgeName: 'Silver Referrer' },
  GOLD: { level: 3, minReferrals: 10, badgeName: 'Gold Referrer' },
} as const
