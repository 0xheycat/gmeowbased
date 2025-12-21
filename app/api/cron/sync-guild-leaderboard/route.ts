/**
 * Guild-Leaderboard Sync Cron Endpoint
 * 
 * Syncs guild membership data to user profiles:
 * - Updates user_profiles with guild_id from blockchain
 * - Marks guild officers (is_guild_officer)
 * - Guild bonus points calculated client-side from on-chain data
 * 
 * Called by GitHub Actions workflow every 6 hours
 * Idempotency: Prevents double execution on retry
 * Key format: cron-sync-guild-leaderboard-YYYYMMDD-HH (24h cache TTL)
 * 
 * Updated: December 19, 2025
 * Status: ✅ Fixed - Uses user_profiles instead of dropped leaderboard_calculations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/edge';
import { createPublicClient as _unused, http as _unused2 } from 'viem';
import { getPublicClient } from '@/lib/contracts/rpc-client-pool';
import type { Address } from 'viem';
import { base } from 'viem/chains';
import { checkIdempotency, storeIdempotency, returnCachedResponse } from '@/lib/middleware/idempotency';
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils';
import GUILD_ABI_JSON from '@/abi/GmeowGuildStandalone.abi.json';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing cron secret' },
        { status: 401 }
      );
    }

    console.log('[Guild-Leaderboard Sync] Starting sync...');

    // 2. Idempotency check (prevents double execution)
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 13).replace(/[-:T]/g, ''); // YYYYMMDDHH
    const idempotencyKey = `cron-sync-guild-leaderboard-${dateKey}`;
    
    const idempotencyResult = await checkIdempotency(idempotencyKey);
    if (idempotencyResult.exists) {
      console.log(`[Guild-Leaderboard Sync] Replaying cached result for key: ${idempotencyKey}`);
      return returnCachedResponse(idempotencyResult);
    }

    // 3. Initialize clients
    const publicClient = getPublicClient(); // Using RPC client pool

    const supabase = getSupabaseAdminClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to initialize Supabase client' },
        { status: 500 }
      );
    }

    // 4. Get all user profiles with wallet addresses
    const { data: leaderboardEntries, error: leaderboardError } = await supabase
      .from('user_profiles')
      .select('fid, wallet_address')
      .not('wallet_address', 'is', null)
      .order('fid', { ascending: true });

    if (leaderboardError) {
      console.error('[Guild-Leaderboard Sync] Failed to fetch leaderboard:', leaderboardError);
      return NextResponse.json(
        { error: 'Database error', message: leaderboardError.message },
        { status: 500 }
      );
    }

    if (!leaderboardEntries || leaderboardEntries.length === 0) {
      const response = {
        success: true,
        message: 'No leaderboard entries to sync',
        synced: 0,
        duration: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString()
      };
      
      await storeIdempotency(idempotencyKey, response, 200);
      return NextResponse.json(response);
    }

    console.log(`[Guild-Leaderboard Sync] Processing ${leaderboardEntries.length} leaderboard entries...`);

    // 5. Batch process leaderboard entries
    let syncedCount = 0;
    let errors = 0;

    for (const entry of leaderboardEntries) {
      try {
        // Check if address is in a guild
        const guildId = await publicClient.readContract({
          address: STANDALONE_ADDRESSES.base.guild as Address,
          abi: GUILD_ABI_JSON,
          functionName: 'guildOf',
          args: [entry.wallet_address as Address]
        }) as bigint;

        // Update user profile with guild_id (0 if not in guild)
        // Guild bonus will be calculated client-side from on-chain data
        await supabase
          .from('user_profiles')
          .update({
            guild_id: guildId === 0n ? null : Number(guildId),
            updated_at: new Date().toISOString()
          })
          .eq('fid', entry.fid);
        
        syncedCount++;

      } catch (error) {
        console.error(`[Guild-Leaderboard Sync] Error processing FID ${entry.fid}:`, error);
        errors++;
      }
    }

    const duration = Date.now() - startTime;

    const response = {
      success: true,
      message: 'Guild-leaderboard sync completed',
      synced: syncedCount,
      errors: errors,
      total: leaderboardEntries.length,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };

    console.log(`[Guild-Leaderboard Sync] Complete: ${syncedCount} synced, ${errors} errors, ${duration}ms`);

    // Store for idempotency (24h cache)
    await storeIdempotency(idempotencyKey, response, 200);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Guild-Leaderboard Sync] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        error: 'Sync failed',
        message: errorMessage,
        timestamp: new Date().toISOString(),
        duration: `${Date.now() - startTime}ms`
      },
      { status: 500 }
    );
  }
}
