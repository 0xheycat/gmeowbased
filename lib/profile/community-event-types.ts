// @edit-start 2025-02-14 — Shared community event types
import type { ChainKey } from '@/lib/contracts/gmeow-utils'

export const COMMUNITY_EVENT_TYPES = [
  'gm',
  'quest-verify',
  'quest-create',
  'tip',
  'stats-query',
  'stake',
  'unstake',
] as const

export type CommunityEventType = (typeof COMMUNITY_EVENT_TYPES)[number]

export type CommunityEventActor = {
  fid: number | null
  username: string | null
  displayName: string | null
  walletAddress: `0x${string}` | string | null
}

export type CommunityEventCta = {
  label: string
  href: string
}

export type CommunityEventSummary = {
  id: string
  eventType: CommunityEventType
  headline: string
  context: string | null
  emphasis: 'positive' | 'neutral' | 'negative'
  createdAt: string
  cursor: string
  chain: ChainKey | null
  questId: number | null
  delta: number | null
  totalPoints: number | null
  previousTotal: number | null
  level: number | null
  tierName: string | null
  tierPercent: number | null
  actor: CommunityEventActor
  metadata: Record<string, unknown> | null
  cta: CommunityEventCta | null
}
// @edit-end
