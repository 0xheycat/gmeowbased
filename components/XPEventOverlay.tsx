'use client'

import { useEffect } from 'react'
import { ProgressXP } from '@/components/ProgressXP'
import type { ChainKey } from '@/lib/gm-utils'
import { calculateRankProgress, type RankProgress } from '@/lib/rank'

export type XpEventKind =
  | 'gm'
  | 'stake'
  | 'unstake'
  | 'quest-create'
  | 'quest-verify'
  | 'onchainstats'
  | 'profile'
  | 'guild'
  | 'referral'
  | 'tip'

type EventCopy = {
  headline: string
  shareLabel?: string
  visitLabel?: string
  tierTagline?: string
  icon?: string
}

const EVENT_COPY: Record<XpEventKind, EventCopy> = {
  gm: {
    headline: 'Daily GM locked in',
    shareLabel: 'Share GM victory',
    visitLabel: 'Stay on dashboard',
    tierTagline: 'Keep the streak rolling.',
    icon: '☀️',
  },
  stake: {
    headline: 'Stake locked in',
    shareLabel: 'Share staking highlight',
    visitLabel: 'Manage badges',
    tierTagline: 'Your badge arsenal just powered up.',
    icon: '🛡️',
  },
  unstake: {
    headline: 'Stake released',
    shareLabel: 'Share points update',
    visitLabel: 'Manage badges',
    tierTagline: 'Points returned to your wallet.',
    icon: '♻️',
  },
  'quest-create': {
    headline: 'Quest ready to launch',
    shareLabel: 'Announce quest frame',
    visitLabel: 'View quest',
    tierTagline: 'Rally hunters and spread the word.',
    icon: '🧠',
  },
  'quest-verify': {
    headline: 'Quest completed',
    shareLabel: 'Share XP milestone',
    visitLabel: 'View quest',
    tierTagline: 'Flex the XP you just banked.',
    icon: '🚀',
  },
  onchainstats: {
    headline: 'Onchain stats shared',
    shareLabel: 'Share onchain spotlight',
    visitLabel: 'Open explorer',
    tierTagline: 'Numbers that back the flex.',
    icon: '📊',
  },
  profile: {
    headline: 'Profile level up',
    shareLabel: 'Share profile glow-up',
    visitLabel: 'View profile',
    tierTagline: 'Show the work behind your persona.',
    icon: '🌟',
  },
  guild: {
    headline: 'Guild milestone reached',
    shareLabel: 'Celebrate with the guild',
    visitLabel: 'Open guild hub',
    tierTagline: 'Your squad just leveled together.',
    icon: '🏰',
  },
  referral: {
    headline: 'Referral claimed',
    shareLabel: 'Share invite link',
    visitLabel: 'Manage referrals',
    tierTagline: 'Keep the momentum with new recruits.',
    icon: '💌',
  },
  tip: {
    headline: 'Tip received',
    shareLabel: 'Thank your tipper',
    visitLabel: 'View receipt',
    tierTagline: 'Show appreciation for the support.',
    icon: '💸',
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
export function XPEventOverlay({ open, payload, onClose }: XPEventOverlayProps) {
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
  const tierTagline = payload.tierTagline ?? copy.tierTagline ?? progress.currentTier.tagline
  const shareLabel = payload.shareLabel ?? copy.shareLabel
  const visitLabel = payload.visitLabel ?? copy.visitLabel
  const headline = payload.headline ?? copy.headline
  const shareUrl = payload.shareUrl
  const eventIcon = payload.eventIcon ?? copy.icon

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
      visitUrl={payload.visitUrl}
      onVisit={payload.onVisit}
      shareLabel={shareLabel}
      visitLabel={visitLabel}
      headline={headline}
      eventIcon={eventIcon}
    />
  )
}
// @edit-end
