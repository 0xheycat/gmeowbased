/**
 * NFT System - Types, Registry, and Utilities
 * Phase 17: NFT System Integration
 * 
 * Architecture:
 * - Extends existing badge infrastructure (user_badges, mint_queue)
 * - Reuses minting logic from lib/contract-mint.ts
 * - Multi-chain support (Base, OP, Celo, Ink, Unichain)
 * - On-chain quest verification
 */

import type { Database } from '@/types/supabase'
import type { ChainKey } from '@/lib/gmeow-utils'

// ============ TYPE DEFINITIONS ============

export type NFTRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
export type NFTCategory = 'quest' | 'guild' | 'event' | 'achievement' | 'onboarding'
export type NFTMintStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * NFT Metadata Definition
 * Stored in database and used for display/minting
 */
export type NFTMetadata = {
  id: string                        // Unique NFT type ID (e.g., 'mythic_user_badge')
  name: string                      // Display name
  description: string               // Description text
  rarity: NFTRarity                 // Rarity tier
  category: NFTCategory             // Category type
  image_url: string                 // Image URL (WEBP preferred)
  animation_url?: string            // Optional animation/video URL
  chain: ChainKey                   // Target blockchain
  contract_address?: string         // NFT contract address
  max_supply?: number               // Max supply (0 = unlimited)
  current_supply?: number           // Current minted count
  mint_price_wei?: string           // Mint price in wei (0 = free)
  is_active: boolean                // Whether NFT is available for minting
  attributes?: NFTAttribute[]       // Metadata attributes
  requirements?: NFTRequirements    // Eligibility requirements
  created_at?: string
  updated_at?: string
}

/**
 * NFT Attribute (OpenSea standard)
 */
export type NFTAttribute = {
  trait_type: string                // Attribute name
  value: string | number            // Attribute value
  display_type?: 'number' | 'boost_percentage' | 'boost_number' | 'date'
}

/**
 * NFT Eligibility Requirements
 */
export type NFTRequirements = {
  neynar_score?: number             // Minimum Neynar score (0-1)
  quest_completion?: number[]       // Required quest IDs
  guild_membership?: number[]       // Required guild IDs
  badge_ownership?: string[]        // Required badge type IDs
  min_xp?: number                   // Minimum XP required
  min_level?: number                // Minimum level required
  allowlist_only?: boolean          // Requires allowlist
  custom_check?: string             // Custom eligibility check function name
}

/**
 * User NFT Ownership Record
 * Extends user_badges table with nft_type = 'nft'
 */
export type UserNFT = {
  id: number
  fid: number                       // Farcaster ID
  nft_type_id: string               // NFT type from registry
  nft_type: 'nft'                   // Discriminator (vs 'badge')
  token_id?: number                 // On-chain token ID
  chain: ChainKey                   // Blockchain
  contract_address?: string         // NFT contract address
  minted: boolean                   // Minting status
  minted_at?: string                // Mint timestamp
  tx_hash?: string                  // Transaction hash
  metadata?: Record<string, any>    // Additional metadata
  assigned_at: string               // When NFT was assigned
  created_at: string
  updated_at: string
}

/**
 * NFT Mint Queue Entry
 * Extends mint_queue table
 */
export type NFTMintQueueEntry = {
  id: number
  fid: number
  nft_type_id: string               // NFT type ID (stored in badge_type column)
  chain: ChainKey
  status: NFTMintStatus
  reason?: string                   // Mint reason (quest completion, etc)
  error?: string                    // Error message if failed
  retry_count: number
  tx_hash?: string
  token_id?: number
  created_at: string
  processed_at?: string
}

/**
 * NFT Stats for User Dashboard
 */
export type NFTStats = {
  total_nfts: number                // Total NFT types available
  minted_nfts: number               // User's minted NFTs
  pending_nfts: number              // Pending mints in queue
  completion_percent: number        // Completion percentage
  by_rarity: Record<NFTRarity, number>
  by_category: Record<NFTCategory, number>
}

/**
 * NFT Mint Request
 */
export type NFTMintRequest = {
  fid: number
  nft_type_id: string
  chain: ChainKey
  reason?: string
  payment_value?: string            // ETH value for paid mints
}

/**
 * NFT Eligibility Check Result
 */
export type NFTEligibilityResult = {
  eligible: boolean
  nft: NFTMetadata
  reasons: string[]                 // Requirements not met
  user_data?: {
    neynar_score?: number
    completed_quests?: number[]
    guild_memberships?: number[]
    owned_badges?: string[]
    xp?: number
    level?: number
  }
}

// ============ NFT REGISTRY ============

/**
 * NFT Registry - Defines all available NFT types
 * 
 * Pattern: Same as badge registry (lib/badges.ts)
 * Future: Move to database (nft_metadata table)
 */
export const NFT_REGISTRY: NFTMetadata[] = [
  {
    id: 'mythic_user_badge',
    name: 'Mythic User Badge',
    description: 'Exclusive OG community member NFT. Awarded to users with exceptional Neynar scores.',
    rarity: 'mythic',
    category: 'onboarding',
    image_url: '/nfts/mythic_user.webp',
    animation_url: '/nfts/mythic_user.mp4',
    chain: 'base',
    max_supply: 1000,
    mint_price_wei: '0',
    is_active: true,
    attributes: [
      { trait_type: 'Tier', value: 'Mythic' },
      { trait_type: 'Category', value: 'OG Member' },
      { trait_type: 'Edition', value: 'Genesis' },
    ],
    requirements: {
      neynar_score: 0.8,
      allowlist_only: false,
    },
  },
  {
    id: 'quest_master_nft',
    name: 'Quest Master',
    description: 'Awarded to users who complete 10+ quests. Proof of dedication.',
    rarity: 'legendary',
    category: 'quest',
    image_url: '/nfts/quest_master.webp',
    chain: 'base',
    max_supply: 5000,
    mint_price_wei: '0',
    is_active: true,
    attributes: [
      { trait_type: 'Tier', value: 'Legendary' },
      { trait_type: 'Category', value: 'Quest Achievement' },
      { trait_type: 'Min Quests', value: 10, display_type: 'number' },
    ],
    requirements: {
      quest_completion: [], // Will check count >= 10
      min_xp: 1000,
    },
  },
  {
    id: 'guild_founder_nft',
    name: 'Guild Founder',
    description: 'Exclusive NFT for guild creators. Leadership badge.',
    rarity: 'epic',
    category: 'guild',
    image_url: '/nfts/guild_founder.webp',
    chain: 'base',
    max_supply: 0, // Unlimited
    mint_price_wei: '0',
    is_active: true,
    attributes: [
      { trait_type: 'Tier', value: 'Epic' },
      { trait_type: 'Category', value: 'Guild Leadership' },
      { trait_type: 'Role', value: 'Founder' },
    ],
    requirements: {
      custom_check: 'isGuildFounder', // Custom check function
    },
  },
  {
    id: 'daily_gm_streak_nft',
    name: 'GM Streak Champion',
    description: '30-day GM streak achievement. Consistency is key.',
    rarity: 'rare',
    category: 'achievement',
    image_url: '/nfts/gm_streak.webp',
    chain: 'base',
    max_supply: 0,
    mint_price_wei: '0',
    is_active: true,
    attributes: [
      { trait_type: 'Tier', value: 'Rare' },
      { trait_type: 'Category', value: 'Streak Achievement' },
      { trait_type: 'Streak Days', value: 30, display_type: 'number' },
    ],
    requirements: {
      custom_check: 'hasGMStreak30',
    },
  },
  {
    id: 'event_participant_nft',
    name: 'Event Participant',
    description: 'Limited edition event NFT. Participation reward.',
    rarity: 'common',
    category: 'event',
    image_url: '/nfts/event_participant.webp',
    chain: 'base',
    max_supply: 10000,
    mint_price_wei: '0',
    is_active: false, // Disabled by default (enable during events)
    attributes: [
      { trait_type: 'Tier', value: 'Common' },
      { trait_type: 'Category', value: 'Event' },
      { trait_type: 'Event Name', value: 'Genesis Launch' },
    ],
    requirements: {
      allowlist_only: true, // Event participants only
    },
  },
]

// ============ REGISTRY UTILITIES ============

/**
 * Get NFT metadata by ID
 */
export function getNFTFromRegistry(nftId: string): NFTMetadata | undefined {
  return NFT_REGISTRY.find(nft => nft.id === nftId)
}

/**
 * Get all active NFTs
 */
export function getActiveNFTs(): NFTMetadata[] {
  return NFT_REGISTRY.filter(nft => nft.is_active)
}

/**
 * Get NFTs by rarity
 */
export function getNFTsByRarity(rarity: NFTRarity): NFTMetadata[] {
  return NFT_REGISTRY.filter(nft => nft.rarity === rarity && nft.is_active)
}

/**
 * Get NFTs by category
 */
export function getNFTsByCategory(category: NFTCategory): NFTMetadata[] {
  return NFT_REGISTRY.filter(nft => nft.category === category && nft.is_active)
}

/**
 * Get NFTs by chain
 */
export function getNFTsByChain(chain: ChainKey): NFTMetadata[] {
  return NFT_REGISTRY.filter(nft => nft.chain === chain && nft.is_active)
}

/**
 * Check if NFT has reached max supply
 */
export function isNFTSupplyAvailable(nft: NFTMetadata): boolean {
  if (!nft.max_supply) return true // Unlimited
  return (nft.current_supply || 0) < nft.max_supply
}

/**
 * Get rarity color (for UI badges)
 * Matches Tailwick color palette
 */
export function getRarityColor(rarity: NFTRarity): string {
  const colors: Record<NFTRarity, string> = {
    common: 'slate',      // Gray
    rare: 'blue',         // Blue
    epic: 'purple',       // Purple
    legendary: 'amber',   // Gold
    mythic: 'pink',       // Pink/Magenta
  }
  return colors[rarity]
}

/**
 * Get category icon type (for Gmeowbased icons)
 */
export function getCategoryIcon(category: NFTCategory): string {
  const icons: Record<NFTCategory, string> = {
    quest: 'quest_box',
    guild: 'guild_shield',
    event: 'star',
    achievement: 'trophy',
    onboarding: 'welcome',
  }
  return icons[category]
}

/**
 * Format mint price (wei to ETH)
 */
export function formatMintPrice(priceWei: string | undefined): string {
  if (!priceWei || priceWei === '0') return 'Free'
  const eth = Number(priceWei) / 1e18
  return `${eth.toFixed(4)} ETH`
}

/**
 * Calculate completion percentage
 */
export function calculateNFTCompletion(minted: number, total: number): number {
  if (total === 0) return 0
  return Math.round((minted / total) * 100)
}

// ============ VALIDATION UTILITIES ============

/**
 * Validate NFT ID format
 */
export function isValidNFTId(nftId: string): boolean {
  return /^[a-z0-9_]+$/.test(nftId)
}

/**
 * Validate chain key
 */
export function isValidChain(chain: string): chain is ChainKey {
  return ['base', 'op', 'celo', 'ink', 'unichain'].includes(chain)
}

/**
 * Validate rarity
 */
export function isValidRarity(rarity: string): rarity is NFTRarity {
  return ['common', 'rare', 'epic', 'legendary', 'mythic'].includes(rarity)
}

/**
 * Validate category
 */
export function isValidCategory(category: string): category is NFTCategory {
  return ['quest', 'guild', 'event', 'achievement', 'onboarding'].includes(category)
}
