/**
 * Badge Metadata API
 * Returns OpenSea-compatible metadata for SoulboundBadge tokens
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCached } from '@/lib/cache/server'
import { createClient } from '@/lib/supabase/edge'
import {
  generateGuildLeaderMetadata,
  generateGuildMemberMetadata,
  generateQuestBadgeMetadata,
  generateAchievementBadgeMetadata,
  type BadgeMetadata,
} from '@/lib/badges/badge-metadata'

// Badge data from user_badges table
interface BadgeData {
  id: number
  fid: number
  badge_id: string
  badge_type: string
  tier: string
  assigned_at: string
  minted: boolean
  minted_at: string | null
  tx_hash: string | null
  chain: string | null
  contract_address: string | null
  token_id: number | null
  metadata: any
  category: string | null
  image_url: string | null
}

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

    // Get cached metadata
    const metadata = await getCached(
      'badge-metadata',
      `token:${tokenId}`,
      async () => {
        const supabase = createClient()

        // Look up badge by token_id in user_badges
        const { data: badgeData, error: badgeError } = await supabase
          .from('user_badges')
          .select('*')
          .eq('token_id', tokenId)
          .single()

        if (badgeError || !badgeData) {
          throw new Error('Token does not exist')
        }

        // Type the badge data
        const badge = badgeData as BadgeData

        // Determine badge type and generate metadata
        let badgeMetadata: BadgeMetadata

        // Check if it's a guild badge
        if (badge.category === 'guild' && badge.metadata?.guild_id) {
          const guildId = badge.metadata.guild_id

          // Fetch guild info from guild_metadata
          const { data: guild } = await supabase
            .from('guild_metadata')
            .select('name, created_at')
            .eq('guild_id', guildId.toString())
            .single()

          const guildName = guild?.name || `Guild #${guildId}`

          // Check if leader or member
          if (badge.badge_type === 'guild_leader' || badge.metadata?.role === 'leader') {
            badgeMetadata = generateGuildLeaderMetadata({
              tokenId,
              guildId,
              guildName,
              founderAddress: badge.metadata?.founder_address || '',
              memberCount: badge.metadata?.member_count || 0,
              createdAt: guild?.created_at ? new Date(guild.created_at).getTime() : Date.now(),
            })
          } else {
            badgeMetadata = generateGuildMemberMetadata({
              tokenId,
              guildId,
              guildName,
              memberAddress: badge.metadata?.wallet_address || '',
              joinedAt: badge.assigned_at ? new Date(badge.assigned_at).getTime() : Date.now(),
            })
          }
        } else if (badge.category === 'quest') {
          // Quest completion badge
          const questId = badge.metadata?.quest_id || 0

          badgeMetadata = generateQuestBadgeMetadata({
            tokenId,
            questId,
            questName: badge.metadata?.quest_name || `Quest #${questId}`,
            questCategory: badge.metadata?.quest_category || 'General',
            completedBy: badge.metadata?.wallet_address || '',
            completedAt: badge.assigned_at ? new Date(badge.assigned_at).getTime() : Date.now(),
            reward: badge.metadata?.reward || 100,
          })
        } else {
          // Generic achievement badge
          badgeMetadata = generateAchievementBadgeMetadata({
            tokenId,
            name: badge.badge_type || 'Gmeow Badge',
            description: badge.metadata?.description || `Badge earned on Gmeowbased Adventure: ${badge.badge_type}`,
            earnedAt: badge.assigned_at ? new Date(badge.assigned_at).getTime() : Date.now(),
            attributes: [
              {
                trait_type: 'Tier',
                value: badge.tier || 'common',
              },
              {
                trait_type: 'Category',
                value: badge.category || 'achievement',
              },
            ],
          })
        }

        return badgeMetadata
      },
      { ttl: 3600 } // 1 hour cache - metadata rarely changes
    )

    // Return metadata with cache headers
    return NextResponse.json(metadata, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Badge metadata error:', error)

    if (error instanceof Error && error.message === 'Token does not exist') {
      return NextResponse.json(
        { error: 'Token does not exist' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
