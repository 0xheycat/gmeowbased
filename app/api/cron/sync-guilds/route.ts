/**
 * Guild Stats Sync Cron Endpoint
 * 
 * Updates guild statistics periodically:
 * - Member counts
 * - Total points
 * - Guild levels
 * - Treasury balances
 * - Activity status
 * 
 * Called by GitHub Actions workflow every 6 hours
 * Idempotency: Prevents double execution on retry
 * Key format: cron-sync-guilds-YYYYMMDD-HH (24h cache TTL)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkIdempotency, storeIdempotency, returnCachedResponse } from '@/lib/middleware/idempotency';
import { generateRequestId } from '@/lib/middleware/request-id';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface GuildUpdate {
  guild_id: number;
  member_count: number;
  total_points: number;
  level: number;
  treasury_balance: number;
  is_active: boolean;
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

    // 2. Idempotency check (prevents double execution)
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 13).replace(/[-:T]/g, ''); // YYYYMMDDHH
    const idempotencyKey = `cron-sync-guilds-${dateKey}`;
    
    const idempotencyResult = await checkIdempotency(idempotencyKey);
    if (idempotencyResult.exists) {
      console.log(`[Guild Sync] Replaying cached result for key: ${idempotencyKey}`);
      return returnCachedResponse(idempotencyResult);
    }

    // 3. Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Get all guilds
    const { data: guilds, error: guildsError } = await supabase
      .from('guilds')
      .select('guild_id, name, leader, chain, created_at')
      .order('guild_id', { ascending: true });

    if (guildsError) {
      console.error('Failed to fetch guilds:', guildsError);
      return NextResponse.json(
        { error: 'Database error', message: guildsError.message },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      );
    }

    if (!guilds || guilds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No guilds to sync',
        updated: 0,
        duration: `${Date.now() - startTime}ms`,
      }, { headers: { 'X-Request-ID': requestId } });
    }

    // 4. Calculate stats for each guild
    const updates: GuildUpdate[] = [];

    for (const guild of guilds) {
      // Get member count
      const { count: memberCount, error: memberError } = await supabase
        .from('guild_members')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', guild.guild_id);

      if (memberError) {
        console.error(`Failed to count members for guild ${guild.guild_id}:`, memberError);
        continue;
      }

      // Get total points from members
      const { data: memberPoints, error: pointsError } = await supabase
        .from('guild_members')
        .select('points_contributed')
        .eq('guild_id', guild.guild_id);

      if (pointsError) {
        console.error(`Failed to fetch points for guild ${guild.guild_id}:`, pointsError);
        continue;
      }

      const totalPoints = (memberPoints || []).reduce(
        (sum, member) => sum + (member.points_contributed || 0),
        0
      );

      // Get treasury balance
      const { data: treasuryData, error: treasuryError } = await supabase
        .from('guild_treasury')
        .select('amount, transaction_type')
        .eq('guild_id', guild.guild_id);

      if (treasuryError) {
        console.error(`Failed to fetch treasury for guild ${guild.guild_id}:`, treasuryError);
        continue;
      }

      const treasuryBalance = (treasuryData || []).reduce((balance, tx) => {
        if (tx.transaction_type === 'deposit') {
          return balance + (tx.amount || 0);
        } else if (tx.transaction_type === 'claim') {
          return balance - (tx.amount || 0);
        }
        return balance;
      }, 0);

      // Calculate guild level (based on total points)
      let level = 1;
      if (totalPoints >= 10000) level = 5;
      else if (totalPoints >= 5000) level = 4;
      else if (totalPoints >= 2000) level = 3;
      else if (totalPoints >= 1000) level = 2;

      // Check if guild is active (has activity in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentActivity, error: activityError } = await supabase
        .from('guild_treasury')
        .select('transaction_id')
        .eq('guild_id', guild.guild_id)
        .gte('timestamp', thirtyDaysAgo.toISOString())
        .limit(1);

      const isActive = !activityError && (recentActivity?.length || 0) > 0;

      updates.push({
        guild_id: guild.guild_id,
        member_count: memberCount || 0,
        total_points: totalPoints,
        level,
        treasury_balance: treasuryBalance,
        is_active: isActive,
      });
    }

    // 5. Batch update guilds
    let updatedCount = 0;
    const errors: string[] = [];

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('guilds')
        .update({
          member_count: update.member_count,
          total_points: update.total_points,
          level: update.level,
          treasury_balance: update.treasury_balance,
          is_active: update.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('guild_id', update.guild_id);

      if (updateError) {
        errors.push(`Guild ${update.guild_id}: ${updateError.message}`);
        console.error(`Failed to update guild ${update.guild_id}:`, updateError);
      } else {
        updatedCount++;
      }
    }

    const duration = Date.now() - startTime;

    // 6. Return results
    const response = {
      success: true,
      message: `Guild stats sync completed`,
      stats: {
        total_guilds: guilds.length,
        updated: updatedCount,
        failed: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };
    
    // Store result for idempotency (24h cache TTL)
    await storeIdempotency(idempotencyKey, response, 200);
    
    return NextResponse.json(response, { headers: { 'X-Request-ID': requestId } });
  } catch (error) {
    console.error('Guild sync error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    );
  }
}

// Prevent caching
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
