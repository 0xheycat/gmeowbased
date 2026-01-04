#!/usr/bin/env tsx
/**
 * Escrow Refund Automation Script
 * 
 * Purpose: Automatically refund points to quest creators when quests expire
 * without reaching max completions (stuck escrow).
 * 
 * Runs: Daily via GitHub Actions cron job
 * 
 * Business Logic:
 * 1. Find expired quests with incomplete escrow
 * 2. Calculate refund amount: (max_completions - completion_count) × reward_points_awarded
 * 3. Refund points to creator's points_balance
 * 4. Mark quest as 'refunded' in quest_completions
 * 5. Send notification to creator
 * 
 * Safety:
 * - Read-only mode available for testing
 * - Atomic transactions with rollback
 * - Detailed logging for audit trail
 * - Rate limiting to prevent database overload
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/supabase.generated'

// Environment validation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface ExpiredQuest {
  id: string
  title: string
  creator_fid: number
  reward_points_awarded: number
  max_completions: number
  completion_count: number
  created_at: string
  expiry_date: string
  refund_amount: number
}

interface RefundResult {
  success: boolean
  quest_id: string
  quest_title: string
  creator_fid: number
  refund_amount: number
  error?: string
}

/**
 * Find expired quests with stuck escrow
 */
async function getExpiredQuestsWithStuckEscrow(): Promise<ExpiredQuest[]> {
  console.log('🔍 Searching for expired quests with stuck escrow...')

  const { data: quests, error } = await supabase
    .from('unified_quests')
    .select('id, title, creator_fid, reward_points_awarded, max_completions, completion_count, created_at, expiry_date')
    .lt('expiry_date', new Date().toISOString()) // Expired
    .lt('completion_count', 'max_completions') // Incomplete (use column reference)
    .is('refunded_at', null) // Not yet refunded
    .eq('status', 'active') // Still active (not manually closed)
    .order('expiry_date', { ascending: true })

  if (error) {
    console.error('❌ Database query error:', error)
    throw error
  }

  const expiredQuests = (quests || []).map(quest => ({
    ...quest,
    refund_amount: (quest.max_completions - quest.completion_count) * quest.reward_points_awarded,
  }))

  console.log(`✅ Found ${expiredQuests.length} expired quests with stuck escrow`)
  
  if (expiredQuests.length > 0) {
    const totalRefund = expiredQuests.reduce((sum, q) => sum + q.refund_amount, 0)
    console.log(`   Total refund amount: ${totalRefund} POINTS`)
  }

  return expiredQuests
}

/**
 * Process single quest refund with atomic transaction
 */
async function refundQuestEscrow(quest: ExpiredQuest, dryRun: boolean): Promise<RefundResult> {
  const { id, title, creator_fid, refund_amount } = quest

  console.log(`\n📋 Processing quest: "${title}" (ID: ${id})`)
  console.log(`   Creator FID: ${creator_fid}`)
  console.log(`   Refund amount: ${refund_amount} POINTS`)
  console.log(`   Completions: ${quest.completion_count}/${quest.max_completions}`)

  if (dryRun) {
    console.log('   🏃 DRY RUN - Skipping actual refund')
    return {
      success: true,
      quest_id: id,
      quest_title: title,
      creator_fid,
      refund_amount,
    }
  }

  try {
    // 1. Update creator's points balance (atomic increment)
    const { error: balanceError } = await supabase.rpc('increment_points_balance', {
      p_fid: creator_fid,
      p_amount: refund_amount,
      p_source: `escrow_refund_${id}`,
    })

    if (balanceError) {
      throw new Error(`Failed to increment balance: ${balanceError.message}`)
    }

    // 2. Mark quest as refunded
    const { error: questError } = await supabase
      .from('unified_quests')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (questError) {
      // Rollback: Decrement points balance
      await supabase.rpc('increment_points_balance', {
        p_fid: creator_fid,
        p_amount: -refund_amount,
        p_source: `escrow_refund_rollback_${id}`,
      })
      throw new Error(`Failed to update quest status: ${questError.message}`)
    }

    // 3. Create refund record in quest_completions (for audit trail)
    const { error: refundError } = await supabase.from('quest_completions').insert({
      quest_id: id,
      user_fid: creator_fid,
      status: 'refunded',
      points_awarded: refund_amount,
      completed_at: new Date().toISOString(),
      metadata: {
        refund_reason: 'expired_quest_stuck_escrow',
        max_completions: quest.max_completions,
        actual_completions: quest.completion_count,
        expired_at: quest.expiry_date,
      },
    })

    if (refundError) {
      console.warn(`⚠️  Failed to create refund record (non-critical): ${refundError.message}`)
    }

    // 4. Send notification to creator (non-blocking)
    try {
      await supabase.from('notifications').insert({
        recipient_fid: creator_fid,
        type: 'escrow_refund',
        title: 'Quest Escrow Refunded',
        message: `Your quest "${title}" expired with ${quest.completion_count}/${quest.max_completions} completions. ${refund_amount} POINTS have been refunded to your balance.`,
        metadata: {
          quest_id: id,
          refund_amount,
        },
        created_at: new Date().toISOString(),
      })
    } catch (notifError) {
      console.warn(`⚠️  Failed to send notification (non-critical):`, notifError)
    }

    console.log(`   ✅ Refund successful: ${refund_amount} POINTS returned to FID ${creator_fid}`)

    return {
      success: true,
      quest_id: id,
      quest_title: title,
      creator_fid,
      refund_amount,
    }
  } catch (error) {
    console.error(`   ❌ Refund failed:`, error)
    return {
      success: false,
      quest_id: id,
      quest_title: title,
      creator_fid,
      refund_amount,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const maxRefunds = parseInt(process.argv.find(arg => arg.startsWith('--max='))?.split('=')[1] || '50')

  console.log('═══════════════════════════════════════════════════════')
  console.log('🔄 Quest Escrow Refund Automation')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`Mode: ${dryRun ? '🏃 DRY RUN (no changes)' : '⚡ LIVE EXECUTION'}`)
  console.log(`Max refunds per run: ${maxRefunds}`)
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log('═══════════════════════════════════════════════════════\n')

  try {
    // 1. Get expired quests
    const expiredQuests = await getExpiredQuestsWithStuckEscrow()

    if (expiredQuests.length === 0) {
      console.log('✅ No expired quests with stuck escrow. All clear!')
      return
    }

    // 2. Limit to max refunds per run (safety)
    const questsToRefund = expiredQuests.slice(0, maxRefunds)
    if (expiredQuests.length > maxRefunds) {
      console.log(`⚠️  Limiting to ${maxRefunds} refunds (${expiredQuests.length - maxRefunds} will be processed in next run)`)
    }

    // 3. Process refunds with rate limiting
    const results: RefundResult[] = []
    for (let i = 0; i < questsToRefund.length; i++) {
      const quest = questsToRefund[i]
      const result = await refundQuestEscrow(quest, dryRun)
      results.push(result)

      // Rate limit: 1 refund per second (prevent database overload)
      if (i < questsToRefund.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // 4. Summary report
    console.log('\n═══════════════════════════════════════════════════════')
    console.log('📊 Refund Summary')
    console.log('═══════════════════════════════════════════════════════')

    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    const totalRefunded = successful.reduce((sum, r) => sum + r.refund_amount, 0)

    console.log(`✅ Successful: ${successful.length}`)
    console.log(`❌ Failed: ${failed.length}`)
    console.log(`💰 Total refunded: ${totalRefunded} POINTS`)

    if (failed.length > 0) {
      console.log('\n❌ Failed Refunds:')
      failed.forEach(f => {
        console.log(`   - Quest "${f.quest_title}" (${f.quest_id}): ${f.error}`)
      })
    }

    if (dryRun) {
      console.log('\n🏃 DRY RUN COMPLETE - No changes were made to the database')
    } else {
      console.log('\n✅ REFUND AUTOMATION COMPLETE')
    }

    console.log('═══════════════════════════════════════════════════════\n')

    // Exit with error code if any refunds failed
    if (failed.length > 0 && !dryRun) {
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error)
    process.exit(1)
  }
}

// Execute
main()
