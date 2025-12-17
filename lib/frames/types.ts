/**
 * @file lib/frames/types.ts
 * @description Shared type definitions for Farcaster frame system
 * 
 * PHASE: Phase 7.3 - Frames (December 17, 2025)
 * ENHANCED: Existing documentation upgraded with comprehensive Phase 7 header
 * 
 * FEATURES:
 *   - 12 frame type definitions (quest, guild, points, referral, etc.)
 *   - FrameRequest type for handler inputs
 *   - HybridDataResult for data fetching
 *   - Trace types for performance monitoring
 *   - LeaderboardEntry for ranking displays
 *   - Type-safe frame parameter handling
 * 
 * REFERENCE DOCUMENTATION:
 *   - Frame handlers: lib/frames/handlers/
 *   - Hybrid data: lib/frames/hybrid-data.ts
 *   - Chain types: lib/contracts/gmeow-utils.ts
 * 
 * REQUIREMENTS:
 *   - All frame types must have handlers
 *   - Types must be exported for external use
 *   - Breaking changes require version bump
 *   - All types must be documented
 * 
 * TODO:
 *   - [ ] Add frame type validation schemas
 *   - [ ] Add runtime type checking
 *   - [ ] Add type versioning for migrations
 *   - [ ] Add type generation from frame handlers
 *   - [ ] Add type documentation generator
 * 
 * CRITICAL:
 *   - Frame types must match handler implementations
 *   - All optional fields must have defaults
 *   - Breaking type changes require careful migration
 *   - Types must be kept in sync with Farcaster spec
 * 
 * SUGGESTIONS:
 *   - Generate types from OpenAPI schema
 *   - Add type validation tests
 *   - Add type compatibility matrix
 *   - Document type evolution over time
 * 
 * AVOID:
 *   - Adding types without corresponding handlers
 *   - Breaking changes to exported types
 *   - Using 'any' type (use 'unknown' instead)
 *   - Mixing concerns in type definitions
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
