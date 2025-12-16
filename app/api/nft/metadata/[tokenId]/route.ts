import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, type Address } from 'viem'
import { base } from 'viem/chains'
import { generateQuestNFTMetadata,
  generateAchievementNFTMetadata,
  generateEventNFTMetadata,
  generateLegendaryNFTMetadata,
  type NFTMetadata,
  type NFTCategory,
  type NFTRarity,
} from '@/lib/nft-metadata'
import { generateRequestId } from '@/lib/request-id'
const GM_BASE_NFT = (process.env.NEXT_PUBLIC_GM_BASE_NFT || process.env.GM_BASE_NFT) as Address
const GM_BASE_CORE = (process.env.NEXT_PUBLIC_GM_BASE_CORE || process.env.GM_BASE_CORE) as Address

const NFT_ABI = [
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'nftData',
    outputs: [
      { name: 'category', type: 'string' },
      { name: 'typeId', type: 'string' },
      { name: 'rarity', type: 'uint8' },
      { name: 'mintedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const QUEST_ABI = [
  {
    inputs: [{ name: 'questId', type: 'uint256' }],
    name: 'getQuest',
    outputs: [
      {
        components: [
          { name: 'name', type: 'string' },
          { name: 'creator', type: 'address' },
          { name: 'questType', type: 'uint8' },
          { name: 'target', type: 'uint256' },
          { name: 'rewardPointsPerUser', type: 'uint256' },
          { name: 'rewardTokenAmount', type: 'uint256' },
          { name: 'rewardToken', type: 'address' },
          { name: 'maxCompletions', type: 'uint256' },
          { name: 'completionsCount', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
          { name: 'expiresAt', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const RARITY_NAMES: Record<number, NFTRarity> = {
  0: 'common',
  1: 'uncommon',
  2: 'rare',
  3: 'epic',
  4: 'legendary',
  5: 'mythic',
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  const requestId = generateRequestId()

  try {
    const tokenId = BigInt(params.tokenId)

    // Read NFT data from contract
    const [nftData, owner] = await Promise.all([
      publicClient.readContract({
        address: GM_BASE_NFT,
        abi: NFT_ABI,
        functionName: 'nftData',
        args: [tokenId],
      }),
      publicClient.readContract({
        address: GM_BASE_NFT,
        abi: NFT_ABI,
        functionName: 'ownerOf',
        args: [tokenId],
      }),
    ])

    const [category, typeId, rarityNum, mintedAt] = nftData
    const rarity = RARITY_NAMES[rarityNum] || 'common'

    let metadata: NFTMetadata

    // Generate metadata based on category
    if (category === 'quest') {
      // Parse quest ID from typeId
      const questId = BigInt(typeId.replace('quest-', ''))

      // Fetch quest details from contract
      const quest = await publicClient.readContract({
        address: GM_BASE_CORE,
        abi: QUEST_ABI,
        functionName: 'getQuest',
        args: [questId],
      })

      metadata = generateQuestNFTMetadata({
        tokenId: Number(tokenId),
        questId: Number(questId),
        questName: quest.name,
        questCategory: ['Daily', 'Social', 'Guild', 'Referral', 'Achievement', 'Onchain'][quest.questType] || 'Quest',
        rarity,
        completedBy: owner,
        completedAt: Number(mintedAt),
        reward: Number(quest.rewardPointsPerUser),
        edition: Number(tokenId),
        maxSupply: Number(quest.maxCompletions) || undefined,
      })
    } else if (category === 'achievement') {
      metadata = generateAchievementNFTMetadata({
        tokenId: Number(tokenId),
        achievementName: `Achievement: ${typeId}`,
        achievementType: typeId,
        rarity,
        earnedBy: owner,
        earnedAt: Number(mintedAt),
        attributes: [
          {
            trait_type: 'Achievement Type',
            value: typeId,
          },
        ],
      })
    } else if (category === 'event') {
      metadata = generateEventNFTMetadata({
        tokenId: Number(tokenId),
        eventName: `Event: ${typeId}`,
        eventDate: Number(mintedAt),
        rarity,
        edition: Number(tokenId),
        maxSupply: 100, // Default for events
      })
    } else if (category === 'legendary') {
      metadata = generateLegendaryNFTMetadata({
        tokenId: Number(tokenId),
        name: `Legendary: ${typeId}`,
        description: `A legendary NFT in Gmeowbased Adventure. Only the most dedicated adventurers can obtain this.`,
        edition: Number(tokenId),
        maxSupply: 10, // Very limited
        attributes: [
          {
            trait_type: 'Category',
            value: 'Legendary',
          },
          {
            trait_type: 'Type',
            value: typeId,
          },
          {
            trait_type: 'Rarity',
            value: 'legendary',
          },
        ],
      })
    } else {
      // Default/custom category
      metadata = {
        name: `Gmeow NFT #${tokenId}`,
        description: `A unique NFT from Gmeowbased Adventure on Base.`,
        image: `https://gmeowhq.art/api/nft/image/default-${rarity}-${tokenId}`,
        external_url: `https://gmeowhq.art/nft/${tokenId}`,
        attributes: [
          {
            trait_type: 'Category',
            value: category,
          },
          {
            trait_type: 'Type',
            value: typeId,
          },
          {
            trait_type: 'Rarity',
            value: rarity,
          },
          {
            trait_type: 'Mint Date',
            value: Number(mintedAt),
            display_type: 'date',
          },
        ],
        properties: {
          category: category as NFTCategory,
          rarity,
          token_id: Number(tokenId),
          owner,
        },
      }
    }

    return NextResponse.json(metadata, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
    })
  } catch (error) {
    console.error('Error generating NFT metadata:', error)

    // Return minimal metadata on error
    return NextResponse.json(
      {
        name: `Gmeow NFT #${params.tokenId}`,
        description: 'A unique NFT from Gmeowbased Adventure',
        image: `https://gmeowhq.art/api/nft/image/default-common-${params.tokenId}`,
        external_url: `https://gmeowhq.art/nft/${params.tokenId}`,
        attributes: [],
        properties: {
          token_id: Number(params.tokenId),
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'Content-Type': 'application/json',
        },
      }
    )
  }
}
