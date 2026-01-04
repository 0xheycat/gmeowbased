/**
 * Badge Metadata & URI System
 * 
 * Professional metadata generation for SoulboundBadge NFTs
 * Follows OpenSea, Rarible, and NFT.storage standards
 */

import { keccak256, toHex } from 'viem'

// ============================================================
// TYPES
// ============================================================

export type BadgeType = 'guild_leader' | 'guild_member' | 'quest_completion' | 'achievement' | 'custom'

export type BadgeMetadata = {
  name: string
  description: string
  image: string
  external_url?: string
  attributes: Array<{
    trait_type: string
    value: string | number
    display_type?: 'number' | 'boost_percentage' | 'boost_number' | 'date'
  }>
  properties?: {
    category: string
    type: BadgeType
    guild_id?: number
    guild_name?: string
    quest_id?: number
    quest_name?: string
    earned_at?: number
    [key: string]: any
  }
}

// ============================================================
// STORAGE OPTIONS
// ============================================================

/**
 * Get badge image URL from various storage providers
 * Priority: IPFS > Arweave > Cloudflare R2 > Supabase Storage
 */
export function getBadgeImageUrl(badge: {
  type: BadgeType
  guildName?: string
  questName?: string
  customId?: string
}): string {
  const { type, guildName, questName, customId } = badge

  // IPFS Gateway (preferred for decentralization)
  const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://cloudflare-ipfs.com/ipfs'
  
  // Arweave Gateway (permanent storage alternative)
  const ARWEAVE_GATEWAY = process.env.NEXT_PUBLIC_ARWEAVE_GATEWAY || 'https://arweave.net'
  
  // Supabase Storage (centralized, fast)
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const STORAGE_BUCKET = 'badge-assets'

  // Generate deterministic image hash based on badge properties
  const imageId = generateBadgeImageId(badge)

  // Check environment for storage preference
  const storageType = process.env.NEXT_PUBLIC_BADGE_STORAGE || 'supabase'

  switch (storageType) {
    case 'ipfs':
      // IPFS CID format: QmXxx... (base32 or base58)
      // Image stored at: ipfs://QmXxx/guild-leader-{hash}.png
      const ipfsCID = process.env.NEXT_PUBLIC_BADGE_IPFS_CID
      if (ipfsCID) {
        return `${IPFS_GATEWAY}/${ipfsCID}/${imageId}.png`
      }
      break

    case 'arweave':
      // Arweave transaction ID format
      const arweaveTxId = process.env.NEXT_PUBLIC_BADGE_ARWEAVE_TX
      if (arweaveTxId) {
        return `${ARWEAVE_GATEWAY}/${arweaveTxId}/${imageId}.png`
      }
      break

    case 'r2':
      // Cloudflare R2 with custom domain
      const r2Domain = process.env.NEXT_PUBLIC_R2_DOMAIN
      if (r2Domain) {
        return `${r2Domain}/badges/${imageId}.png`
      }
      break

    case 'supabase':
    default:
      // Supabase Storage (default)
      if (SUPABASE_URL) {
        return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${imageId}.png`
      }
      break
  }

  // Fallback: Dynamic badge generation API
  return `/api/badge/image/${imageId}`
}

/**
 * Generate deterministic badge image ID
 * Based on badge type and properties
 */
function generateBadgeImageId(badge: {
  type: BadgeType
  guildName?: string
  questName?: string
  customId?: string
}): string {
  const { type, guildName, questName, customId } = badge

  // Use custom ID if provided
  if (customId) {
    return sanitizeFilename(customId)
  }

  // Generate based on type
  switch (type) {
    case 'guild_leader':
      return `guild-leader-${sanitizeFilename(guildName || 'unknown')}`
    
    case 'guild_member':
      return `guild-member-${sanitizeFilename(guildName || 'unknown')}`
    
    case 'quest_completion':
      return `quest-${sanitizeFilename(questName || 'unknown')}`
    
    case 'achievement':
      return `achievement-${sanitizeFilename(guildName || questName || 'generic')}`
    
    default:
      // Fallback to hash of properties
      const hash = keccak256(toHex(JSON.stringify(badge)))
      return `badge-${hash.slice(2, 12)}`
  }
}

/**
 * Sanitize string for use in filenames/URLs
 */
function sanitizeFilename(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD') // Decompose accents
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
    .replace(/^-+|-+$/g, '') // Trim dashes
    .slice(0, 50) // Max 50 chars
}

// ============================================================
// METADATA GENERATION
// ============================================================

/**
 * Generate OpenSea-compatible metadata for Guild Leader badge
 */
export function generateGuildLeaderMetadata(params: {
  tokenId: number
  guildId: number
  guildName: string
  founderAddress: string
  memberCount: number
  createdAt: number
}): BadgeMetadata {
  const { tokenId, guildId, guildName, founderAddress, memberCount, createdAt } = params

  return {
    name: `${guildName} - Guild Leader`,
    description: `Guild Leader badge for ${guildName}. This soulbound NFT represents the founder and leader of Guild #${guildId} on Gmeowbased Adventure. Non-transferable proof of guild creation and leadership.`,
    image: getBadgeImageUrl({
      type: 'guild_leader',
      guildName,
    }),
    external_url: `https://gmeowhq.art/guild/${guildId}`,
    attributes: [
      {
        trait_type: 'Badge Type',
        value: 'Guild Leader',
      },
      {
        trait_type: 'Guild Name',
        value: guildName,
      },
      {
        trait_type: 'Guild ID',
        value: guildId,
        display_type: 'number',
      },
      {
        trait_type: 'Member Count',
        value: memberCount,
        display_type: 'number',
      },
      {
        trait_type: 'Founded',
        value: createdAt,
        display_type: 'date',
      },
      {
        trait_type: 'Transferable',
        value: 'No (Soulbound)',
      },
    ],
    properties: {
      category: 'Guild',
      type: 'guild_leader',
      guild_id: guildId,
      guild_name: guildName,
      founder: founderAddress,
      earned_at: createdAt,
      soulbound: true,
    },
  }
}

/**
 * Generate metadata for Guild Member badge
 */
export function generateGuildMemberMetadata(params: {
  tokenId: number
  guildId: number
  guildName: string
  memberAddress: string
  joinedAt: number
  rank?: string
}): BadgeMetadata {
  const { tokenId, guildId, guildName, memberAddress, joinedAt, rank = 'Member' } = params

  return {
    name: `${guildName} - ${rank}`,
    description: `Guild ${rank} badge for ${guildName}. This soulbound NFT represents membership in Guild #${guildId} on Gmeowbased Adventure.`,
    image: getBadgeImageUrl({
      type: 'guild_member',
      guildName,
    }),
    external_url: `https://gmeowhq.art/guild/${guildId}`,
    attributes: [
      {
        trait_type: 'Badge Type',
        value: 'Guild Member',
      },
      {
        trait_type: 'Guild Name',
        value: guildName,
      },
      {
        trait_type: 'Guild ID',
        value: guildId,
        display_type: 'number',
      },
      {
        trait_type: 'Rank',
        value: rank,
      },
      {
        trait_type: 'Joined',
        value: joinedAt,
        display_type: 'date',
      },
      {
        trait_type: 'Transferable',
        value: 'No (Soulbound)',
      },
    ],
    properties: {
      category: 'Guild',
      type: 'guild_member',
      guild_id: guildId,
      guild_name: guildName,
      member: memberAddress,
      rank,
      earned_at: joinedAt,
      soulbound: true,
    },
  }
}

/**
 * Generate metadata for Quest Completion badge
 */
export function generateQuestBadgeMetadata(params: {
  tokenId: number
  questId: number
  questName: string
  questCategory: string
  completedBy: string
  completedAt: number
  reward: number
}): BadgeMetadata {
  const { tokenId, questId, questName, questCategory, completedBy, completedAt, reward } = params

  return {
    name: `${questName} - Completed`,
    description: `Quest completion badge for "${questName}". This soulbound NFT proves successful completion of Quest #${questId} on Gmeowbased Adventure.`,
    image: getBadgeImageUrl({
      type: 'quest_completion',
      questName,
    }),
    external_url: `https://gmeowhq.art/quests/${slug}`,
    attributes: [
      {
        trait_type: 'Badge Type',
        value: 'Quest Completion',
      },
      {
        trait_type: 'Quest Name',
        value: questName,
      },
      {
        trait_type: 'Quest ID',
        value: questId,
        display_type: 'number',
      },
      {
        trait_type: 'Category',
        value: questCategory,
      },
      {
        trait_type: 'Reward',
        value: reward,
        display_type: 'number',
      },
      {
        trait_type: 'Completed',
        value: completedAt,
        display_type: 'date',
      },
      {
        trait_type: 'Transferable',
        value: 'No (Soulbound)',
      },
    ],
    properties: {
      category: 'Quest',
      type: 'quest_completion',
      quest_id: questId,
      quest_name: questName,
      quest_category: questCategory,
      completed_by: completedBy,
      earned_at: completedAt,
      reward_points_awarded: reward,
      soulbound: true,
    },
  }
}

/**
 * Generate generic achievement badge metadata
 */
export function generateAchievementBadgeMetadata(params: {
  tokenId: number
  name: string
  description: string
  imageUrl?: string
  attributes?: Array<{ trait_type: string; value: string | number }>
  earnedAt: number
}): BadgeMetadata {
  const { tokenId, name, description, imageUrl, attributes = [], earnedAt } = params

  return {
    name,
    description,
    image: imageUrl || getBadgeImageUrl({ type: 'achievement' }),
    external_url: 'https://gmeowhq.art',
    attributes: [
      {
        trait_type: 'Badge Type',
        value: 'Achievement',
      },
      ...attributes,
      {
        trait_type: 'Earned',
        value: earnedAt,
        display_type: 'date',
      },
      {
        trait_type: 'Transferable',
        value: 'No (Soulbound)',
      },
    ],
    properties: {
      category: 'Achievement',
      type: 'achievement',
      earned_at: earnedAt,
      soulbound: true,
    },
  }
}

// ============================================================
// API INTEGRATION
// ============================================================

/**
 * Get badge metadata API endpoint
 */
export function getBadgeMetadataUrl(tokenId: number): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gmeowhq.art'
  return `${baseUrl}/api/badge/metadata/${tokenId}`
}

/**
 * Upload metadata to storage (IPFS/Arweave/Supabase)
 */
export async function uploadBadgeMetadata(
  metadata: BadgeMetadata,
  tokenId: number
): Promise<string> {
  const storageType = process.env.NEXT_PUBLIC_BADGE_STORAGE || 'supabase'

  switch (storageType) {
    case 'ipfs':
      return await uploadToIPFS(metadata, tokenId)
    
    case 'arweave':
      return await uploadToArweave(metadata, tokenId)
    
    case 'supabase':
    default:
      return await uploadToSupabase(metadata, tokenId)
  }
}

async function uploadToIPFS(metadata: BadgeMetadata, tokenId: number): Promise<string> {
  // Use NFT.storage or Pinata API
  const apiKey = process.env.NFTSTORAGE_API_KEY || process.env.PINATA_API_KEY
  if (!apiKey) {
    throw new Error('IPFS API key not configured')
  }

  // Implementation with NFT.storage
  const response = await fetch('https://api.nft.storage/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  })

  if (!response.ok) {
    throw new Error(`IPFS upload failed: ${response.statusText}`)
  }

  const { value } = await response.json()
  return `ipfs://${value.cid}`
}

async function uploadToArweave(metadata: BadgeMetadata, tokenId: number): Promise<string> {
  // Use Bundlr/Arweave API
  throw new Error('Arweave upload not implemented yet')
}

async function uploadToSupabase(metadata: BadgeMetadata, tokenId: number): Promise<string> {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!SUPABASE_URL) {
    throw new Error('Supabase URL not configured')
  }

  const metadataPath = `metadata/${tokenId}.json`
  const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/badge-assets/${metadataPath}`

  // Upload via API route to handle authentication
  const response = await fetch('/api/badge/upload-metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata, tokenId }),
  })

  if (!response.ok) {
    throw new Error(`Metadata upload failed: ${response.statusText}`)
  }

  return storageUrl
}

// ============================================================
// HELPER: Get token metadata from contract
// ============================================================

/**
 * Fetch badge metadata from tokenURI
 * Handles ipfs://, ar://, https:// protocols
 */
export async function fetchBadgeMetadata(tokenURI: string): Promise<BadgeMetadata | null> {
  try {
    let url = tokenURI

    // Convert IPFS/Arweave to HTTPS gateway
    if (tokenURI.startsWith('ipfs://')) {
      const cid = tokenURI.replace('ipfs://', '')
      const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://cloudflare-ipfs.com/ipfs'
      url = `${gateway}/${cid}`
    } else if (tokenURI.startsWith('ar://')) {
      const txId = tokenURI.replace('ar://', '')
      url = `https://arweave.net/${txId}`
    }

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`)
    }

    const metadata = await response.json()
    return metadata as BadgeMetadata
  } catch (error) {
    const { trackError } = await import('@/lib/notifications/error-tracking')
    trackError('badge_metadata_fetch_error', error, { function: 'fetchBadgeMetadata', tokenURI })
    return null
  }
}
