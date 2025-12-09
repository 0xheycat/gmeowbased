/**
 * Badge Metadata API
 * Returns OpenSea-compatible metadata for SoulboundBadge tokens
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { STANDALONE_ADDRESSES } from '@/lib/gmeow-utils'
import {
  generateGuildLeaderMetadata,
  generateGuildMemberMetadata,
  generateQuestBadgeMetadata,
  generateAchievementBadgeMetadata,
  type BadgeMetadata,
} from '@/lib/badge-metadata'

const BADGE_ABI = [
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'badgeType',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const GUILD_ABI = [
  {
    inputs: [{ name: 'guildId', type: 'uint256' }],
    name: 'guilds',
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'founder', type: 'address' },
      { name: 'createdAt', type: 'uint256' },
      { name: 'memberCount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  try {
    const params = await context.params
    const tokenId = parseInt(params.tokenId, 10)

    if (!Number.isFinite(tokenId) || tokenId < 0) {
      return NextResponse.json(
        { error: 'Invalid token ID' },
        { status: 400 }
      )
    }

    // Initialize viem client
    const client = createPublicClient({
      chain: base,
      transport: http(process.env.RPC_BASE || 'https://mainnet.base.org'),
    })

    const badgeAddress = STANDALONE_ADDRESSES.base.badge as `0x${string}`
    const guildAddress = STANDALONE_ADDRESSES.base.guild as `0x${string}`

    // Read badge type and owner from contract
    const [badgeType, owner] = await Promise.all([
      client.readContract({
        address: badgeAddress,
        abi: BADGE_ABI,
        functionName: 'badgeType',
        args: [BigInt(tokenId)],
      }).catch(() => ''),
      client.readContract({
        address: badgeAddress,
        abi: BADGE_ABI,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
      }).catch(() => null),
    ])

    if (!owner) {
      return NextResponse.json(
        { error: 'Token does not exist' },
        { status: 404 }
      )
    }

    // Parse badge type to determine metadata format
    let metadata: BadgeMetadata

    // Badge type format: "Guild Leader" or "guild-{guildId}"
    if (badgeType === 'Guild Leader') {
      // Fetch guild details for Guild Leader badge
      // Assume tokenId maps to guildId (simplified, may need mapping table)
      const guildId = tokenId

      try {
        const guildData = await client.readContract({
          address: guildAddress,
          abi: GUILD_ABI,
          functionName: 'guilds',
          args: [BigInt(guildId)],
        })

        const [guildName, founder, createdAt, memberCount] = guildData

        metadata = generateGuildLeaderMetadata({
          tokenId,
          guildId,
          guildName: String(guildName || `Guild #${guildId}`),
          founderAddress: founder as string,
          memberCount: Number(memberCount),
          createdAt: Number(createdAt),
        })
      } catch (error) {
        // Fallback if guild not found
        metadata = generateAchievementBadgeMetadata({
          tokenId,
          name: 'Guild Leader Badge',
          description: 'Leadership badge for a Gmeow guild',
          earnedAt: Date.now(),
        })
      }
    } else if (badgeType.startsWith('guild-')) {
      // Guild member badge: "guild-{guildId}"
      const guildId = parseInt(badgeType.replace('guild-', ''), 10)

      try {
        const guildData = await client.readContract({
          address: guildAddress,
          abi: GUILD_ABI,
          functionName: 'guilds',
          args: [BigInt(guildId)],
        })

        const [guildName, , createdAt] = guildData

        metadata = generateGuildMemberMetadata({
          tokenId,
          guildId,
          guildName: String(guildName || `Guild #${guildId}`),
          memberAddress: owner as string,
          joinedAt: Number(createdAt),
        })
      } catch (error) {
        metadata = generateAchievementBadgeMetadata({
          tokenId,
          name: 'Guild Member Badge',
          description: 'Membership badge for a Gmeow guild',
          earnedAt: Date.now(),
        })
      }
    } else if (badgeType.startsWith('quest-')) {
      // Quest completion badge
      const questId = parseInt(badgeType.replace('quest-', ''), 10)

      metadata = generateQuestBadgeMetadata({
        tokenId,
        questId,
        questName: `Quest #${questId}`,
        questCategory: 'General',
        completedBy: owner as string,
        completedAt: Date.now(),
        reward: 100,
      })
    } else {
      // Generic achievement badge
      metadata = generateAchievementBadgeMetadata({
        tokenId,
        name: badgeType || 'Gmeow Badge',
        description: `Badge earned on Gmeowbased Adventure: ${badgeType}`,
        earnedAt: Date.now(),
        attributes: [
          {
            trait_type: 'Owner',
            value: owner as string,
          },
        ],
      })
    }

    // Return metadata with cache headers
    return NextResponse.json(metadata, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Badge metadata error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
