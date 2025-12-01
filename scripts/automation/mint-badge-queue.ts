#!/usr/bin/env tsx
/**
 * Badge Mint Queue Worker
 * 
 * Processes pending badge mints from the mint_queue table:
 * - Queries pending mints
 * - Calls blockchain mint function
 * - Updates database with mint status
 * - Handles retries for failed mints
 * 
 * Usage:
 *   pnpm tsx scripts/automation/mint-badge-queue.ts
 * 
 * Environment Variables:
 *   ORACLE_PRIVATE_KEY - Private key for minting wallet
 *   BADGE_CONTRACT_* - Badge contract addresses per chain
 *   MINT_BATCH_SIZE - Number of mints to process per batch (default: 5)
 *   MINT_INTERVAL_MS - Interval between batches in ms (default: 30000)
 */

import {
  getPendingMints,
  updateMintQueueStatus,
  updateBadgeMintStatus,
  type MintQueueEntry,
} from '@/lib/badges'
import { mintBadgeOnChain } from '@/lib/contract-mint'
import { getBadgeFromRegistry } from '@/lib/badges'
import type { ChainKey } from '@/lib/gmeow-utils'

const BATCH_SIZE = Number(process.env.MINT_BATCH_SIZE || 5)
// INTERVAL_MS and MAX_RETRIES removed - only used by commented main() function

let isProcessing = false
// shutdownRequested removed - only used by commented main() function

/**
 * Send webhook notification for successful mint
 */
async function sendMintWebhook(mint: MintQueueEntry, txHash: string, tokenId: number) {
  const webhookUrl = process.env.BADGE_MINT_WEBHOOK_URL
  const webhookSecret = process.env.WEBHOOK_SECRET
  
  if (!webhookUrl) {
    console.log('[Worker] No webhook URL configured, skipping notification')
    return
  }
  
  try {
    // Get badge metadata from registry
    const badgeDefinition = getBadgeFromRegistry(mint.badgeType)
    const chain = 'base' // Base-only architecture (Nov 28, 2025 redeploy)
    const tier = badgeDefinition?.tier || 'common'
    
    // Get Base contract address
    const contractAddress = process.env.BADGE_CONTRACT_BASE || ''
    
    const payload = {
      fid: mint.fid,
      badgeId: mint.badgeType.replace(/_/g, '-'),
      badgeType: mint.badgeType,
      tier,
      txHash,
      tokenId,
      chain,
      contractAddress,
      mintedAt: new Date().toISOString(),
    }
    
    console.log('[Worker] Sending webhook notification:', webhookUrl)
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': webhookSecret ? `Bearer ${webhookSecret}` : '',
      },
      body: JSON.stringify(payload),
    })
    
    if (!response.ok) {
      console.error(`[Worker] Webhook failed: ${response.status} ${response.statusText}`)
    } else {
      console.log('[Worker] Webhook notification sent successfully')
    }
  } catch (error) {
    console.error('[Worker] Error sending webhook:', error)
    // Don't fail the mint if webhook fails
  }
}

/**
 * Process a single mint from the queue
 */
async function processMint(mint: MintQueueEntry): Promise<{
  success: boolean
  txHash?: string
  tokenId?: number
  error?: string
}> {
  console.log(`[Worker] Processing mint ${mint.id} for FID ${mint.fid}, badge ${mint.badgeType}`)

  try {
    // Update status to 'minting'
    await updateMintQueueStatus(mint.id, 'minting')

    // Mint on blockchain
    const { txHash, tokenId } = await mintBadgeOnChain(mint)
    console.log(`[Worker] Mint successful: ${txHash}, tokenId: ${tokenId}`)

    // Update user_badges table
    await updateBadgeMintStatus({
      fid: mint.fid,
      badgeType: mint.badgeType,
      txHash,
      tokenId,
      contractAddress: undefined, // Will be set by mint endpoint if needed
    })

    // Update mint_queue status to 'minted'
    await updateMintQueueStatus(mint.id, 'minted')

    // Send webhook notification (non-blocking)
    sendMintWebhook(mint, txHash, tokenId).catch(error => {
      console.error('[Worker] Webhook notification failed:', error)
    })
    
    return {
      success: true,
      txHash,
      tokenId,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Worker] Mint failed for ${mint.id}:`, errorMessage)

    // Update status to 'failed'
    await updateMintQueueStatus(mint.id, 'failed', errorMessage)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Process a batch of pending mints
 * Returns result summary for monitoring
 */
async function processBatch(): Promise<{
  success: number
  failed: number
  processed: number
  skipped: number
}> {
  if (isProcessing) {
    console.log('[Worker] Batch already in progress, skipping')
    return { success: 0, failed: 0, processed: 0, skipped: 1 }
  }

  // Note: shutdownRequested check removed - function now called via API endpoints

  isProcessing = true

  try {
    const pending = await getPendingMints(BATCH_SIZE)
    
    if (pending.length === 0) {
      console.log('[Worker] No pending mints')
      return { success: 0, failed: 0, processed: 0, skipped: 0 }
    }

    console.log(`[Worker] Processing ${pending.length} pending mints`)

    const results = {
      success: 0,
      failed: 0,
      processed: 0,
      skipped: 0,
    }

    // Process sequentially to avoid rate limits
    for (const mint of pending) {
      // Note: shutdownRequested check removed - function now called via API endpoints

      const result = await processMint(mint)
      results.processed++
      
      if (result.success) {
        results.success++
      } else {
        results.failed++
      }

      // Small delay between mints to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.log(`[Worker] Batch complete: ${results.success} success, ${results.failed} failed, ${results.processed} processed`)
    return results
  } catch (error) {
    console.error('[Worker] Batch processing error:', error)
    return { success: 0, failed: 0, processed: 0, skipped: 0 }
  } finally {
    isProcessing = false
  }
}

/**
 * Main worker loop (unused - kept for reference)
 * Note: Worker is now invoked via Vercel Cron (/api/cron/mint-badges)
 * or manual trigger (/api/badges/mint-manual)
 */
// async function main() {
//   console.log('[Worker] Badge Mint Queue Worker started')
//   console.log(`[Worker] Batch size: ${BATCH_SIZE}`)
//   console.log(`[Worker] Interval: ${INTERVAL_MS}ms`)
//   console.log(`[Worker] Max retries: ${MAX_RETRIES}`)

//   // Validate configuration
//   if (!process.env.ORACLE_PRIVATE_KEY) {
//     console.error('[Worker] ERROR: ORACLE_PRIVATE_KEY not configured')
//     process.exit(1)
//   }

//   // Handle graceful shutdown
//   process.on('SIGINT', () => {
//     console.log('[Worker] SIGINT received, shutting down gracefully...')
//     shutdownRequested = true
//   })

//   process.on('SIGTERM', () => {
//     console.log('[Worker] SIGTERM received, shutting down gracefully...')
//     shutdownRequested = true
//   })

//   // Initial batch
//   await processBatch()

//   // Set up interval
//   const intervalId = setInterval(async () => {
//     if (shutdownRequested) {
//       clearInterval(intervalId)
//       console.log('[Worker] Worker stopped')
//       process.exit(0)
//     }
//     await processBatch()
//   }, INTERVAL_MS)

//   console.log('[Worker] Worker running, press Ctrl+C to stop')
// }

export { processBatch, processMint }
