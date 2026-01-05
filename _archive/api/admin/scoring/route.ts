/**
 * @file app/api/admin/scoring/route.ts
 * @description Admin endpoint for manual score updates with cache invalidation
 * 
 * Phase: Phase 8.4 Cache Optimization
 * 
 * Allows admins to manually update user scores and invalidate cache.
 * Useful for debugging, fixing discrepancies, or applying manual adjustments.
 * 
 * REQUIRES: Admin authentication (implement your auth strategy)
 * 
 * @module api/admin/scoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { invalidateUserScoringCache } from '@/lib/scoring/unified-calculator';
import { isAddress } from 'viem';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/scoring
 * 
 * Invalidate scoring cache for one or more users
 * 
 * Body:
 * {
 *   "addresses": ["0x123...", "0x456..."],
 *   "reason": "Manual score adjustment"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const session = await getServerSession()
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json();
    const { addresses, reason } = body;

    // Validate input
    if (!addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: 'addresses array is required' },
        { status: 400 }
      );
    }

    if (addresses.length === 0) {
      return NextResponse.json(
        { error: 'At least one address is required' },
        { status: 400 }
      );
    }

    // Validate all addresses
    const invalidAddresses = addresses.filter((addr) => !isAddress(addr));
    if (invalidAddresses.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid addresses',
          invalidAddresses,
        },
        { status: 400 }
      );
    }

    // Invalidate cache for all addresses
    const results = await Promise.allSettled(
      addresses.map((address) => invalidateUserScoringCache(address))
    );

    // Count successes and failures
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // Log for audit trail
    console.log('[Admin] Cache invalidation:', {
      timestamp: new Date().toISOString(),
      addresses: addresses.length,
      successful,
      failed,
      reason: reason || 'No reason provided',
    });

    return NextResponse.json({
      success: true,
      invalidated: successful,
      failed,
      total: addresses.length,
      reason: reason || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin] Cache invalidation error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/scoring?address=0x123...
 * 
 * Force-refresh scoring cache for a single user (bypasses cache)
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const session = await getServerSession()
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'address parameter is required' },
        { status: 400 }
      );
    }

    if (!isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    // Invalidate cache
    await invalidateUserScoringCache(address);

    console.log('[Admin] Cache invalidated for:', address);

    return NextResponse.json({
      success: true,
      address,
      timestamp: new Date().toISOString(),
      message: 'Cache invalidated - next request will fetch fresh data',
    });
  } catch (error) {
    console.error('[Admin] Cache invalidation error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
