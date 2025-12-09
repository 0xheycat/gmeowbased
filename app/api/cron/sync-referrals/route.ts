/**
 * Referral Stats Sync Cron Endpoint
 * 
 * Updates referral statistics periodically:
 * - Total referrals count
 * - Conversion rates
 * - Tier badge eligibility
 * - Referral chains
 * - Performance metrics
 * 
 * Called by GitHub Actions workflow daily
 * Idempotency: Prevents double execution on retry
 * Key format: cron-sync-referrals-YYYYMMDD-HH (24h cache TTL)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkIdempotency, storeIdempotency, returnCachedResponse } from '@/lib/idempotency';
import { generateRequestId } from '@/lib/request-id';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ReferralStats {
  farcaster_fid: number;
  total_referrals: number;
  successful_referrals: number;
  conversion_rate: number;
  tier: 'bronze' | 'silver' | 'gold' | null;
  total_rewards: number;
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
    const idempotencyKey = `cron-sync-referrals-${dateKey}`;
    
    const idempotencyResult = await checkIdempotency(idempotencyKey);
    if (idempotencyResult.exists) {
      console.log(`[Referral Sync] Replaying cached result for key: ${idempotencyKey}`);
      return returnCachedResponse(idempotencyResult);
    }

    // 3. Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Get all unique referrers
    const { data: referrers, error: referrersError } = await supabase
      .from('referral_registrations')
      .select('referrer_fid')
      .not('referrer_fid', 'is', null);

    if (referrersError) {
      console.error('Failed to fetch referrers:', referrersError);
      return NextResponse.json(
        { error: 'Database error', message: referrersError.message },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      );
    }

    if (!referrers || referrers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No referrers to sync',
        updated: 0,
        duration: `${Date.now() - startTime}ms`,
      }, { headers: { 'X-Request-ID': requestId } });
    }

    // Get unique FIDs
    const uniqueFids = [...new Set(referrers.map((r) => r.referrer_fid).filter((fid): fid is number => fid !== null))];

    // 4. Calculate stats for each referrer
    const stats: ReferralStats[] = [];

    for (const fid of uniqueFids) {
      // Get all referrals for this user
      const { data: referrals, error: referralsError } = await supabase
        .from('referral_registrations')
        .select('referred_fid, created_at, referral_code')
        .eq('referrer_fid', fid);

      if (referralsError) {
        console.error(`Failed to fetch referrals for FID ${fid}:`, referralsError);
        continue;
      }

      const totalReferrals = referrals?.length || 0;

      // Check how many referrals have activity (successful conversion)
      let successfulReferrals = 0;
      if (referrals && referrals.length > 0) {
        const referredFids = referrals.map((r) => r.referred_fid);

        const { data: activityData, error: activityError } = await supabase
          .from('leaderboard_calculations')
          .select('farcaster_fid')
          .in('farcaster_fid', referredFids)
          .gt('base_points', 0);

        if (!activityError && activityData) {
          successfulReferrals = activityData.length;
        }
      }

      const conversionRate = totalReferrals > 0 ? (successfulReferrals / totalReferrals) * 100 : 0;

      // Calculate tier based on successful referrals
      let tier: 'bronze' | 'silver' | 'gold' | null = null;
      if (successfulReferrals >= 10) tier = 'gold';
      else if (successfulReferrals >= 5) tier = 'silver';
      else if (successfulReferrals >= 1) tier = 'bronze';

      // Calculate total rewards earned from referrals (50 points per referral)
      const totalRewards = successfulReferrals * 50;

      stats.push({
        farcaster_fid: fid,
        total_referrals: totalReferrals,
        successful_referrals: successfulReferrals,
        conversion_rate: Math.round(conversionRate * 100) / 100,
        tier,
        total_rewards: totalRewards,
      });
    }

    // 5. Update or insert referral stats
    let updatedCount = 0;
    const errors: string[] = [];

    for (const stat of stats) {
      // Upsert to referral_stats table (create if not exists)
      const { error: upsertError } = await supabase
        .from('referral_stats')
        .upsert(
          {
            farcaster_fid: stat.farcaster_fid,
            total_referrals: stat.total_referrals,
            successful_referrals: stat.successful_referrals,
            conversion_rate: stat.conversion_rate,
            tier: stat.tier,
            total_rewards: stat.total_rewards,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'farcaster_fid',
          }
        );

      if (upsertError) {
        errors.push(`FID ${stat.farcaster_fid}: ${upsertError.message}`);
        console.error(`Failed to update stats for FID ${stat.farcaster_fid}:`, upsertError);
      } else {
        updatedCount++;
      }
    }

    // 6. Calculate aggregate metrics
    const totalReferrals = stats.reduce((sum, s) => sum + s.total_referrals, 0);
    const totalSuccessful = stats.reduce((sum, s) => sum + s.successful_referrals, 0);
    const avgConversionRate = stats.length > 0 
      ? stats.reduce((sum, s) => sum + s.conversion_rate, 0) / stats.length 
      : 0;

    const tierDistribution = {
      gold: stats.filter((s) => s.tier === 'gold').length,
      silver: stats.filter((s) => s.tier === 'silver').length,
      bronze: stats.filter((s) => s.tier === 'bronze').length,
      none: stats.filter((s) => s.tier === null).length,
    };

    const duration = Date.now() - startTime;

    // 7. Return results
    const response = {
      success: true,
      message: `Referral stats sync completed`,
      stats: {
        total_referrers: uniqueFids.length,
        updated: updatedCount,
        failed: errors.length,
        total_referrals: totalReferrals,
        successful_referrals: totalSuccessful,
        avg_conversion_rate: `${Math.round(avgConversionRate * 100) / 100}%`,
        tier_distribution: tierDistribution,
      },
      errors: errors.length > 0 ? errors : undefined,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };
    
    // Store result for idempotency (24h cache TTL)
    await storeIdempotency(idempotencyKey, response, 200);
    
    return NextResponse.json(response, { headers: { 'X-Request-ID': requestId } });
  } catch (error) {
    console.error('Referral sync error:', error);
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
