/**
 * Frame System Types
 * Shared type definitions for Farcaster Frame handlers
 */

import type { NormalizedQuest, ChainKey } from '@/lib/contracts/gmeow-utils'

export type FrameType =
  | 'quest'
  | 'guild'
  | 'points'
  | 'referral'
  | 'leaderboards'
  | 'gm'
  | 'verify'
  | 'onchainstats'
  | 'badge'
  | 'nft'
  | 'badgecollection'
  | 'generic'

export type TraceItem = {
  ts: number
  step: string
  info?: any
}

export type Trace = TraceItem[]

export type FrameRequest = {
  type?: FrameType
  id?: string
  chain?: string
  questId?: string | number
  fid?: number | string
  user?: string
  json?: boolean | string | number
  debug?: boolean | string | number
  action?: string
  mode?: string
  season?: string
  limit?: string | number
  top?: string | number
  size?: string | number
  global?: boolean | string | number
  [k: string]: any
}

export type FrameHandlerContext = {
  req: Request
  url: URL
  params: FrameRequest
  traces: Trace
  debugPayload?: Trace
  origin: string
  defaultFrameImage: string
  asJson: boolean
}

export type FrameHandler = (ctx: FrameHandlerContext) => Promise<Response>

// Quest types
export type QuestFetchSuccess = {
  ok: true
  quest: NormalizedQuest
  raw: unknown
  traces: Trace
}

export type QuestFetchError = {
  ok: false
  error: string
  traces: Trace
}

export type QuestFetchResult = QuestFetchSuccess | QuestFetchError

// User stats types
export type UserStats = {
  available: bigint
  locked: bigint
  total: bigint
}

export type UserStatsSuccess = {
  ok: true
  stats: UserStats
  raw: unknown
  traces: Trace
}

export type UserStatsError = {
  ok: false
  error: string
  traces: Trace
}

export type UserStatsResult = UserStatsSuccess | UserStatsError

// Referral cache
export type ReferralCacheEntry = {
  code: string | null
  at: number
}

// Leaderboard types
export type FrameLeaderboardEntry = {
  rank: number
  address: `0x${string}`
  name: string
  pfpUrl: string
  /** 
   * Chain identifier for viewing stats across multiple chains.
   * Note: Only 'base' has active contracts. Other chains are VIEW-ONLY via Blockscout MCP.
   * @see lib/gmeow-utils.ts ChainKey documentation
   */
  chain: ChainKey
  points: number
  completed: number
  rewards: number
  farcasterFid: number
}

// Data source types for hybrid architecture
export type DataSource = 'subsquid' | 'supabase' | 'blockchain' | 'cache'

export type HybridDataResult<T> = {
  data: T
  source: DataSource
  cached: boolean
  timestamp: number
  traces?: Trace
}
