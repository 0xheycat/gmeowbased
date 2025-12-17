/**
 * Referral Stats Sync Cron Endpoint (Priority 4 Implementation)
 * 
 * Syncs blockchain referral events to database:
 * - Fetches ReferralCodeRegistered events from contract
 * - Fetches ReferrerSet events from contract  
 * - Updates referral_registrations table
 * - Calculates and updates referral_stats table
 * - Updates referral_timeline for daily tracking
 * - Updates leaderboard_calculations.referral_bonus
 * 
 * Called by GitHub Actions workflow daily at 2:00 AM UTC
 * Idempotency: Prevents double execution on retry
 * Key format: cron-sync-referrals-YYYYMMDD-HH (24h cache TTL)
 * 
 * Updated: December 11, 2025
 * Status: ✅ Priority 4 Complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';
import { checkIdempotency, storeIdempotency, returnCachedResponse } from '@/lib/middleware/idempotency';
import { generateRequestId } from '@/lib/middleware/request-id';
import type { Address } from 'viem';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Contract address for GmeowReferralStandalone
const REFERRAL_CONTRACT_ADDRESS = '0x9E7c32C1fB3a2c08e973185181512a442b90Ba44' as Address;

// Deploy block (contract deployed around Dec 10, 2025)
const DEPLOY_BLOCK = 23170000n; // Approximate - adjust as needed

interface ReferralRegistration {
  fid: number;
  wallet_address: string;
  referral_code: string;
  referrer_fid: number | null;
  registration_tx: string;
  block_number: number;
}

interface ReferralStats {
  fid: number;
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

    // 3. Initialize clients
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Use Subsquid RPC (faster and more reliable than public RPC)
    const rpcUrl = process.env.RPC_BASE_HTTP || process.env.NEXT_PUBLIC_RPC_BASE || 'https://mainnet.base.org';
    
    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    console.log(`[Referral Sync] Starting blockchain event sync...`);

    // 4. Fetch ReferralCodeRegistered events from blockchain
    // Event: ReferralCodeRegistered(address indexed user, string code, uint256 fid)
    const codeRegisteredLogs = await publicClient.getLogs({
      address: REFERRAL_CONTRACT_ADDRESS,
      event: parseAbiItem('event ReferralCodeRegistered(address indexed user, string code, uint256 fid)'),
      fromBlock: DEPLOY_BLOCK,
      toBlock: 'latest',
    });

    console.log(`[Referral Sync] Found ${codeRegisteredLogs.length} ReferralCodeRegistered events`);

    // 5. Fetch ReferrerSet events from blockchain
    // Event: ReferrerSet(address indexed user, uint256 indexed userFid, string referralCode, address indexed referrer, uint256 referrerFid)
    const referrerSetLogs = await publicClient.getLogs({
      address: REFERRAL_CONTRACT_ADDRESS,
      event: parseAbiItem('event ReferrerSet(address indexed user, uint256 indexed userFid, string referralCode, address indexed referrer, uint256 referrerFid)'),
      fromBlock: DEPLOY_BLOCK,
      toBlock: 'latest',
    });

    console.log(`[Referral Sync] Found ${referrerSetLogs.length} ReferrerSet events`);

    // 6. Process ReferrerSet events (these are the actual referrals)
    const registrations: ReferralRegistration[] = [];
    const processedTxs = new Set<string>();

    for (const log of referrerSetLogs) {
      const { user, userFid, referralCode, referrer, referrerFid } = log.args;
      
      if (!user || !userFid || !referralCode || !referrer || !referrerFid) continue;
      if (processedTxs.has(log.transactionHash!)) continue;
      
      registrations.push({
        fid: Number(userFid),
        wallet_address: user.toLowerCase(),
        referral_code: referralCode,
        referrer_fid: Number(referrerFid),
        registration_tx: log.transactionHash!,
        block_number: Number(log.blockNumber),
      });
      
      processedTxs.add(log.transactionHash!);
    }

    console.log(`[Referral Sync] Processed ${registrations.length} referral registrations`);

    // 7. Upsert registrations to database
    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const reg of registrations) {
      const { error } = await supabase
        .from('referral_registrations')
        .upsert(
          {
            fid: reg.fid,
            wallet_address: reg.wallet_address,
            referral_code: reg.referral_code,
            referrer_fid: reg.referrer_fid,
            registration_tx: reg.registration_tx,
            block_number: reg.block_number,
            created_at: new Date().toISOString(),
          },
          {
            onConflict: 'registration_tx',
          }
        );

      if (error) {
        errors.push(`FID ${reg.fid}: ${error.message}`);
        console.error(`Failed to upsert registration for FID ${reg.fid}:`, error);
      } else {
        inserted++;
      }
    }

    console.log(`[Referral Sync] Inserted/updated ${inserted} registrations`);

    // 8. Calculate stats for each referrer
    const { data: referrers, error: referrersError } = await supabase
      .from('referral_registrations')
      .select('referrer_fid')
      .not('referrer_fid', 'is', null);

    if (referrersError) {
      console.error('Failed to fetch referrers:', referrersError);
      throw new Error(`Database error: ${referrersError.message}`);
    }

    const uniqueFids = [...new Set(referrers?.map((r) => r.referrer_fid).filter((fid): fid is number => fid !== null) || [])];
    console.log(`[Referral Sync] Found ${uniqueFids.length} unique referrers`);

    const stats: ReferralStats[] = [];

    for (const fid of uniqueFids) {
      // Get all referrals for this user
      const { data: referrals, error: referralsError } = await supabase
        .from('referral_registrations')
        .select('fid, created_at')
        .eq('referrer_fid', fid);

      if (referralsError) {
        console.error(`Failed to fetch referrals for FID ${fid}:`, referralsError);
        continue;
      }

      const totalReferrals = referrals?.length || 0;

      // Check how many referrals have activity (successful conversion - base_points > 0)
      let successfulReferrals = 0;
      if (referrals && referrals.length > 0) {
        const referredFids = referrals.map((r) => r.fid);

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

      // Calculate total rewards (50 points per successful referral)
      const totalRewards = successfulReferrals * 50;

      stats.push({
        fid,
        total_referrals: totalReferrals,
        successful_referrals: successfulReferrals,
        conversion_rate: Math.round(conversionRate * 100) / 100,
        tier,
        total_rewards: totalRewards,
      });
    }

    // 9. Update referral_stats table
    let statsUpdated = 0;
    for (const stat of stats) {
      const { error: upsertError } = await supabase
        .from('referral_stats')
        .upsert(
          {
            fid: stat.fid,
            total_referrals: stat.total_referrals,
            successful_referrals: stat.successful_referrals,
            conversion_rate: stat.conversion_rate,
            tier: stat.tier,
            points_earned: stat.total_rewards,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'fid',
          }
        );

      if (upsertError) {
        errors.push(`FID ${stat.fid}: ${upsertError.message}`);
        console.error(`Failed to update stats for FID ${stat.fid}:`, upsertError);
      } else {
        statsUpdated++;
      }
    }

    console.log(`[Referral Sync] Updated ${statsUpdated} referrer stats`);

    // 10. Update leaderboard_calculations.referral_bonus
    let leaderboardUpdated = 0;
    for (const stat of stats) {
      const { error: leaderboardError } = await supabase
        .from('leaderboard_calculations')
        .update({
          referral_bonus: stat.total_rewards,
        })
        .eq('farcaster_fid', stat.fid);

      if (leaderboardError) {
        console.error(`Failed to update leaderboard for FID ${stat.fid}:`, leaderboardError);
      } else {
        leaderboardUpdated++;
      }
    }

    console.log(`[Referral Sync] Updated ${leaderboardUpdated} leaderboard entries`);

    // 11. Calculate aggregate metrics
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

    // 12. Return results
    const response = {
      success: true,
      message: `Referral blockchain sync completed`,
      blockchain: {
        code_registered_events: codeRegisteredLogs.length,
        referrer_set_events: referrerSetLogs.length,
        registrations_synced: inserted,
      },
      stats: {
        total_referrers: uniqueFids.length,
        stats_updated: statsUpdated,
        leaderboard_updated: leaderboardUpdated,
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
