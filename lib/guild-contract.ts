/**
 * Guild Contract Wrapper
 * 
 * Purpose: Type-safe wrapper for GuildModule contract functions
 * Contract: GmeowGuildStandalone (standalone module)
 * Address: 0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3 (Base)
 * 
 * Functions from GuildModule.sol:
 * - createGuild(string name) - Create guild (100 pt cost, auto "Guild Leader" badge)
 * - joinGuild(uint256 guildId) - Join guild
 * - leaveGuild() - Leave current guild
 * - depositGuildPoints(uint256 guildId, uint256 points) - Deposit points to treasury
 * - claimGuildReward(uint256 guildId, uint256 points) - Claim points from treasury
 * - setGuildOfficer(uint256 guildId, address member, bool isOfficer) - Manage officers
 * - getGuildInfo(uint256 guildId) view returns (Guild) - Get guild data
 * - getUserGuild(address user) view returns (uint256) - Get user's guild ID
 * - getGuildLevel(uint256 guildId) view returns (uint8) - Get guild level
 * - isGuildOfficer(uint256 guildId, address member) view returns (bool) - Check officer status
 * 
 * Guild levels (based on totalPoints):
 * - Level 1: 0-999 points
 * - Level 2: 1000-1999 points
 * - Level 3: 2000-4999 points
 * - Level 4: 5000-9999 points
 * - Level 5: 10000+ points
 */

import { createPublicClient, http, type Address } from 'viem'
import { base } from 'viem/chains'
import {
  getGuildAddress,
  getGuildABI,
  createGuildTx,
  createJoinGuildTx,
  createLeaveGuildTx,
  createDepositGuildPointsTx,
  createClaimGuildRewardTx,
  createGuildQuestTx,
  type GMChainKey,
} from './gmeow-utils'

// ==========================================
// Types
// ==========================================

export interface Guild {
  name: string
  leader: Address
  totalPoints: bigint
  memberCount: bigint
  active: boolean
  level: number
}

export interface GuildStats {
  totalPoints: bigint
  memberCount: bigint
  level: number
  treasuryPoints: bigint
}

export interface GuildMember {
  address: Address
  isOfficer: boolean
  joinedAt?: number
}

// ==========================================
// Public Client
// ==========================================

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
})

// ==========================================
// Read Functions
// ==========================================

/**
 * Get guild information
 * @param guildId Guild ID
 * @returns Guild data or null if doesn't exist
 */
export async function getGuild(guildId: bigint): Promise<Guild | null> {
  try {
    const result = await publicClient.readContract({
      address: getGuildAddress('base'),
      abi: getGuildABI(),
      functionName: 'getGuildInfo',
      args: [guildId],
    }) as any
    
    // getGuildInfo returns: (name, leader, totalPoints, memberCount, active, level, treasuryPoints)
    if (!result) return null
    
    // Handle both tuple array format and object format
    const [name, leader, totalPoints, memberCount, active, level] = Array.isArray(result) 
      ? result 
      : [result.name, result.leader, result.totalPoints, result.memberCount, result.active, result.level]
    
    // Return null if guild doesn't exist (empty name) or is inactive
    if (!name || !active) return null
    
    return {
      name,
      leader: leader as Address,
      totalPoints: BigInt(totalPoints || 0),
      memberCount: BigInt(memberCount || 0),
      active,
      level: Number(level || 0),
    }
  } catch (error) {
    console.error('[guild-contract] getGuild error:', error)
    return null
  }
}

/**
 * Get user's current guild ID
 * @param userAddress User's wallet address
 * @returns Guild ID or null if user is not in a guild
 */
export async function getUserGuild(userAddress: Address): Promise<bigint | null> {
  try {
    const guildId = await publicClient.readContract({
      address: getGuildAddress('base'),
      abi: getGuildABI(),
      functionName: 'guildOf',
      args: [userAddress],
    }) as bigint
    
    return guildId === 0n ? null : guildId
  } catch (error) {
    console.error('[guild-contract] getUserGuild error:', error)
    return null
  }
}

/**
 * Get guild level (1-5 based on totalPoints)
 * @param guildId Guild ID
 * @returns Guild level (1-5) or 0 if doesn't exist
 */
export async function getGuildLevel(guildId: bigint): Promise<number> {
  try {
    const guild = await getGuild(guildId)
    if (!guild) return 0
    
    return guild.level
  } catch (error) {
    console.error('[guild-contract] getGuildLevel error:', error)
    return 0
  }
}

/**
 * Check if a user is a guild officer
 * @param guildId Guild ID
 * @param userAddress User's wallet address
 * @returns true if user is an officer, false otherwise
 */
export async function isGuildOfficer(guildId: bigint, userAddress: Address): Promise<boolean> {
  try {
    const isOfficer = await publicClient.readContract({
      address: getGuildAddress('base'),
      abi: getGuildABI(),
      functionName: 'guildOfficers', // Correct: view function checks officer status
      args: [guildId, userAddress],
    }) as boolean
    
    return isOfficer
  } catch (error) {
    console.error('[guild-contract] isGuildOfficer error:', error)
    return false
  }
}

/**
 * Get guild treasury points
 * @param guildId Guild ID
 * @returns Treasury points balance
 */
export async function getGuildTreasury(guildId: bigint): Promise<bigint> {
  try {
    const treasury = await publicClient.readContract({
      address: getGuildAddress('base'),
      abi: getGuildABI(),
      functionName: 'guildTreasuryPoints',
      args: [guildId],
    }) as bigint
    
    return treasury || 0n
  } catch (error) {
    console.error('[guild-contract] getGuildTreasury error:', error)
    return 0n
  }
}

/**
 * Get guild stats (points, members, level, treasury)
 * @param guildId Guild ID
 * @returns Guild statistics
 */
export async function getGuildStats(guildId: bigint): Promise<GuildStats | null> {
  try {
    const [guild, treasury] = await Promise.all([
      getGuild(guildId),
      getGuildTreasury(guildId),
    ])
    
    if (!guild) return null
    
    return {
      totalPoints: guild.totalPoints,
      memberCount: guild.memberCount,
      level: guild.level,
      treasuryPoints: treasury,
    }
  } catch (error) {
    console.error('[guild-contract] getGuildStats error:', error)
    return null
  }
}

/**
 * Check if a user is the guild leader
 * @param guildId Guild ID
 * @param userAddress User's wallet address
 * @returns true if user is the leader, false otherwise
 */
export async function isGuildLeader(guildId: bigint, userAddress: Address): Promise<boolean> {
  try {
    const guild = await getGuild(guildId)
    if (!guild) return false
    
    return guild.leader.toLowerCase() === userAddress.toLowerCase()
  } catch (error) {
    console.error('[guild-contract] isGuildLeader error:', error)
    return false
  }
}

/**
 * Get total guild count
 * @returns Total number of guilds created
 */
export async function getGuildCount(): Promise<number> {
  try {
    const nextId = await publicClient.readContract({
      address: getGuildAddress('base'),
      abi: getGuildABI(),
      functionName: 'nextGuildId',
      args: [],
    }) as bigint
    
    // nextGuildId is the ID that will be assigned to the next guild, so subtract 1 for count
    return Number(nextId || 0) - 1
  } catch (error) {
    console.error('[guild-contract] getGuildCount error:', error)
    return 0
  }
}

/**
 * Get guild creation cost
 * @returns Cost in points to create a guild
 */
export async function getGuildCreationCost(): Promise<bigint> {
  try {
    const cost = await publicClient.readContract({
      address: getGuildAddress('base'),
      abi: getGuildABI(),
      functionName: 'guildCreationCost',
      args: [],
    }) as bigint
    
    return cost || 100n
  } catch (error) {
    console.error('[guild-contract] getGuildCreationCost error:', error)
    return 100n // Default cost
  }
}

/**
 * Check if a user can create a guild
 * @param userAddress User's wallet address
 * @param userPoints User's current points balance
 * @returns true if user can create guild, false otherwise
 */
export async function canCreateGuild(userAddress: Address, userPoints: bigint): Promise<boolean> {
  try {
    // Check if user is already in a guild
    const existingGuild = await getUserGuild(userAddress)
    if (existingGuild !== null) return false
    
    // Check if user has enough points
    const cost = await getGuildCreationCost()
    return userPoints >= cost
  } catch (error) {
    console.error('[guild-contract] canCreateGuild error:', error)
    return false
  }
}

/**
 * Check if a user can join a guild
 * @param userAddress User's wallet address
 * @param guildId Guild ID to join
 * @returns true if user can join, false otherwise
 */
export async function canJoinGuild(userAddress: Address, guildId: bigint): Promise<boolean> {
  try {
    // Check if user is already in a guild
    const existingGuild = await getUserGuild(userAddress)
    if (existingGuild !== null) return false
    
    // Check if target guild exists
    const guild = await getGuild(guildId)
    if (!guild || !guild.active) return false
    
    return true
  } catch (error) {
    console.error('[guild-contract] canJoinGuild error:', error)
    return false
  }
}

// ==========================================
// Write Function Builders
// ==========================================

/**
 * Build transaction to create a guild
 * @param name Guild name
 * @param chain Chain to use (default: 'base')
 * @returns Transaction object for use with wagmi/viem
 */
export function buildCreateGuildTx(name: string, chain: GMChainKey = 'base') {
  return createGuildTx(name, chain)
}

/**
 * Build transaction to join a guild
 * @param guildId Guild ID
 * @param chain Chain to use (default: 'base')
 * @returns Transaction object for use with wagmi/viem
 */
export function buildJoinGuildTx(guildId: bigint, chain: GMChainKey = 'base') {
  return createJoinGuildTx(guildId, chain)
}

/**
 * Build transaction to leave current guild
 * @param chain Chain to use (default: 'base')
 * @returns Transaction object for use with wagmi/viem
 */
export function buildLeaveGuildTx(chain: GMChainKey = 'base') {
  return createLeaveGuildTx(chain)
}

/**
 * Build transaction to deposit points to guild treasury
 * @param guildId Guild ID
 * @param points Amount of points to deposit
 * @param chain Chain to use (default: 'base')
 * @returns Transaction object for use with wagmi/viem
 */
export function buildDepositGuildPointsTx(guildId: bigint, points: bigint, chain: GMChainKey = 'base') {
  return createDepositGuildPointsTx(guildId, points, chain)
}

/**
 * Build transaction to claim points from guild treasury
 * @param guildId Guild ID
 * @param points Amount of points to claim
 * @param chain Chain to use (default: 'base')
 * @returns Transaction object for use with wagmi/viem
 */
export function buildClaimGuildRewardTx(guildId: bigint, points: bigint, chain: GMChainKey = 'base') {
  return createClaimGuildRewardTx(guildId, points, chain)
}

/**
 * Build transaction to create a guild quest
 * @param guildId Guild ID
 * @param questName Quest name
 * @param rewardPoints Reward points for completing quest
 * @param chain Chain to use (default: 'base')
 * @returns Transaction object for use with wagmi/viem
 */
export function buildCreateGuildQuestTx(
  guildId: bigint,
  questName: string,
  rewardPoints: bigint,
  chain: GMChainKey = 'base'
) {
  return createGuildQuestTx(guildId, questName, rewardPoints, chain)
}

// ==========================================
// Validation
// ==========================================

/**
 * Validate guild name format
 * @param name Guild name
 * @returns { valid: boolean, error?: string }
 */
export function validateGuildName(name: string): { valid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Guild name is required' }
  }
  
  if (name.length < 3) {
    return { valid: false, error: 'Guild name must be at least 3 characters' }
  }
  
  if (name.length > 32) {
    return { valid: false, error: 'Guild name must be at most 32 characters' }
  }
  
  return { valid: true }
}

// ==========================================
// Constants
// ==========================================

export const GUILD_CREATION_COST = 100n

export const GUILD_LEVELS = {
  1: { minPoints: 0, maxPoints: 999, name: 'Bronze' },
  2: { minPoints: 1000, maxPoints: 1999, name: 'Silver' },
  3: { minPoints: 2000, maxPoints: 4999, name: 'Gold' },
  4: { minPoints: 5000, maxPoints: 9999, name: 'Platinum' },
  5: { minPoints: 10000, maxPoints: Infinity, name: 'Diamond' },
} as const

/**
 * Calculate guild level from points
 * @param points Guild total points
 * @returns Guild level (1-5)
 */
export function calculateGuildLevel(points: bigint): number {
  const pointsNum = Number(points)
  
  if (pointsNum >= 10000) return 5
  if (pointsNum >= 5000) return 4
  if (pointsNum >= 2000) return 3
  if (pointsNum >= 1000) return 2
  return 1
}
