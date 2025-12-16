/**
 * NFT Metadata & URI System
 * 
 * Professional metadata generation for GmeowNFT (transferable collectibles)
 * Follows OpenSea, Rarible, LooksRare standards
 */

import { keccak256, toHex } from 'viem'

// ============================================================
// TYPES
// ============================================================

export type NFTCategory = 'quest' | 'achievement' | 'event' | 'legendary' | 'seasonal' | 'custom'
export type NFTRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'

export type NFTMetadata = {
  name: string
  description: string
  image: string
  external_url?: string
  animation_url?: string // For video/3D NFTs
  background_color?: string // 6-character hex (no #)
  attributes: Array<{
    trait_type: string
    value: string | number
    display_type?: 'number' | 'boost_percentage' | 'boost_number' | 'date' | 'ranking'
    max_value?: number
  }>
  properties?: {
    category: NFTCategory
    rarity: NFTRarity
    edition?: number
    max_supply?: number
    creator?: string
    [key: string]: any
  }
}

// ============================================================
// STORAGE OPTIONS
// ============================================================

/**
 * Get NFT image URL from storage providers
 * Priority: IPFS > Arweave > R2 > Supabase
 */
export function getNFTImageUrl(nft: {
  category: NFTCategory
  type: string
  tokenId: number
  customHash?: string
}): string {
  const { category, type, tokenId, customHash } = nft

  const IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://cloudflare-ipfs.com/ipfs'
  const ARWEAVE_GATEWAY = process.env.NEXT_PUBLIC_ARWEAVE_GATEWAY || 'https://arweave.net'
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const STORAGE_BUCKET = 'nft-assets'

  const imageId = customHash || generateNFTImageId({ category, type, tokenId })
  const storageType = process.env.NEXT_PUBLIC_NFT_STORAGE || 'supabase'

  switch (storageType) {
    case 'ipfs':
      const ipfsCID = process.env.NEXT_PUBLIC_NFT_IPFS_CID
      if (ipfsCID) {
        return `${IPFS_GATEWAY}/${ipfsCID}/${imageId}.png`
      }
      break

    case 'arweave':
      const arweaveTxId = process.env.NEXT_PUBLIC_NFT_ARWEAVE_TX
      if (arweaveTxId) {
        return `${ARWEAVE_GATEWAY}/${arweaveTxId}/${imageId}.png`
      }
      break

    case 'r2':
      const r2Domain = process.env.NEXT_PUBLIC_R2_DOMAIN
      if (r2Domain) {
        return `${r2Domain}/nfts/${imageId}.png`
      }
      break

    case 'supabase':
    default:
      if (SUPABASE_URL) {
        return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${imageId}.png`
      }
      break
  }

  // Fallback: Dynamic generation API
  return `/api/nft/image/${imageId}`
}

function generateNFTImageId(nft: {
  category: NFTCategory
  type: string
  tokenId: number
}): string {
  const { category, type, tokenId } = nft
  const sanitizedType = sanitizeFilename(type)
  return `${category}-${sanitizedType}-${tokenId}`
}

function sanitizeFilename(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

// ============================================================
// RARITY SYSTEM
// ============================================================

const RARITY_CONFIG: Record<NFTRarity, {
  color: string
  probability: number
  boost: number
}> = {
  common: { color: 'A0A0A0', probability: 0.50, boost: 1.0 },
  uncommon: { color: '4CAF50', probability: 0.25, boost: 1.2 },
  rare: { color: '2196F3', probability: 0.15, boost: 1.5 },
  epic: { color: '9C27B0', probability: 0.07, boost: 2.0 },
  legendary: { color: 'FF9800', probability: 0.025, boost: 3.0 },
  mythic: { color: 'F44336', probability: 0.005, boost: 5.0 },
}

export function getRarityColor(rarity: NFTRarity): string {
  return RARITY_CONFIG[rarity].color
}

export function getRarityBoost(rarity: NFTRarity): number {
  return RARITY_CONFIG[rarity].boost
}

// ============================================================
// METADATA GENERATION
// ============================================================

/**
 * Generate metadata for Quest completion NFT
 */
export function generateQuestNFTMetadata(params: {
  tokenId: number
  questId: number
  questName: string
  questCategory: string
  rarity: NFTRarity
  completedBy: string
  completedAt: number
  reward: number
  edition?: number
  maxSupply?: number
}): NFTMetadata {
  const {
    tokenId,
    questId,
    questName,
    questCategory,
    rarity,
    completedBy,
    completedAt,
    reward,
    edition,
    maxSupply,
  } = params

  return {
    name: `${questName} #${edition || tokenId}`,
    description: `Proof of completing "${questName}" on Gmeowbased Adventure. This ${rarity} NFT is transferable and can be traded on marketplaces like OpenSea.`,
    image: getNFTImageUrl({
      category: 'quest',
      type: questName,
      tokenId,
    }),
    external_url: `https://gmeowhq.art/quests/${questId}`,
    background_color: getRarityColor(rarity),
    attributes: [
      {
        trait_type: 'Category',
        value: questCategory,
      },
      {
        trait_type: 'Rarity',
        value: rarity.charAt(0).toUpperCase() + rarity.slice(1),
      },
      {
        trait_type: 'Reward Boost',
        value: getRarityBoost(rarity),
        display_type: 'boost_percentage',
      },
      {
        trait_type: 'Quest ID',
        value: questId,
        display_type: 'number',
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
      ...(maxSupply
        ? [
            {
              trait_type: 'Edition',
              value: edition || tokenId,
              display_type: 'ranking' as const,
              max_value: maxSupply,
            },
          ]
        : []),
    ],
    properties: {
      category: 'quest',
      rarity,
      edition: edition || tokenId,
      max_supply: maxSupply,
      creator: completedBy,
      quest_id: questId,
      quest_name: questName,
      completed_at: completedAt,
    },
  }
}

/**
 * Generate metadata for Achievement NFT
 */
export function generateAchievementNFTMetadata(params: {
  tokenId: number
  achievementName: string
  achievementType: string
  rarity: NFTRarity
  earnedBy: string
  earnedAt: number
  attributes?: Array<{ trait_type: string; value: string | number }>
}): NFTMetadata {
  const {
    tokenId,
    achievementName,
    achievementType,
    rarity,
    earnedBy,
    earnedAt,
    attributes = [],
  } = params

  return {
    name: `${achievementName} #${tokenId}`,
    description: `Achievement NFT for ${achievementName} on Gmeowbased Adventure. Rarity: ${rarity}.`,
    image: getNFTImageUrl({
      category: 'achievement',
      type: achievementName,
      tokenId,
    }),
    external_url: 'https://gmeowhq.art',
    background_color: getRarityColor(rarity),
    attributes: [
      {
        trait_type: 'Type',
        value: achievementType,
      },
      {
        trait_type: 'Rarity',
        value: rarity.charAt(0).toUpperCase() + rarity.slice(1),
      },
      ...attributes,
      {
        trait_type: 'Earned',
        value: earnedAt,
        display_type: 'date',
      },
    ],
    properties: {
      category: 'achievement',
      rarity,
      creator: earnedBy,
      earned_at: earnedAt,
    },
  }
}

/**
 * Generate metadata for Event NFT
 */
export function generateEventNFTMetadata(params: {
  tokenId: number
  eventName: string
  eventDate: number
  rarity: NFTRarity
  edition: number
  maxSupply: number
  attributes?: Array<{ trait_type: string; value: string | number }>
}): NFTMetadata {
  const { tokenId, eventName, eventDate, rarity, edition, maxSupply, attributes = [] } = params

  return {
    name: `${eventName} ${eventDate ? `- ${new Date(eventDate).getFullYear()}` : ''} #${edition}`,
    description: `Limited edition NFT from ${eventName}. Edition ${edition} of ${maxSupply}.`,
    image: getNFTImageUrl({
      category: 'event',
      type: eventName,
      tokenId,
    }),
    external_url: 'https://gmeowhq.art',
    background_color: getRarityColor(rarity),
    attributes: [
      {
        trait_type: 'Event',
        value: eventName,
      },
      {
        trait_type: 'Rarity',
        value: rarity.charAt(0).toUpperCase() + rarity.slice(1),
      },
      {
        trait_type: 'Edition',
        value: edition,
        display_type: 'ranking',
        max_value: maxSupply,
      },
      ...attributes,
      {
        trait_type: 'Event Date',
        value: eventDate,
        display_type: 'date',
      },
    ],
    properties: {
      category: 'event',
      rarity,
      edition,
      max_supply: maxSupply,
      event_date: eventDate,
    },
  }
}

/**
 * Generate metadata for Legendary NFT
 */
export function generateLegendaryNFTMetadata(params: {
  tokenId: number
  name: string
  description: string
  imageUrl?: string
  attributes?: Array<{ trait_type: string; value: string | number }>
  edition?: number
  maxSupply?: number
}): NFTMetadata {
  const { tokenId, name, description, imageUrl, attributes = [], edition, maxSupply } = params

  return {
    name: `${name} ${edition ? `#${edition}` : ''}`,
    description,
    image:
      imageUrl ||
      getNFTImageUrl({
        category: 'legendary',
        type: name,
        tokenId,
      }),
    external_url: 'https://gmeowhq.art',
    background_color: getRarityColor('legendary'),
    attributes: [
      {
        trait_type: 'Category',
        value: 'Legendary',
      },
      {
        trait_type: 'Rarity',
        value: 'Legendary',
      },
      ...attributes,
      ...(maxSupply && edition
        ? [
            {
              trait_type: 'Edition',
              value: edition,
              display_type: 'ranking' as const,
              max_value: maxSupply,
            },
          ]
        : []),
    ],
    properties: {
      category: 'legendary',
      rarity: 'legendary',
      edition,
      max_supply: maxSupply,
    },
  }
}

// ============================================================
// API INTEGRATION
// ============================================================

export function getNFTMetadataUrl(tokenId: number): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gmeowhq.art'
  return `${baseUrl}/api/nft/metadata/${tokenId}`
}

export function getCollectionMetadataUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gmeowhq.art'
  return `${baseUrl}/api/nft/collection`
}

/**
 * Upload NFT metadata to storage
 */
export async function uploadNFTMetadata(
  metadata: NFTMetadata,
  tokenId: number
): Promise<string> {
  const storageType = process.env.NEXT_PUBLIC_NFT_STORAGE || 'supabase'

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

async function uploadToIPFS(metadata: NFTMetadata, tokenId: number): Promise<string> {
  const apiKey = process.env.NFTSTORAGE_API_KEY || process.env.PINATA_API_KEY
  if (!apiKey) {
    throw new Error('IPFS API key not configured')
  }

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

async function uploadToArweave(metadata: NFTMetadata, tokenId: number): Promise<string> {
  throw new Error('Arweave upload not implemented yet')
}

async function uploadToSupabase(metadata: NFTMetadata, tokenId: number): Promise<string> {
  const response = await fetch('/api/nft/upload-metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata, tokenId }),
  })

  if (!response.ok) {
    throw new Error(`Metadata upload failed: ${response.statusText}`)
  }

  const { url } = await response.json()
  return url
}

/**
 * Fetch NFT metadata from tokenURI
 */
export async function fetchNFTMetadata(tokenURI: string): Promise<NFTMetadata | null> {
  try {
    let url = tokenURI

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
    return metadata as NFTMetadata
  } catch (error) {
    const { trackError } = await import('@/lib/notifications/error-tracking')
    trackError('nft_metadata_fetch_error', error, { function: 'fetchNFTMetadata', tokenURI })
    return null
  }
}
