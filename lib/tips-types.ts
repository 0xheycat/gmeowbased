import type {
  TipMentionKind,
  TipScoringConfig,
  TipScoringOutcome,
  TipScoringOutcomeReason,
} from './tips-scoring'

export type TipEventKind = 'tip' | 'mention' | 'activity'

export type TipBroadcast = {
  id: string
  kind?: TipEventKind
  chain?: string
  toAddress?: string
  toFid?: number
  toUsername?: string
  toDisplay?: string
  toAvatarUrl?: string
  fromAddress?: string
  fromFid?: number
  fromUsername?: string
  fromDisplay?: string
  fromAvatarUrl?: string
  amount?: number
  symbol?: string
  usdValue?: number
  points?: number
  message?: string
  txHash?: string
  castHash?: string
  frameUrl?: string
  shareText?: string
  scoring?: TipScoringOutcome
  mentionType?: TipMentionKind
  mentionIntensity?: number
  mentionActorId?: string
  mentionActorLabel?: string
  mentionSource?: string
  mentionSuppressed?: boolean
  mentionReason?: TipScoringOutcomeReason
  createdAt: number
}

type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

export type MutableTipBroadcast = Mutable<TipBroadcast>

export interface TipMentionScoreboardEntry {
  actorId: string
  actorLabel: string
  points24h: number
  awards24h: number
  mentions24h: number
  suppressed24h: number
  lastAwardAt: number | null
  lastMentionAt: number | null
  nextEligibleAt: number | null
  lastReason?: TipScoringOutcomeReason
}

export interface TipMentionRecentEvent {
  id: string
  timestamp: number
  type: TipMentionKind
  actorId: string
  actorLabel: string
  points: number
  suppressed: boolean
  reason: TipScoringOutcomeReason
  multiplier: number
  message?: string
  source?: string
  nextEligibleAt: number | null
}

export interface TipMentionSummary {
  generatedAt: number
  totals: {
    mentions24h: number
    awarded24h: number
    suppressed24h: number
    points24h: number
  }
  limits: {
    mentionCooldownMinutes: number
    actorCooldownMinutes: number
    actorDailyCap: number
    globalDailyCap: number
    globalCapRemaining: number | null
    nextGlobalEligibleAt: number | null
    globalCapResetsAt: number | null
  }
  topActors: TipMentionScoreboardEntry[]
  recent: TipMentionRecentEvent[]
  config: TipScoringConfig
}

export interface TipMentionContext {
  type?: string | TipMentionKind | null
  intensity?: number | null
  actorId?: string | number | null
  actorLabel?: string | null
  source?: string | null
}
