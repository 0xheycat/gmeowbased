// @ts-nocheck
// This file runs in Deno runtime (Supabase Edge Functions), not Node.js
// Deno types are not available in the TypeScript compiler

/**
 * #file: supabase/functions/process-mint-queue/index.ts
 * 
 * TODO:
 * - Add retry backoff logic (exponential delay)
 * - Add Sentry error tracking integration
 * - Add metrics tracking (processed count, success rate)
 * - Add gas price optimization (wait for lower gas if high)
 * 
 * FEATURES:
 * - Poll mint_queue table for pending NFT mints
 * - Call GmeowNFT contract mint function
 * - Update mint_queue status (pending → minting → minted/failed)
 * - Update user_badges table with tx_hash after successful mint
 * - Retry failed mints up to 3 times
 * - Batch processing (10 mints per run for gas optimization)
 * 
 * PHASE: Phase 1 - Critical Infrastructure (Week 1, Day 1)
 * DATE: December 16, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - NFT-SYSTEM-ARCHITECTURE-PART-4.md (Section 17, Task 1.1)
 * - farcaster.instructions.md (Section 4.1 - MCP-First Policy)
 * - farcaster.instructions.md (Section 4.6 - GitHub Cron for Automated Tasks)
 * 
 * SUGGESTIONS:
 * - Consider implementing gas price threshold (pause if > 10 gwei)
 * - Add notification system after successful mint
 * - Add webhook to notify frontend of mint completion
 * - Consider using Gelato for decentralized execution
 * 
 * CRITICAL FOUND:
 * - ⚠️ PRIVATE KEY SECURITY: NFT_MINTER_PRIVATE_KEY must be stored in Supabase Vault
 * - ⚠️ RPC RATE LIMITS: BASE_RPC_URL should have high rate limit (Alchemy Growth plan)
 * - ⚠️ GAS BUFFER: Add 20% gas buffer to prevent out-of-gas errors
 * - ⚠️ CONCURRENCY: Prevent multiple workers processing same mint (add locking)
 * 
 * AVOID (from farcaster.instructions.md):
 * - ❌ NO Vercel Cron (use GitHub Actions instead)
 * - ❌ NO Supabase CLI (use MCP tools only)
 * - ❌ NO custom error handling (use standard Error objects)
 * - ❌ NO mixing old/new patterns
 * - ❌ NO emojis in code
 * 
 * Website: https://gmeowhq.art
 * Network: Base (Chain ID: 8453)
 * Contract: 0xCE9596a992e38c5fa2d997ea916a277E0F652D5C
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { ethers } from 'https://esm.sh/ethers@6.9.0'

// NFT Contract ABI (mint function + NFTMinted event)
const NFT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "string", "name": "nftTypeId", "type": "string" },
      { "internalType": "string", "name": "metadataURI", "type": "string" }
    ],
    "name": "mint",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "nftType", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "metadataURI", "type": "string" }
    ],
    "name": "NFTMinted",
    "type": "event"
  }
]

const NFT_CONTRACT_ADDRESS = '0xCE9596a992e38c5fa2d997ea916a277E0F652D5C'
const BASE_CHAIN_ID = 8453
const MAX_RETRIES = 3
const BATCH_SIZE = 10

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Initialize ethers provider and wallet
const provider = new ethers.JsonRpcProvider(
  Deno.env.get('RPC_BASE_HTTP') ?? Deno.env.get('NEXT_PUBLIC_RPC_BASE')
)
const wallet = new ethers.Wallet(
  Deno.env.get('NFT_MINTER_PRIVATE_KEY') ?? '',
  provider
)
const nftContract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, wallet)

/**
 * Generate metadata URI for NFT
 * Updated: Phase 1 Day 2 - Use tokenId-based metadata endpoint
 * Format: https://gmeowhq.art/api/nft/metadata/{tokenId}
 * Note: We'll update this after mint to use the actual tokenId
 */
function generateMetadataURI(tokenId: bigint): string {
  // Use tokenId-based metadata endpoint (ERC-721 standard)
  return `https://gmeowhq.art/api/nft/metadata/${tokenId.toString()}`
  
  // Option 2: IPFS (static metadata - uncomment if preferred)
  // return `ipfs://QmXxx/${mint.badge_type}/${mint.fid}.json`
}

/**
 * Process a single mint request
 */
async function processMint(mint: any): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    console.log(`Processing mint for FID ${mint.fid}, badge type: ${mint.badge_type}`)

    // Step 1: Update status to 'minting'
    const { error: updateError } = await supabase
      .from('mint_queue')
      .update({ 
        status: 'minting',
        updated_at: new Date().toISOString()
      })
      .eq('id', mint.id)

    if (updateError) {
      throw new Error(`Failed to update status: ${updateError.message}`)
    }

    // Step 2: Temporary placeholder metadata URI (will be replaced by indexer)
    // The indexer will capture the actual tokenId from NFTMinted event
    const tempMetadataURI = `https://gmeowhq.art/api/nft/metadata/pending`

    // Step 3: Call contract mint function
    console.log(`Calling contract mint: to=${mint.wallet_address}, type=${mint.badge_type}`)
    const tx = await nftContract.mint(
      mint.wallet_address,
      mint.badge_type,
      tempMetadataURI,
      {
        gasLimit: 300000, // Add 20% buffer (250k base + 50k buffer)
      }
    )

    console.log(`Transaction submitted: ${tx.hash}`)

    // Step 4: Wait for confirmation
    const receipt = await tx.wait()
    
    // Step 5: Extract tokenId from NFTMinted event logs
    let tokenId: bigint | null = null
    for (const log of receipt.logs) {
      try {
        const parsedLog = nftContract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data
        })
        if (parsedLog && parsedLog.name === 'NFTMinted') {
          tokenId = parsedLog.args.tokenId
          console.log(`NFT minted with tokenId: ${tokenId}`)
          break
        }
      } catch (e) {
        // Skip logs that don't match our ABI
      }
    }
    
    if (receipt.status !== 1) {
      throw new Error(`Transaction failed: ${tx.hash}`)
    }

    console.log(`Transaction confirmed: ${tx.hash}`)

    // Step 6: Update mint_queue to 'minted'
    const { error: mintedError } = await supabase
      .from('mint_queue')
      .update({
        status: 'minted',
        tx_hash: tx.hash,
        token_id: tokenId ? tokenId.toString() : null,
        minted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', mint.id)

    if (mintedError) {
      console.error(`Failed to update mint_queue: ${mintedError.message}`)
    }

    // Step 7: Update user_badges table with tokenId
    const { error: badgeError } = await supabase
      .from('user_badges')
      .update({
        minted: true,
        tx_hash: tx.hash,
        token_id: tokenId ? parseInt(tokenId.toString()) : null,
        minted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('fid', mint.fid)
      .eq('badge_type', mint.badge_type)

    if (badgeError) {
      console.error(`Failed to update user_badges: ${badgeError.message}`)
    }

    return { success: true, txHash: tx.hash }
  } catch (error: any) {
    console.error(`Mint failed for FID ${mint.fid}:`, error)
    
    // Determine if error is retryable
    const isRetryable = 
      error.message?.includes('nonce') ||
      error.message?.includes('timeout') ||
      error.message?.includes('network') ||
      error.message?.includes('rate limit')

    const retryCount = mint.retry_count + 1
    const newStatus = (isRetryable && retryCount < MAX_RETRIES) ? 'pending' : 'failed'

    // Update with error details
    await supabase
      .from('mint_queue')
      .update({
        status: newStatus,
        error: error.message?.substring(0, 500), // Limit error message length
        retry_count: retryCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', mint.id)

    return { 
      success: false, 
      error: error.message 
    }
  }
}

/**
 * Main handler - processes batch of pending mints
 */
// @ts-ignore: Deno serve types
serve(async (req: Request) => {
  // CORS headers for browser requests (if needed for testing)
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }

  try {
    console.log('=== NFT Mint Worker Started ===')
    console.log(`Timestamp: ${new Date().toISOString()}`)

    // Step 1: Fetch pending mints (limit batch size)
    const { data: pending, error: fetchError } = await supabase
      .from('mint_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (fetchError) {
      throw new Error(`Failed to fetch pending mints: ${fetchError.message}`)
    }

    if (!pending || pending.length === 0) {
      console.log('No pending mints found')
      return new Response(
        JSON.stringify({ 
          processed: 0, 
          message: 'No pending mints' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Found ${pending.length} pending mints`)

    // Step 2: Process each mint sequentially (to prevent nonce conflicts)
    const results = []
    for (const mint of pending) {
      const result = await processMint(mint)
      results.push({
        id: mint.id,
        fid: mint.fid,
        badge_type: mint.badge_type,
        ...result
      })
    }

    // Step 3: Calculate statistics
    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    console.log('=== Mint Worker Completed ===')
    console.log(`Total processed: ${results.length}`)
    console.log(`Successful: ${successCount}`)
    console.log(`Failed: ${failedCount}`)

    return new Response(
      JSON.stringify({
        processed: results.length,
        successful: successCount,
        failed: failedCount,
        results: results
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error: any) {
    console.error('Mint worker error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
