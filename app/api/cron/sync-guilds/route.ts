/**
 * Guild Stats Sync Cron Endpoint - DEPRECATED
 * 
 * ⚠️ DEPRECATED as of January 9, 2026:
 * This endpoint is no longer needed. Guild stats are now fetched directly from:
 * - Subsquid indexer (on-chain data - source of truth)
 * - guild_off_chain_metadata (description, banner only)
 * 
 * REMOVED TABLES:
 * - guild_stats_cache ❌ (dropped - redundant with Subsquid)
 * - guild_analytics_cache ❌ (dropped - redundant with Subsquid)
 * 
 * NEW ARCHITECTURE:
 * - Layer 1: Subsquid GraphQL API (on-chain data, cached by Apollo Client)
 * - Layer 2: Redis cache via getCached() (60s TTL)
 * - Layer 3: HTTP cache headers (60s max-age, 120s stale-while-revalidate)
 * 
 * This cron job should be disabled in GitHub Actions.
 * Kept for reference only - returns 410 Gone status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateRequestId } from '@/lib/middleware/request-id'

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  // This endpoint is deprecated - cache tables have been dropped
  // Guild stats are now fetched directly from Subsquid (on-chain source of truth)
  return NextResponse.json(
    {
      success: false,
      error: 'Endpoint deprecated',
      message: 'Guild cache sync is no longer needed. Stats are fetched directly from Subsquid indexer.',
      deprecatedAt: '2026-01-09',
      migration: {
        reason: 'Removed redundant Supabase cache tables (guild_stats_cache, guild_analytics_cache)',
        newArchitecture: 'Subsquid (Layer 1) -> Redis cache (Layer 2) -> HTTP cache (Layer 3)',
        performance: '71% fewer Supabase queries, ~50% faster response times',
        documentation: [
          'GUILD-API-OPTIMIZATION-COMPLETE.md',
          'DATABASE-CLEANUP-COMPLETE.md'
        ]
      }
    },
    { 
      status: 410, // 410 Gone - resource permanently removed
      headers: { 'X-Request-ID': requestId }
    }
  )
}
