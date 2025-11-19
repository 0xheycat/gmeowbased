// Bot frame builder for embedding frames in cast replies
import { buildFrameShareUrl, type FrameShareInput } from '@/lib/share'
import type { ChainKey } from '@/lib/gm-utils'

export type BotFrameType = 
  | 'stats-summary'
  | 'quest-board'
  | 'leaderboards'
  | 'guild-invite'
  | 'profile-card'
  | 'daily-streak'

export type BotFrameOptions = {
  type: BotFrameType
  fid?: number
  username?: string
  chain?: ChainKey | 'all'
  questId?: string | number
  guildId?: string | number
  includeActions?: boolean
}

export type BotFrameEmbed = {
  url: string
  type: BotFrameType
  description: string
}

/**
 * Build a frame URL for bot cast replies based on user intent
 */
export function buildBotFrameEmbed(options: BotFrameOptions): BotFrameEmbed | null {
  const { type, fid, username, chain, questId, guildId } = options

  switch (type) {
    case 'stats-summary': {
      if (!fid && !username) return null
      
      const frameInput: FrameShareInput = {
        type: 'onchainstats',
        fid: fid || undefined,
        user: username || undefined,
        extra: {
          action: 'view-stats',
          embed: 'bot-reply'
        }
      }
      
      const url = buildFrameShareUrl(frameInput)
      if (!url) return null

      return {
        url,
        type: 'stats-summary',
        description: 'Your onchain stats dashboard with XP, streaks, and achievements'
      }
    }

    case 'quest-board': {
      const frameInput: FrameShareInput = {
        type: 'quest',
        chain: chain || 'all',
        questId: questId || undefined,
        fid: fid || undefined,
        extra: {
          action: 'browse-quests',
          embed: 'bot-reply'
        }
      }
      
      const url = buildFrameShareUrl(frameInput)
      if (!url) return null

      return {
        url,
        type: 'quest-board',
        description: 'Daily quests and challenges - complete to earn XP and climb the leaderboard'
      }
    }

    case 'leaderboards': {
      const frameInput: FrameShareInput = {
        type: 'leaderboards',
        chain: chain || 'all',
        fid: fid || undefined,
        extra: {
          action: 'view-rankings',
          embed: 'bot-reply'
        }
      }
      
      const url = buildFrameShareUrl(frameInput)
      if (!url) return null

      return {
        url,
        type: 'leaderboards',
        description: 'Top pilots ranked by XP, streaks, and achievements across all chains'
      }
    }

    case 'guild-invite': {
      const frameInput: FrameShareInput = {
        type: 'guild',
        id: guildId || undefined,
        chain: chain || undefined,
        fid: fid || undefined,
        extra: {
          action: 'join-guild',
          embed: 'bot-reply'
        }
      }
      
      const url = buildFrameShareUrl(frameInput)
      if (!url) return null

      return {
        url,
        type: 'guild-invite',
        description: 'Join guilds, team up with other pilots, and compete for guild rewards'
      }
    }

    case 'profile-card': {
      if (!fid && !username) return null
      
      const frameInput: FrameShareInput = {
        type: 'onchainstats',
        fid: fid || undefined,
        user: username || undefined,
        extra: {
          action: 'view-profile',
          embed: 'bot-reply',
          card: 'true'
        }
      }
      
      const url = buildFrameShareUrl(frameInput)
      if (!url) return null

      return {
        url,
        type: 'profile-card',
        description: 'Your pilot profile card - mint as NFT to showcase your achievements'
      }
    }

    case 'daily-streak': {
      if (!fid) return null
      
      const frameInput: FrameShareInput = {
        type: 'gm',
        chain: chain || 'base',
        fid: fid,
        extra: {
          action: 'claim-streak',
          embed: 'bot-reply'
        }
      }
      
      const url = buildFrameShareUrl(frameInput)
      if (!url) return null

      return {
        url,
        type: 'daily-streak',
        description: 'Claim your daily gm streak - keep it alive to maximize XP multipliers'
      }
    }

    default:
      return null
  }
}

/**
 * Determine which frame to embed based on detected intent
 */
export function selectFrameForIntent(
  intent: string,
  context: {
    fid?: number
    username?: string
    chain?: ChainKey | 'all'
    hasStats?: boolean
    hasStreak?: boolean
  }
): BotFrameEmbed | null {
  const { fid, username, chain, hasStats, hasStreak } = context

  // Map intents to frame types
  switch (intent) {
    case 'stats':
    case 'profile':
      return buildBotFrameEmbed({
        type: hasStats ? 'stats-summary' : 'profile-card',
        fid,
        username,
        chain: chain as ChainKey | 'all' | undefined
      })

    case 'quests':
    case 'quest-recommendations':
      return buildBotFrameEmbed({
        type: 'quest-board',
        fid,
        chain: chain as ChainKey | 'all' | undefined
      })

    case 'leaderboard':
    case 'rank':
      return buildBotFrameEmbed({
        type: 'leaderboards',
        fid,
        chain: chain as ChainKey | 'all' | undefined
      })

    case 'guild':
    case 'team':
      return buildBotFrameEmbed({
        type: 'guild-invite',
        fid,
        username
      })

    case 'streak':
    case 'gm':
      return buildBotFrameEmbed({
        type: hasStreak ? 'daily-streak' : 'stats-summary',
        fid,
        chain: (chain || 'base') as ChainKey
      })

    case 'help':
      // Default to quest board for help requests
      return buildBotFrameEmbed({
        type: 'quest-board',
        fid
      })

    default:
      return null
  }
}

/**
 * Format frame embed for Neynar cast API
 */
export function formatFrameEmbedForCast(embed: BotFrameEmbed | null): string[] {
  if (!embed) return []
  return [embed.url]
}
