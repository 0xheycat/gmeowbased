/**
 * @file lib/scoring/batch-invalidation.ts
 * @description Batch cache invalidation utilities for scoring system
 * 
 * Phase: Phase 8.4 Cache Optimization
 * 
 * Provides utilities for invalidating scoring cache for multiple users
 * at once, with progress tracking and error handling.
 * 
 * USE CASES:
 * - Guild-wide cache invalidation after guild level up
 * - Event-based mass updates (e.g., season reset)
 * - Admin bulk operations
 * 
 * @module lib/scoring/batch-invalidation
 */

import { invalidateUserScoringCache } from './unified-calculator';

export interface BatchInvalidationResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ address: string; error: string }>;
  duration: number; // milliseconds
}

export interface BatchInvalidationOptions {
  /** Number of concurrent invalidations (default: 10) */
  concurrency?: number;
  /** Continue on individual failures (default: true) */
  continueOnError?: boolean;
  /** Log progress to console (default: false) */
  verbose?: boolean;
}

/**
 * Invalidate scoring cache for multiple users in parallel batches
 * 
 * @example
 * ```typescript
 * // Invalidate cache for all guild members
 * const members = await getGuildMembers(guildId)
 * const result = await batchInvalidateUserCache(
 *   members.map(m => m.address),
 *   { concurrency: 20, verbose: true }
 * )
 * console.log(`Invalidated ${result.successful}/${result.total} users`)
 * ```
 */
export async function batchInvalidateUserCache(
  addresses: `0x${string}`[],
  options: BatchInvalidationOptions = {}
): Promise<BatchInvalidationResult> {
  const {
    concurrency = 10,
    continueOnError = true,
    verbose = false,
  } = options;

  const startTime = Date.now();
  const errors: Array<{ address: string; error: string }> = [];
  let successful = 0;
  let failed = 0;

  if (verbose) {
    console.log(
      `[BatchInvalidation] Starting invalidation for ${addresses.length} addresses (concurrency: ${concurrency})`
    );
  }

  // Process in batches of `concurrency`
  for (let i = 0; i < addresses.length; i += concurrency) {
    const batch = addresses.slice(i, i + concurrency);

    if (verbose) {
      console.log(
        `[BatchInvalidation] Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(addresses.length / concurrency)}`
      );
    }

    const results = await Promise.allSettled(
      batch.map((address) => invalidateUserScoringCache(address))
    );

    // Count results
    results.forEach((result, index) => {
      const address = batch[index];

      if (result.status === 'fulfilled') {
        successful++;
      } else {
        failed++;
        const errorMessage =
          result.reason instanceof Error
            ? result.reason.message
            : 'Unknown error';
        errors.push({ address, error: errorMessage });

        if (!continueOnError) {
          throw new Error(
            `Batch invalidation failed at ${address}: ${errorMessage}`
          );
        }
      }
    });
  }

  const duration = Date.now() - startTime;

  if (verbose) {
    console.log(
      `[BatchInvalidation] Complete: ${successful} successful, ${failed} failed (${duration}ms)`
    );
    if (errors.length > 0) {
      console.error('[BatchInvalidation] Errors:', errors);
    }
  }

  return {
    total: addresses.length,
    successful,
    failed,
    errors,
    duration,
  };
}

/**
 * Invalidate scoring cache for all members of a guild
 * 
 * @example
 * ```typescript
 * // After guild levels up (multiplier changes)
 * await invalidateGuildMembersCache(guildId)
 * ```
 */
export async function invalidateGuildMembersCache(
  guildId: string,
  options: BatchInvalidationOptions = {}
): Promise<BatchInvalidationResult> {
  const { verbose = false } = options;

  if (verbose) {
    console.log(
      `[BatchInvalidation] Fetching guild members for guild ${guildId}`
    );
  }

  try {
    // Fetch guild members from API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/guild/${guildId}/members`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch guild members: ${response.statusText}`
      );
    }

    const data = await response.json();
    const members = data.members || [];

    if (members.length === 0) {
      if (verbose) {
        console.log('[BatchInvalidation] No members found for guild', guildId);
      }
      return {
        total: 0,
        successful: 0,
        failed: 0,
        errors: [],
        duration: 0,
      };
    }

    // Extract addresses
    const addresses = members.map((m: any) => m.address).filter(Boolean) as `0x${string}`[];

    if (verbose) {
      console.log(
        `[BatchInvalidation] Found ${addresses.length} members to invalidate`
      );
    }

    return await batchInvalidateUserCache(addresses, options);
  } catch (error) {
    console.error(
      '[BatchInvalidation] Failed to invalidate guild members:',
      error
    );
    throw error;
  }
}

/**
 * Invalidate scoring cache for top N users on the leaderboard
 * 
 * Useful for ensuring leaderboard consistency after major events
 * 
 * @example
 * ```typescript
 * // Refresh top 100 users after season reset
 * await invalidateTopLeaderboard(100)
 * ```
 */
export async function invalidateTopLeaderboard(
  topN: number = 100,
  options: BatchInvalidationOptions = {}
): Promise<BatchInvalidationResult> {
  const { verbose = false } = options;

  if (verbose) {
    console.log(
      `[BatchInvalidation] Fetching top ${topN} leaderboard entries`
    );
  }

  try {
    // Fetch leaderboard from API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/leaderboard-v2?limit=${topN}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
    }

    const data = await response.json();
    const entries = data.leaderboard || data.data || [];

    if (entries.length === 0) {
      if (verbose) {
        console.log('[BatchInvalidation] No leaderboard entries found');
      }
      return {
        total: 0,
        successful: 0,
        failed: 0,
        errors: [],
        duration: 0,
      };
    }

    // Extract addresses
    const addresses = entries
      .map((entry: any) => entry.address || entry.walletAddress)
      .filter(Boolean) as `0x${string}`[];

    if (verbose) {
      console.log(
        `[BatchInvalidation] Found ${addresses.length} leaderboard entries to invalidate`
      );
    }

    return await batchInvalidateUserCache(addresses, options);
  } catch (error) {
    console.error(
      '[BatchInvalidation] Failed to invalidate leaderboard:',
      error
    );
    throw error;
  }
}
