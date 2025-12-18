#!/usr/bin/env tsx
/**
 * Viral Metrics Sync Script
 * 
 * Fetches engagement metrics from Neynar API for badge casts and updates:
 * - viral_score: Weighted engagement score
 * - viral_tier: Tier classification based on score
 * - viral_bonus_xp: Bonus XP awarded for viral performance
 * 
 * Formula:
 * viral_score = (recasts × 10) + (replies × 5) + (likes × 2)
 * 
 * Tiers:
 * - none: 0-9 score
 * - active: 10-49 score  
 * - engaging: 50-99 score
 * - popular: 100-249 score
 * - viral: 250-499 score
 * - mega_viral: 500+ score
 * 
 * Bonus XP per tier upgrade:
 * - active: +10 XP
 * - engaging: +25 XP
 * - popular: +50 XP
 * - viral: +100 XP
 * - mega_viral: +250 XP
 */

import { config } from 'dotenv'
config({ path: process.env.DOTENV_PATH || '.env.local', override: true })

import { createClient } from '@supabase/supabase-js'
import process from 'node:process'
import type { Database } from '../../types/supabase'

// ============================================================================
// Types
// ============================================================================

type ViralTier = 'none' | 'active' | 'engaging' | 'popular' | 'viral' | 'mega_viral'

type BadgeCast = {
  id: string
  fid: number
  badge_id: string
  cast_hash: string
  cast_url: string
  tier: string
  likes_count: number
  recasts_count: number
  replies_count: number
  viral_score: number
  viral_tier: ViralTier
  viral_bonus_xp: number
  last_metrics_update: string | null
}

type NeynarCastResponse = {
  cast: {
    hash: string
    reactions: {
      likes_count: number
      recasts_count: number
    }
    replies: {
      count: number
    }
  }
}

type SyncResult = {
  totalCasts: number
  updated: number
  errors: number
  skipped: number
  tierUpgrades: number
  xpAwarded: number
}

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY

// Update casts that haven't been updated in last N hours
const UPDATE_THRESHOLD_HOURS = 6
const BATCH_SIZE = 50
const REQUEST_DELAY_MS = 100 // Rate limit protection

// ============================================================================
// Viral Tier Logic
// ============================================================================

function calculateViralScore(likes: number, recasts: number, replies: number): number {
  return (recasts * 10) + (replies * 5) + (likes * 2)
}

function determineViralTier(score: number): ViralTier {
  if (score >= 500) return 'mega_viral'
  if (score >= 250) return 'viral'
  if (score >= 100) return 'popular'
  if (score >= 50) return 'engaging'
  if (score >= 10) return 'active'
  return 'none'
}

const TIER_XP: Record<ViralTier, number> = {
  none: 0,
  active: 10,
  engaging: 25,
  popular: 50,
  viral: 100,
  mega_viral: 250,
}

function calculateBonusXp(tier: ViralTier): number {
  return TIER_XP[tier]
}

function calculateXpUpgrade(oldTier: ViralTier, newTier: ViralTier): number {
  return TIER_XP[newTier] - TIER_XP[oldTier]
}

// ============================================================================
// Neynar API Client
// ============================================================================

async function fetchCastMetrics(castHash: string): Promise<NeynarCastResponse | null> {
  if (!NEYNAR_API_KEY) {
    throw new Error('NEYNAR_API_KEY not configured')
  }

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/cast?identifier=${castHash}&type=hash`,
      {
        headers: {
          accept: 'application/json',
          api_key: NEYNAR_API_KEY,
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Cast not found: ${castHash}`)
        return null
      }
      throw new Error(`Neynar API error: ${response.status} ${response.statusText}`)
    }

    return await response.json() as NeynarCastResponse
  } catch (error) {
    console.error(`Failed to fetch cast ${castHash}:`, error)
    return null
  }
}

// ============================================================================
// Supabase Operations
// ============================================================================

async function fetchCastsToUpdate(supabase: ReturnType<typeof createClient<Database>>) {
  const thresholdDate = new Date()
  thresholdDate.setHours(thresholdDate.getHours() - UPDATE_THRESHOLD_HOURS)

  const { data, error } = await supabase
    .from('badge_casts')
    .select('*')
    .or(`last_metrics_update.is.null,last_metrics_update.lt.${thresholdDate.toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) {
    throw new Error(`Failed to fetch badge casts: ${error.message}`)
  }

  return data as BadgeCast[]
}

async function updateCastMetrics(
  supabase: ReturnType<typeof createClient<Database>>,
  cast: BadgeCast,
  metrics: {
    likes: number
    recasts: number
    replies: number
  }
): Promise<{ updated: boolean; tierUpgrade: boolean; xpAwarded: number }> {
  const newScore = calculateViralScore(metrics.likes, metrics.recasts, metrics.replies)
  const newTier = determineViralTier(newScore)
  const oldTier = cast.viral_tier || 'none'
  const tierUpgrade = TIER_XP[newTier] > TIER_XP[oldTier]
  const xpAwarded = tierUpgrade ? calculateXpUpgrade(oldTier, newTier) : 0

  // Check if metrics actually changed
  const metricsChanged = 
    cast.likes_count !== metrics.likes ||
    cast.recasts_count !== metrics.recasts ||
    cast.replies_count !== metrics.replies

  if (!metricsChanged && !tierUpgrade) {
    return { updated: false, tierUpgrade: false, xpAwarded: 0 }
  }

  const newBonusXp = calculateBonusXp(newTier)

  const { error } = await supabase
    .from('badge_casts')
    .update({
      likes_count: metrics.likes,
      recasts_count: metrics.recasts,
      replies_count: metrics.replies,
      viral_score: newScore,
      viral_tier: newTier,
      viral_bonus_xp: newBonusXp,
      last_metrics_update: new Date().toISOString(),
    })
    .eq('id', cast.id)

  if (error) {
    throw new Error(`Failed to update cast ${cast.cast_hash}: ${error.message}`)
  }

  // If tier upgraded, also update user XP
  if (tierUpgrade && xpAwarded > 0) {
    await awardViralXp(supabase, cast.fid, xpAwarded, cast.cast_hash, oldTier, newTier)
  }

  return { updated: true, tierUpgrade, xpAwarded }
}

async function awardViralXp(
  supabase: ReturnType<typeof createClient<Database>>,
  fid: number,
  xpAmount: number,
  castHash: string,
  oldTier: ViralTier,
  newTier: ViralTier
) {
  // Update user XP using RPC function
  const { error: xpError } = await supabase.rpc('increment_user_xp', {
    p_fid: fid,
    p_xp_amount: xpAmount,
    p_source: 'viral_tier_upgrade',
  })

  if (xpError) {
    console.error(`Failed to award XP to FID ${fid}:`, xpError.message)
  }

  // DEPRECATED (Phase 3): xp_transactions table dropped
  // XP tracking now handled by points_transactions
  console.warn('[sync-viral-metrics] DEPRECATED: xp_transactions table dropped in Phase 3')

  /* Original implementation:
  // Log XP transaction with metadata
  const { error: txError } = await supabase
    .from('xp_transactions')
    .insert({
      fid,
      amount: xpAmount,
      source: 'viral_tier_upgrade',
      metadata: {
        cast_hash: castHash,
        old_tier: oldTier,
        new_tier: newTier,
        tier_upgrade: true,
      },
    })

  if (txError) {
    console.error(`Failed to log XP transaction for FID ${fid}:`, txError.message)
  }
  */
}

// ============================================================================
// Main Sync Logic
// ============================================================================

async function syncViralMetrics(options: { dryRun: boolean }): Promise<SyncResult> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase credentials not configured')
  }

  if (!NEYNAR_API_KEY) {
    throw new Error('NEYNAR_API_KEY not configured')
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  console.log('📊 Fetching badge casts to update...')
  const casts = await fetchCastsToUpdate(supabase)
  console.log(`Found ${casts.length} casts to process`)

  const result: SyncResult = {
    totalCasts: casts.length,
    updated: 0,
    errors: 0,
    skipped: 0,
    tierUpgrades: 0,
    xpAwarded: 0,
  }

  for (let i = 0; i < casts.length; i += 1) {
    const cast = casts[i]
    
    try {
      console.log(`[${i + 1}/${casts.length}] Processing cast ${cast.cast_hash}...`)
      
      const metrics = await fetchCastMetrics(cast.cast_hash)
      
      if (!metrics) {
        console.log(`  ⏭️  Cast not found or unavailable`)
        result.skipped += 1
        continue
      }

      const { likes_count, recasts_count } = metrics.cast.reactions
      const replies_count = metrics.cast.replies.count

      if (options.dryRun) {
        const newScore = calculateViralScore(likes_count, recasts_count, replies_count)
        const newTier = determineViralTier(newScore)
        console.log(`  [DRY RUN] Would update: ${likes_count} likes, ${recasts_count} recasts, ${replies_count} replies`)
        console.log(`  [DRY RUN] Score: ${newScore}, Tier: ${newTier}`)
        result.updated += 1
      } else {
        const updateResult = await updateCastMetrics(supabase, cast, {
          likes: likes_count,
          recasts: recasts_count,
          replies: replies_count,
        })

        if (updateResult.updated) {
          console.log(`  ✅ Updated: ${likes_count} likes, ${recasts_count} recasts, ${replies_count} replies`)
          result.updated += 1

          if (updateResult.tierUpgrade) {
            console.log(`  🎉 TIER UPGRADE! Awarded ${updateResult.xpAwarded} XP`)
            result.tierUpgrades += 1
            result.xpAwarded += updateResult.xpAwarded
          }
        } else {
          console.log(`  ⏭️  No changes`)
          result.skipped += 1
        }
      }

      // Rate limit protection
      if (i < casts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS))
      }
    } catch (error) {
      console.error(`  ❌ Error processing cast ${cast.cast_hash}:`, error)
      result.errors += 1
    }
  }

  return result
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run') || args.includes('-n')

  console.log('🚀 Starting Viral Metrics Sync')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Update threshold: ${UPDATE_THRESHOLD_HOURS} hours`)
  console.log('─'.repeat(60))

  try {
    const result = await syncViralMetrics({ dryRun })

    console.log('─'.repeat(60))
    console.log('📈 Sync Results:')
    console.log(`  Total casts: ${result.totalCasts}`)
    console.log(`  Updated: ${result.updated}`)
    console.log(`  Skipped: ${result.skipped}`)
    console.log(`  Errors: ${result.errors}`)
    console.log(`  Tier upgrades: ${result.tierUpgrades}`)
    console.log(`  Total XP awarded: ${result.xpAwarded}`)
    console.log('✅ Sync complete')

    process.exit(result.errors > 0 ? 1 : 0)
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { syncViralMetrics, calculateViralScore, determineViralTier, calculateBonusXp }
