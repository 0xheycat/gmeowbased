/**
 * @file lib/bot/analytics/stats.ts
 * @description User stats aggregation across chains for bot responses
 * 
 * PHASE: Phase 7.2 - Bot (December 17, 2025)
 * 
 * FEATURES:
 *   - Multi-chain stats aggregation
 *   - Level and tier calculations
 *   - Tip tracking (7d, 14d, 21d, all-time)
 *   - Rank progress computation
 *   - Primary chain detection
 *   - Type-safe stats structure
 * 
 * REFERENCE DOCUMENTATION:
 *   - Profile data: lib/profile/profile-data.ts
 *   - Rank calculations: lib/leaderboard/rank.ts
 *   - Chain snapshots: Supabase gmeow_rank_snapshot table
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Multi-chain (Base primary)
 *   - Stats must be accurate within 5 minutes
 *   - All chains must be queried in parallel (<200ms target)
 * 
 * TODO:
 *   - [ ] Add stats caching per user (5min TTL)
 *   - [ ] Add stats change detection (delta from last query)
 *   - [ ] Add historical stats tracking (trends)
 *   - [ ] Add stats comparison (vs friends, vs average)
 *   - [ ] Add stats prediction (projected next level)
 *   - [ ] Add stats validation (sanity checks)
 * 
 * CRITICAL:
 *   - Parallel queries required for performance
 *   - Handle missing chain data gracefully
 *   - Calculate tier correctly using rank module
 *   - Primary chain must have highest total points
 *   - Tip windows must be accurate (7/14/21 days)
 * 
 * SUGGESTIONS:
 *   - Cache stats per user with short TTL
 *   - Add stats quality indicators (freshness)
 *   - Pre-calculate stats for active users
 *   - Add stats anomaly detection
 *   - Batch multiple user stat queries
 * 
 * AVOID:
 *   - Sequential chain queries (too slow)
 *   - Returning stale stats without disclaimer
 *   - Hardcoding tier thresholds (use rank module)
 *   - Ignoring errors from individual chains
 *   - Calculating stats on every request (cache it)
 */

// @edit-start 2025-11-12 — Bot stats aggregation helper
import { PROFILE_SUPPORTED_CHAINS, fetchChainSnapshot, normalizeAddress } from '@/lib/profile/profile-data'
import { calculateRankProgress } from '@/lib/leaderboard/rank'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { ChainKey } from '@/lib/contracts/gmeow-utils'

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_CHAIN: ChainKey = 'base'

type ChainSnapshotSummary = {
  chain: ChainKey
  totalPoints: number
  availablePoints: number
  lockedPoints: number
  streak: number
  lastGM?: number
  registered: boolean
}

export type BotUserStats = {
  address: `0x${string}`
  totalPoints: number
  availablePoints: number
  lockedPoints: number
  streak: number
  lastGM?: number
  level: number
  levelPercent: number
  tierName: string
  tierPercent: number
  xpIntoLevel: number
  xpForLevel: number
  xpToNextLevel: number
  registeredChains: ChainSnapshotSummary[]
  tips7d: number | null
  tips14d: number | null
  tips21d: number | null
  tipsAll: number | null
  primaryChain: ChainKey
}

type TipAggregateRow = {
  sum?: number | string | null
}

async function fetchTipPoints(address: `0x${string}`, days?: number): Promise<number | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  try {
    let query = supabase
      .from('gmeow_rank_events')
      .select('sum:delta')
      .eq('wallet_address', address)
      .eq('event_type', 'tip')
    if (typeof days === 'number' && days > 0) {
      const cutoffIso = new Date(Date.now() - days * DAY_MS).toISOString()
      query = query.gte('created_at', cutoffIso)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.warn('[bot-stats] tips lookup failed:', error.message)
      return null
    }

    if (!data) return 0
    const aggregate = data as TipAggregateRow
    const sumValue =
      typeof aggregate.sum === 'number'
        ? aggregate.sum
        : aggregate.sum
        ? Number(aggregate.sum)
        : 0

    return Number.isFinite(sumValue) ? sumValue : 0
  } catch (error) {
    console.warn('[bot-stats] tips lookup error:', (error as Error)?.message || error)
    return null
  }
}

function pickPrimaryChain(summaries: ChainSnapshotSummary[]): ChainKey {
  if (!summaries.length) return DEFAULT_CHAIN
  let best = summaries[0]
  for (const summary of summaries) {
    if (summary.totalPoints > best.totalPoints) {
      best = summary
    } else if (summary.totalPoints === best.totalPoints && summary.streak > best.streak) {
      best = summary
    }
  }
  return best.chain
}

export async function computeBotUserStats(addressInput: string): Promise<BotUserStats | null> {
  const normalized = normalizeAddress(addressInput)
  if (!normalized) return null

  const snapshots = await Promise.all(
    PROFILE_SUPPORTED_CHAINS.map(async chain => {
      try {
        const result = await fetchChainSnapshot(chain, normalized)
        if (!result) return null
        const { summary } = result

        const chainSummary: ChainSnapshotSummary = {
          chain: summary.chain,
          totalPoints: summary.totalPoints,
          availablePoints: summary.availablePoints,
          lockedPoints: summary.lockedPoints,
          streak: summary.streak,
          lastGM: summary.lastGM,
          registered: summary.registered,
        }

        return chainSummary
      } catch (error) {
        console.warn('[bot-stats] snapshot failed', chain, (error as Error)?.message || error)
        return null
      }
    }),
  )

  const valid = snapshots.filter((entry): entry is ChainSnapshotSummary => Boolean(entry))

  const [tips7d, tips14d, tips21d, tipsAll] = await Promise.all([
    fetchTipPoints(normalized, 7),
    fetchTipPoints(normalized, 14),
    fetchTipPoints(normalized, 21),
    fetchTipPoints(normalized),
  ])

  if (!valid.length) {
    return {
      address: normalized,
      totalPoints: 0,
      availablePoints: 0,
      lockedPoints: 0,
      streak: 0,
      level: 1,
      levelPercent: 0,
      tierName: 'Signal Kitten',
      tierPercent: 0,
      xpIntoLevel: 0,
      xpForLevel: 300,
      xpToNextLevel: 300,
      registeredChains: [],
      tips7d,
      tips14d,
      tips21d,
      tipsAll,
      primaryChain: DEFAULT_CHAIN,
    }
  }

  const totalPoints = valid.reduce((sum, entry) => sum + Math.max(0, entry.totalPoints), 0)
  const availablePoints = valid.reduce((sum, entry) => sum + Math.max(0, entry.availablePoints), 0)
  const lockedPoints = valid.reduce((sum, entry) => sum + Math.max(0, entry.lockedPoints), 0)
  const streak = valid.reduce((max, entry) => Math.max(max, entry.streak), 0)
  const lastGM = valid.reduce<number | undefined>((latest, entry) => {
    if (!entry.lastGM) return latest
    if (!latest || entry.lastGM > latest) return entry.lastGM
    return latest
  }, undefined)

  const progress = calculateRankProgress(totalPoints)
  const primaryChain = pickPrimaryChain(valid)

  return {
    address: normalized,
    totalPoints,
    availablePoints,
    lockedPoints,
    streak,
    lastGM,
    level: progress.level,
    levelPercent: progress.levelPercent * 100,
    tierName: progress.currentTier.name,
    tierPercent: progress.percent * 100,
    xpIntoLevel: progress.xpIntoLevel,
    xpForLevel: progress.xpForLevel,
    xpToNextLevel: progress.xpToNextLevel,
    registeredChains: valid,
    tips7d,
    tips14d,
    tips21d,
    tipsAll,
    primaryChain,
  }
}
// @edit-end
