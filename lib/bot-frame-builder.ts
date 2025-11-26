// Bot frame builder for embedding frames in cast replies
import { buildFrameShareUrl, type FrameShareInput } from '@/lib/share'
import type { ChainKey } from '@/lib/gm-utils'

/**
 * Available frame routes in app/frame/
 * - /frame/leaderboard - Leaderboard view (no ID required)
 * - /frame/quest/[questId] - Specific quest details (requires questId)
 * - /frame/badge/[fid] - User badge display (requires fid)
 * - /frame/stats/[fid] - User stats display (requires fid)
 */
export type AvailableFrameRoute = 
  | 'leaderboard'  // /frame/leaderboard
  | 'quest'        // /frame/quest/[questId]
  | 'badge'        // /frame/badge/[fid]
  | 'stats'        // /frame/stats/[fid]

export type BotFrameType = 
  | 'stats-summary'      // → /frame/stats/[fid]
  | 'quest-specific'     // → /frame/quest/[questId]
  | 'quest-board'        // → /frame/leaderboard (browse all)
  | 'leaderboards'       // → /frame/leaderboard
  | 'guild-invite'       // → /api/frame (not yet migrated)
  | 'profile-card'       // → /frame/stats/[fid]
  | 'badge-showcase'     // → /frame/badge/[fid]
  | 'daily-streak'       // → /api/frame (gm type)

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
 * Smart frame route detection - automatically maps frame types to available routes
 * Checks if required parameters are present and falls back to appropriate alternatives
 */
function detectBestFrameRoute(options: {
  type: BotFrameType
  fid?: number
  questId?: string | number
  guildId?: string | number
}): FrameShareInput | null {
  const { type, fid, questId, guildId } = options

  switch (type) {
    // Stats-related frames → /frame/stats/[fid]
    case 'stats-summary':
    case 'profile-card':
      if (!fid) return null
      return { type: 'onchainstats', fid }

    // Badge frame → /frame/badge/[fid]
    case 'badge-showcase':
      if (!fid) return null
      return { type: 'badge', fid }

    // Quest-specific → /frame/quest/[questId]
    case 'quest-specific':
      if (!questId) {
        // Fall back to leaderboard which has Quest navigation
        return { type: 'leaderboards' }
      }
      return { type: 'quest', questId }

    // Quest browsing → /frame/leaderboard (has Quest page access)
    case 'quest-board':
      return { type: 'leaderboards' }

    // Leaderboard → /frame/leaderboard
    case 'leaderboards':
      return { type: 'leaderboards' }

    // Guild (not yet migrated) → /api/frame?type=guild
    case 'guild-invite':
      return { type: 'guild', id: guildId }

    // GM/Streak (not yet migrated) → /api/frame?type=gm
    case 'daily-streak':
      return { type: 'gm' }

    default:
      return null
  }
}

/**
 * Build a frame URL for bot cast replies based on user intent
 */
export function buildBotFrameEmbed(options: BotFrameOptions): BotFrameEmbed | null {
  const { type, fid, username, chain, questId, guildId } = options

  // 🎯 SMART ROUTE DETECTION - Automatically select best available route
  const frameInput = detectBestFrameRoute({ type, fid, questId, guildId })
  if (!frameInput) return null

  // Add common parameters
  if (chain) frameInput.chain = chain as ChainKey
  if (fid && !frameInput.fid) frameInput.fid = fid
  if (username) frameInput.user = username

  // Add action metadata for analytics
  frameInput.extra = {
    ...frameInput.extra,
    embed: 'bot-reply',
    action: getActionName(type),
  }

  const url = buildFrameShareUrl(frameInput)
  if (!url) return null

  return {
    url,
    type,
    description: getFrameDescription(type),
  }
}

/**
 * Get action name for analytics tracking
 */
function getActionName(type: BotFrameType): string {
  switch (type) {
    case 'stats-summary': return 'view-stats'
    case 'quest-specific': return 'view-quest'
    case 'quest-board': return 'browse-quests'
    case 'leaderboards': return 'view-rankings'
    case 'guild-invite': return 'join-guild'
    case 'profile-card': return 'view-profile'
    case 'badge-showcase': return 'view-badge'
    case 'daily-streak': return 'claim-streak'
    default: return 'view-frame'
  }
}

/**
 * Get frame description for embed
 */
function getFrameDescription(type: BotFrameType): string {
  switch (type) {
    case 'stats-summary':
      return 'Your onchain stats dashboard with XP, streaks, and achievements'
    case 'quest-specific':
      return 'Quest details, requirements, and rewards - complete to earn XP'
    case 'quest-board':
      return 'Daily quests and challenges - complete to earn XP and climb the leaderboard'
    case 'leaderboards':
      return 'Top pilots ranked by XP, streaks, and achievements across all chains'
    case 'guild-invite':
      return 'Join guilds, team up with other pilots, and compete for guild rewards'
    case 'profile-card':
      return 'Your pilot profile card - mint as NFT to showcase your achievements'
    case 'badge-showcase':
      return 'Your achievement badges - mint and share your accomplishments'
    case 'daily-streak':
      return 'Claim your daily gm streak - keep it alive to maximize XP multipliers'
    default:
      return 'Gmeowbased frame'
  }
}

/**
 * Determine which frame to embed based on detected intent
 * Smart routing: automatically detects best available frame route
 */
export function selectFrameForIntent(
  intent: string,
  context: {
    fid?: number
    username?: string
    chain?: ChainKey | 'all'
    questId?: string | number
    hasStats?: boolean
    hasStreak?: boolean
    hasBadge?: boolean
  }
): BotFrameEmbed | null {
  const { fid, username, chain, questId, hasStats, hasStreak, hasBadge } = context

  // Map intents to frame types with smart fallbacks
  switch (intent) {
    case 'stats':
    case 'profile':
      return buildBotFrameEmbed({
        type: hasStats ? 'stats-summary' : 'profile-card',
        fid,
        username,
        chain: chain as ChainKey | 'all' | undefined
      })

    case 'badge':
    case 'achievement':
      // Prefer badge frame if user has badges, otherwise stats
      return buildBotFrameEmbed({
        type: hasBadge ? 'badge-showcase' : 'stats-summary',
        fid,
        chain: chain as ChainKey | 'all' | undefined
      })

    case 'quests':
    case 'quest-recommendations':
      // If specific questId provided, show quest details
      if (questId) {
        return buildBotFrameEmbed({
          type: 'quest-specific',
          questId,
          fid,
          chain: chain as ChainKey | 'all' | undefined
        })
      }
      // Otherwise show quest board (via leaderboard)
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
      // Prefer stats frame over GM frame for better user experience
      return buildBotFrameEmbed({
        type: hasStreak ? 'stats-summary' : 'daily-streak',
        fid,
        chain: (chain || 'base') as ChainKey
      })

    case 'help':
      // Default to leaderboard for help requests (shows app overview)
      return buildBotFrameEmbed({
        type: 'leaderboards',
        fid
      })

    default:
      // Unknown intent - show stats if fid available, otherwise leaderboard
      if (fid) {
        return buildBotFrameEmbed({
          type: 'stats-summary',
          fid,
          chain: chain as ChainKey | 'all' | undefined
        })
      }
      return buildBotFrameEmbed({
        type: 'leaderboards'
      })
  }
}

/**
 * Format frame embed for Neynar cast API
 */
export function formatFrameEmbedForCast(embed: BotFrameEmbed | null): string[] {
  if (!embed) return []
  return [embed.url]
}
