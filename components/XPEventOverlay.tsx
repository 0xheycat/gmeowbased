'use client'

/**
 * XP Event Overlay - Mobile-First Celebration Modal
 * Reuses logic from old foundation (accessibility, animations, event handling)
 * Uses Tailwick v2.0 + Gmeowbased v0.1 for modern UI/UX
 * 
 * Features:
 * - Mobile-first responsive design
 * - Smooth animations with reduced-motion support
 * - Keyboard navigation & focus trap
 * - Rich typography & Gmeowbased icons
 * - Chain-specific displays
 */

import { useEffect } from 'react'
import { ProgressXP } from './ProgressXP'
import type { ChainKey } from '@/lib/gmeow-utils'
import { calculateRankProgress, type RankProgress } from '@/lib/rank'

/**
 * Active event types (validated in API /api/telemetry/rank):
 * - quest-create, quest-claim, gm, tip, badge-mint, guild-join, referral, onboard, stats-query
 * 
 * Planned event types (for future use):
 * - nft-mint (upcoming)
 */
export type XpEventKind =
  | 'quest-create'   // Quest creation (wizard) - link to marketplace
  | 'quest-claim'    // Quest completion claim (quest page) - no visit link
  | 'gm'             // Daily GM (app/daily-gm) - auto-triggered
  | 'tip'            // Points tipped from Farcaster - no visit link, telemetry only
  | 'badge-mint'     // Badge earned & minted - share only
  | 'guild-join'     // Joined a guild - dynamic guild page link
  | 'referral'       // Used referral code - link to profile
  | 'onboard'        // Claimed onboarding bonus - from onboard page
  | 'stats-query'    // Stats shared (bot/dashboard) - no visit link
  | 'nft-mint'       // NFT minted (planned upcoming)

import type { QuestIconType } from './ui/QuestIcon'

type EventCopy = {
  headline: string
  shareLabel?: string
  visitLabel?: string
  tierTagline?: string
  iconType: QuestIconType  // Changed from emoji string to QuestIconType
  visitUrl?: string | null  // null = no visit button
}

const EVENT_COPY: Record<XpEventKind, EventCopy> = {
  // Active event types (9 types in production)
  'quest-create': {
    headline: 'Quest Created',
    shareLabel: 'Share Quest',
    visitLabel: 'View Marketplace',
    tierTagline: 'Rally the community!',
    iconType: 'quest_create',
    visitUrl: '/app/quest-marketplace',  // User decision: link to marketplace
  },
  'quest-claim': {
    headline: 'Quest Claimed',
    shareLabel: 'Share Victory',
    visitLabel: undefined,  // No visit button
    tierTagline: 'XP claimed successfully.',
    iconType: 'quest_claim',
    visitUrl: null,  // User decision: disable visitURL
  },
  gm: {
    headline: 'Daily GM Completed',
    shareLabel: 'Share GM Victory',
    visitLabel: 'View GM Streak',
    tierTagline: 'Keep the streak alive!',
    iconType: 'daily_gm',
    visitUrl: '/app/daily-gm',  // User decision: app/daily-gm
  },
  tip: {
    headline: 'Points Received',
    shareLabel: 'Share Thanks',
    visitLabel: undefined,  // No visit button
    tierTagline: 'Generosity rewarded.',
    iconType: 'tip_received',
    visitUrl: null,  // User decision: disable visitURL, telemetry only
  },
  'badge-mint': {
    headline: 'Badge Earned',
    shareLabel: 'Share Badge',
    visitLabel: undefined,  // No visit button (share only)
    tierTagline: 'Achievement unlocked!',
    iconType: 'badge_mint',
    visitUrl: null,  // User decision: badges for sharing/flexing only
  },
  'guild-join': {
    headline: 'Guild Joined',
    shareLabel: 'Share Milestone',
    visitLabel: 'View Guild',
    tierTagline: 'Welcome to the team!',
    iconType: 'guild_join',
    visitUrl: undefined,  // Dynamic: /app/guilds/{guildName} set by caller
  },
  referral: {
    headline: 'Referral Success',
    shareLabel: 'Share Invite',
    visitLabel: 'View Profile',
    tierTagline: 'Network expanding.',
    iconType: 'referral_success',
    visitUrl: '/app/profile',  // User decision: link to profile page
  },
  onboard: {
    headline: 'Welcome Bonus',
    shareLabel: 'Share Journey',
    visitLabel: undefined,  // No visit (already on onboard page)
    tierTagline: 'Your adventure begins!',
    iconType: 'onboard_bonus',
    visitUrl: null,  // User decision: from onboard page, no need to link back
  },
  'stats-query': {
    headline: 'Stats Shared',
    shareLabel: 'Share Stats',
    visitLabel: undefined,  // No visit button
    tierTagline: 'Your on-chain story.',
    iconType: 'stats_shared',
    visitUrl: null,  // User decision: disable visitURL (bot/automation)
  },
  
  // Planned event types (1 type upcoming)
  'nft-mint': {
    headline: 'NFT Minted',
    shareLabel: 'Share NFT',
    visitLabel: 'View Collection',
    tierTagline: 'Digital treasure secured.',
    iconType: 'nft_mint',
    visitUrl: undefined,  // Will be implemented later
  },
}

export type XpEventPayload = {
  event: XpEventKind
  chainKey: ChainKey
  xpEarned: number
  totalPoints: number
  progress?: RankProgress | null
  shareUrl?: string
  onShare?: () => void
  shareLabel?: string
  visitUrl?: string | null  // null = no visit button
  onVisit?: () => void
  visitLabel?: string
  headline?: string
  tierTagline?: string
  // Tip event context (for rich notification)
  tipContext?: {
    donorUsername: string   // @username who sent the tip
    tipAmount: number       // Amount tipped
    message?: string        // Optional tip message
  }
  // Guild event context (for dynamic guild page)
  guildContext?: {
    guildName: string       // Name of guild for dynamic URL
    guildId?: string        // Optional guild ID
  }
}

type XPEventOverlayProps = {
  open: boolean
  payload: XpEventPayload | null
  onClose: () => void
}

/**
 * XP Event Overlay - Wrapper for ProgressXP with event-specific data
 * Handles zero-delta guard and event type mapping
 */
export function XPEventOverlay({ open, payload, onClose }: XPEventOverlayProps) {
  // Zero-delta guard: Auto-close if no XP earned
  useEffect(() => {
    if (!open || !payload) return
    const xpEarnedRaw = Number(payload.xpEarned)
    if (!Number.isFinite(xpEarnedRaw) || xpEarnedRaw <= 0) {
      onClose()
    }
  }, [open, payload, onClose])

  if (!open || !payload) return null

  const xpEarnedRaw = Number(payload.xpEarned)
  const totalPointsRaw = Number(payload.totalPoints)
  const hasPositiveDelta = Number.isFinite(xpEarnedRaw) && xpEarnedRaw > 0
  
  if (!hasPositiveDelta) return null

  const xpEarned = Math.max(0, Math.round(xpEarnedRaw))
  const totalPoints = Number.isFinite(totalPointsRaw) ? Math.max(0, Math.round(totalPointsRaw)) : 0

  const progress = payload.progress ?? calculateRankProgress(totalPoints)
  const copy = EVENT_COPY[payload.event] ?? EVENT_COPY.gm

  const tierName = progress.currentTier.name
  let tierTagline = payload.tierTagline ?? copy.tierTagline ?? progress.currentTier.tagline  // Changed to let
  const shareLabel = payload.shareLabel ?? copy.shareLabel
  const visitLabel = payload.visitLabel ?? copy.visitLabel
  const shareUrl = payload.shareUrl
  const eventIconType = copy.iconType  // Get QuestIconType from event copy
  
  // Handle dynamic visitUrl based on event context
  let finalVisitUrl = payload.visitUrl ?? copy.visitUrl ?? null
  
  // Guild event: Dynamic guild page URL
  if (payload.event === 'guild-join' && payload.guildContext?.guildName) {
    const guildSlug = payload.guildContext.guildName.toLowerCase().replace(/\s+/g, '-')
    finalVisitUrl = `/app/guilds/${guildSlug}`
  }
  
  // Tip event: Enhanced headline with donor info
  let headline = payload.headline ?? copy.headline
  if (payload.event === 'tip' && payload.tipContext?.donorUsername) {
    const tipAmount = payload.tipContext.tipAmount || xpEarned
    headline = `Tipped by @${payload.tipContext.donorUsername}`
    // Optional: Enhanced tierTagline with tip amount
    if (!payload.tierTagline && tipAmount > 0) {
      const formattedAmount = tipAmount.toLocaleString()
      tierTagline = `+${formattedAmount} points received!`
    }
  }

  return (
    <ProgressXP
      open={open}
      onClose={onClose}
      chainKey={payload.chainKey}
      xpEarned={xpEarned}
      totalPoints={totalPoints}
      level={progress.level}
      xpIntoLevel={progress.xpIntoLevel}
      xpForLevel={progress.xpForLevel}
      tierName={tierName}
      tierTagline={tierTagline}
      shareUrl={shareUrl}
      onShare={payload.onShare}
      visitUrl={finalVisitUrl}  // Use merged visitUrl with dynamic logic
      onVisit={payload.onVisit}
      shareLabel={shareLabel}
      visitLabel={visitLabel}
      headline={headline}
      eventIconType={eventIconType}  // Pass QuestIconType instead of emoji
    />
  )
}
