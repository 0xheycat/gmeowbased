/**
 * Guild-Leaderboard Sync Cron Endpoint
 * 
 * Syncs guild membership data to global leaderboard:
 * - Updates leaderboard_calculations with guild_id + guild_name
 * - Marks guild officers (is_guild_officer)
 * - Calculates guild bonus points (10% + 5% officer bonus)
 * 
 * Called by GitHub Actions workflow every 6 hours
 * Idempotency: Prevents double execution on retry
 * Key format: cron-sync-guild-leaderboard-YYYYMMDD-HH (24h cache TTL)
 * 
 * Part of Task 4.1: Guild Members → Global Leaderboard Sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http } from 'viem';
import type { Address } from 'viem';
import { base } from 'viem/chains';
import { checkIdempotency, storeIdempotency, returnCachedResponse } from '@/lib/middleware/idempotency';
import { generateRequestId } from '@/lib/middleware/request-id';
import { STANDALONE_ADDRESSES } from '@/lib/contracts/gmeow-utils';
import GUILD_ABI_JSON from '@/abi/GmeowGuildStandalone.abi.json';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface GuildMemberUpdate {
  address: string;
  guild_id: number;
  guild_name: string;
  is_guild_officer: boolean;
  guild_bonus_points: number;
}

/**
 * Calculate guild bonus points
 * - 10% of base score for guild members
 * - Additional 5% for guild officers
 */
function calculateGuildBonus(baseScore: number, isOfficer: boolean): number {
  const memberBonus = Math.floor(baseScore * 0.1); // 10%
  const officerBonus = isOfficer ? Math.floor(baseScore * 0.05) : 0; // +5%
  return memberBonus + officerBonus;
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // 1. Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing cron secret' },
        { status: 401, headers: { 'X-Request-ID': requestId } }
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
    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL)
    });

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 4. Get all leaderboard entries
    const { data: leaderboardEntries, error: leaderboardError } = await supabase
      .from('leaderboard_calculations')
      .select('address, base_points, viral_xp')
      .order('address', { ascending: true });

    if (leaderboardError) {
      console.error('[Guild-Leaderboard Sync] Failed to fetch leaderboard:', leaderboardError);
      return NextResponse.json(
        { error: 'Database error', message: leaderboardError.message },
        { status: 500, headers: { 'X-Request-ID': requestId } }
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
      return NextResponse.json(response, { headers: { 'X-Request-ID': requestId } });
    }

    console.log(`[Guild-Leaderboard Sync] Processing ${leaderboardEntries.length} leaderboard entries...`);

    // 5. Batch process leaderboard entries
    const updates: GuildMemberUpdate[] = [];
    let syncedCount = 0;
    let errors = 0;

    for (const entry of leaderboardEntries) {
      try {
        // Check if address is in a guild
        const guildId = await publicClient.readContract({
          address: STANDALONE_ADDRESSES.base.guild as Address,
          abi: GUILD_ABI_JSON,
          functionName: 'guildOf',
          args: [entry.address as Address]
        }) as bigint;

        // If guildId is 0, user is not in a guild - clear guild data
        if (guildId === 0n) {
          await supabase
            .from('leaderboard_calculations')
            .update({
              guild_id: null,
              guild_name: null,
              is_guild_officer: false,
              guild_bonus_points: 0
            })
            .eq('address', entry.address);
          continue;
        }

        // Get guild info
        const guildInfo = await publicClient.readContract({
          address: STANDALONE_ADDRESSES.base.guild as Address,
          abi: GUILD_ABI_JSON,
          functionName: 'guilds',
          args: [guildId]
        }) as any;

        const guildName = guildInfo.name || `Guild ${guildId}`;

        // Check if user is a guild officer
        const isOfficer = await publicClient.readContract({
          address: STANDALONE_ADDRESSES.base.guild as Address,
          abi: GUILD_ABI_JSON,
          functionName: 'guildOfficers',
          args: [guildId, entry.address as Address]
        }) as boolean;

        // Calculate guild bonus
        const baseScore = (entry.base_points || 0) + (entry.viral_xp || 0);
        const guildBonus = calculateGuildBonus(baseScore, isOfficer);

        // Update leaderboard entry
        const { error: updateError } = await supabase
          .from('leaderboard_calculations')
          .update({
            guild_id: Number(guildId),
            guild_name: guildName,
            is_guild_officer: isOfficer,
            guild_bonus_points: guildBonus
          })
          .eq('address', entry.address);

        if (updateError) {
          console.error(`[Guild-Leaderboard Sync] Failed to update ${entry.address}:`, updateError);
          errors++;
        } else {
          syncedCount++;
        }

      } catch (error) {
        console.error(`[Guild-Leaderboard Sync] Error processing ${entry.address}:`, error);
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

    return NextResponse.json(response, { headers: { 'X-Request-ID': requestId } });

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
      { status: 500, headers: { 'X-Request-ID': requestId } }
    );
  }
}
