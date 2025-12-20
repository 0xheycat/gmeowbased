/**
 * XP Event Overlay - Event-Driven XP Celebration Trigger
 * 
 * TODO:
 * - [ ] Add event-specific animations variants
 * - [ ] Add sound effect integration (optional)
 * - [ ] Add celebration intensity levels (subtle vs epic)
 * - [x] Add celebration cooldown system (completed - 30s per event type)
 * 
 * FEATURES:
 * - 15 XP event types with custom copy (gm, stake, quest, guild, referral, badge, tip)
 * - Automatic rank progress calculation
 * - Zero-delta guard (prevents showing modal for 0 XP)
 * - Event-specific SVG icons (professional gaming aesthetic)
 * - Integration with XPCelebrationModal (compact 400px modal)
 * 
 * PHASE: Phase 2 - Integration (Week 2)
 * DATE: December 14, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - docs/XP-SYSTEM-COMPREHENSIVE-GUIDE-PART-1.md (Integration Points section)
 * - docs/XP-SYSTEM-COMPREHENSIVE-GUIDE-PART-2.md (XPEventOverlay Refactor section)
 * - components/xp-celebration/README.md (XPCelebrationModal usage)
 * 
 * SUGGESTIONS:
 * - [ ] Add event history tracking (last 5 celebrations)
 * - [ ] Add "Don't show again today" option
 * - [x] Add celebration cooldown (completed - 30s per event type prevents spam)
 * 
 * CRITICAL:
 * - MUST validate xpEarned > 0 before showing modal
 * - Rank progress calculation must use calculateRankProgress
 * - Event icons MUST be SVG components from @/components/icons/events
 * 
 * REQUIREMENTS (farcaster.instructions.md):
 * - Base network: Chain ID 8453
 * - Website: https://gmeowhq.art
 * - TypeScript strict mode: No `any` types
 * 
 * AVOID:
 * - Showing modal for zero XP delta
 * - Blocking UI with fullscreen modal (use compact modal)
 * - Missing event types in EVENT_COPY mapping
 * - Using emoji icons (use SVG from components/icons/events)
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 */

'use client'

import { useEffect, useRef } from 'react'
import { XPCelebrationModal } from '@/components/xp-celebration'
import type { ChainKey } from '@/lib/contracts/gmeow-utils'
import { calculateRankProgress, type RankProgress } from '@/lib/scoring/unified-calculator'
import type { TierCategory } from '@/components/xp-celebration/types'
import {
  GmIcon,
  QuestIcon,
  GuildIcon,
  BadgeIcon,
  ReferralIcon,
  StatsIcon,
  ProfileIcon,
  TipIcon,
  TaskIcon,
  BrainIcon,
  ShieldIcon,
} from '@/components/icons/events'

/**
 * Celebration Cooldown Configuration
 * Prevents spam celebrations for same event type
 */
const CELEBRATION_COOLDOWN_MS = 30000 // 30 seconds per event type

export type XpEventKind =
  | 'gm'
  | 'stake'
  | 'unstake'
  | 'quest-create'
  | 'quest-verify'
  | 'task-complete'
  | 'onchainstats'
  | 'profile'
  | 'guild'
  | 'guild-join'
  | 'referral'
  | 'referral-create'
  | 'referral-register'
  | 'badge-claim'
  | 'tip'

type EventCopy = {
  headline: string
  shareLabel?: string
  visitLabel?: string
  tierTagline?: string
  icon: React.ReactNode
}

const EVENT_COPY: Record<XpEventKind, EventCopy> = {
  gm: {
    headline: 'Daily GM locked in',
    shareLabel: 'Share GM victory',
    visitLabel: 'Stay on dashboard',
    tierTagline: 'Keep the streak rolling.',
    icon: <GmIcon className="w-10 h-10" />,
  },
  stake: {
    headline: 'Stake locked in',
    shareLabel: 'Share staking highlight',
    visitLabel: 'Manage badges',
    tierTagline: 'Your badge arsenal just powered up.',
    icon: <ShieldIcon className="w-10 h-10" />,
  },
  unstake: {
    headline: 'Stake released',
    shareLabel: 'Share points update',
    visitLabel: 'Manage badges',
    tierTagline: 'Points returned to your wallet.',
    icon: <ShieldIcon className="w-10 h-10" style={{ opacity: 0.6 }} />,
  },
  'quest-create': {
    headline: 'Quest ready to launch',
    shareLabel: 'Announce quest frame',
    visitLabel: 'View quest',
    tierTagline: 'Rally hunters and spread the word.',
    icon: <BrainIcon className="w-10 h-10" />,
  },
  'quest-verify': {
    headline: 'Quest completed',
    shareLabel: 'Share XP milestone',
    visitLabel: 'View quest',
    tierTagline: 'Flex the XP you just banked.',
    icon: <QuestIcon className="w-10 h-10" />,
  },
  onchainstats: {
    headline: 'Onchain stats shared',
    shareLabel: 'Share onchain spotlight',
    visitLabel: 'Open explorer',
    tierTagline: 'Numbers that back the flex.',
    icon: <StatsIcon className="w-10 h-10" />,
  },
  profile: {
    headline: 'Profile level up',
    shareLabel: 'Share profile glow-up',
    visitLabel: 'View profile',
    tierTagline: 'Show the work behind your persona.',
    icon: <ProfileIcon className="w-10 h-10" />,
  },
  guild: {
    headline: 'Guild milestone reached',
    shareLabel: 'Celebrate with the guild',
    visitLabel: 'Open guild hub',
    tierTagline: 'Your squad just leveled together.',
    icon: <GuildIcon className="w-10 h-10" />,
  },
  referral: {
    headline: 'Referral claimed',
    shareLabel: 'Share invite link',
    visitLabel: 'Manage referrals',
    tierTagline: 'Keep the momentum with new recruits.',
    icon: <ReferralIcon className="w-10 h-10" />,
  },
  'referral-create': {
    headline: 'Referral code created',
    shareLabel: 'Share referral link',
    visitLabel: 'Track referrals',
    tierTagline: 'Start building your network.',
    icon: <ReferralIcon className="w-10 h-10" style={{ opacity: 0.8 }} />,
  },
  'referral-register': {
    headline: 'Referral registered',
    shareLabel: 'Thank your referrer',
    visitLabel: 'View rewards',
    tierTagline: 'Welcome bonus unlocked.',
    icon: <ReferralIcon className="w-10 h-10" style={{ filter: 'hue-rotate(45deg)' }} />,
  },
  'badge-claim': {
    headline: 'Badge claimed',
    shareLabel: 'Show off your badge',
    visitLabel: 'View collection',
    tierTagline: 'Add it to your showcase.',
    icon: <BadgeIcon className="w-10 h-10" />,
  },
  'task-complete': {
    headline: 'Task completed',
    shareLabel: 'Share progress',
    visitLabel: 'Continue quest',
    tierTagline: 'One step closer to the goal.',
    icon: <TaskIcon className="w-10 h-10" />,
  },
  'guild-join': {
    headline: 'Guild joined',
    shareLabel: 'Announce membership',
    visitLabel: 'Meet your guild',
    tierTagline: 'Welcome to the squad.',
    icon: <GuildIcon className="w-10 h-10" style={{ filter: 'brightness(1.2)' }} />,
  },
  tip: {
    headline: 'Tip received',
    shareLabel: 'Thank your tipper',
    visitLabel: 'View receipt',
    tierTagline: 'Show appreciation for the support.',
    icon: <TipIcon className="w-10 h-10" />,
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
  visitUrl?: string
  onVisit?: () => void
  visitLabel?: string
  headline?: string
  tierTagline?: string
  eventIcon?: string
}

type XPEventOverlayProps = {
  open: boolean
  payload: XpEventPayload | null
  onClose: () => void
}

// @edit-start 2025-11-11 — XP overlay accessibility + zero-delta guard
// @edit-update 2025-12-14 — Added celebration cooldown system (30s per event type)
export function XPEventOverlay({ open, payload, onClose }: XPEventOverlayProps) {
  // Cooldown tracking: Map<eventType, lastTimestamp>
  const cooldownMapRef = useRef<Map<XpEventKind, number>>(new Map())

  useEffect(() => {
    if (!open || !payload) return
    const xpEarnedRaw = Number(payload.xpEarned)
    if (!Number.isFinite(xpEarnedRaw) || xpEarnedRaw <= 0) {
      onClose()
      return
    }

    // Check cooldown for this event type
    const lastCelebration = cooldownMapRef.current.get(payload.event)
    const now = Date.now()
    
    if (lastCelebration && (now - lastCelebration) < CELEBRATION_COOLDOWN_MS) {
      // Still in cooldown, skip celebration
      console.log(`[XPEventOverlay] Celebration cooldown active for "${payload.event}" (${Math.ceil((CELEBRATION_COOLDOWN_MS - (now - lastCelebration)) / 1000)}s remaining)`)
      onClose()
      return
    }

    // Update cooldown timestamp
    cooldownMapRef.current.set(payload.event, now)
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
  const tierTagline = payload.tierTagline ?? copy.tierTagline ?? progress.currentTier.tagline
  const shareLabel = payload.shareLabel ?? copy.shareLabel
  const visitLabel = payload.visitLabel ?? copy.visitLabel
  const headline = payload.headline ?? copy.headline
  const shareUrl = payload.shareUrl
  const eventIcon = payload.eventIcon ?? copy.icon

  // Determine tier category from tier object
  const tierCategory: TierCategory = (progress.currentTier.tier as TierCategory) || 'beginner'

  // Generate OG image URL for sharing
  const ogImageUrl = shareUrl || `https://gmeowhq.art/api/og/xp-celebration?xp=${xpEarned}&tier=${encodeURIComponent(tierName)}&event=${payload.event}`

  return (
    <XPCelebrationModal
      open={open}
      onClose={onClose}
      event={payload.event}
      xpEarned={xpEarned}
      totalPoints={totalPoints}
      level={progress.level}
      xpIntoLevel={progress.xpIntoLevel}
      xpForLevel={progress.xpForLevel}
      tierName={tierName}
      tierTagline={tierTagline}
      tierCategory={tierCategory}
      chainKey={payload.chainKey}
      shareUrl={ogImageUrl}
      onShare={payload.onShare}
      visitUrl={payload.visitUrl}
      onVisit={payload.onVisit}
      eventIcon={eventIcon}
    />
  )
}
// @edit-end
