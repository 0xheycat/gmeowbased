/**
 * @file lib/notifications/api-helpers.ts
 * @description Cache control and response utilities for notification APIs
 * 
 * PHASE: Phase 7.7 - Notifications Module (December 18, 2025)
 * 
 * FEATURES:
 *   - Re-export middleware utilities (request-id, idempotency, rate-limit)
 *   - Cache-Control header generation (CDN optimization)
 *   - Preferences endpoint caching (60s CDN, 120s stale)
 *   - History endpoint caching (30s CDN, 60s stale)
 *   - Stale-while-revalidate pattern (serve stale while refreshing)
 *   - Centralized caching strategy (avoid duplication)
 * 
 * REFERENCE DOCUMENTATION:
 *   - Request-ID: lib/middleware/request-id.ts
 *   - Idempotency: lib/middleware/idempotency.ts (Redis-backed)
 *   - Rate Limiting: lib/middleware/rate-limit.ts (Upstash Redis)
 *   - Cache Strategy: HTTP caching RFC 7234
 *   - API Usage: app/api/user/notification-preferences/[fid]/route.ts
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Base (8453)
 *   - Redis: Upstash for idempotency and rate limiting
 *   - CDN: Vercel Edge Network for caching
 * 
 * TODO:
 *   - [ ] Add dynamic cache TTL based on update frequency
 *   - [ ] Implement cache invalidation API
 *   - [ ] Add cache hit/miss tracking
 *   - [ ] Support custom cache keys (user-specific, category-specific)
 *   - [ ] Implement cache warming (pre-populate hot data)
 *   - [ ] Add cache bypass headers (debugging, admin)
 *   - [ ] Support cache tags (group invalidation)
 *   - [ ] Add cache compression (gzip, brotli)
 * 
 * CRITICAL:
 *   - Preferences cache = 60s (less frequently updated)
 *   - History cache = 30s (more frequently updated)
 *   - Always use stale-while-revalidate (better UX)
 *   - s-maxage applies to CDN only (not browser)
 *   - Re-exports avoid code duplication (DRY principle)
 *   - All middleware uses Redis (Upstash) for consistency
 * 
 * SUGGESTIONS:
 *   - Consider implementing cache versioning (bust on schema change)
 *   - Add cache preloading for authenticated users
 *   - Implement cache partitioning (hot vs cold data)
 *   - Add cache monitoring dashboard (hit rate, eviction rate)
 *   - Support cache multi-region replication
 *   - Implement cache fallback (serve stale on Redis failure)
 *   - Add cache analytics (popular endpoints, cache efficiency)
 * 
 * AVOID:
 *   - ❌ DON'T duplicate middleware code (use re-exports)
 *   - ❌ DON'T cache sensitive data (personal info, tokens)
 *   - ❌ DON'T use overly long cache TTLs (stale data issues)
 *   - ❌ DON'T forget stale-while-revalidate (better than no cache)
 *   - ❌ DON'T cache POST/PUT/DELETE responses (only GET)
 *   - ❌ DON'T mix s-maxage with max-age (use s-maxage for CDN)
 *   - ❌ DON'T cache error responses (4xx, 5xx status codes)
 *   - ❌ DON'T implement custom caching logic (use existing middleware)
 */

// Re-export existing infrastructure (no duplication)
export { generateRequestId, getOrGenerateRequestId } from '@/lib/middleware/request-id'
export { 
  checkIdempotency, 
  storeIdempotency, 
  getIdempotencyKey,
  isValidIdempotencyKey,
  returnCachedResponse
} from '@/lib/middleware/idempotency'
export type { IdempotencyResult } from '@/lib/middleware/idempotency'

/**
 * Generate Cache-Control header for preferences endpoint
 * 
 * Strategy: s-maxage=60, stale-while-revalidate=120
 * - Cache for 60 seconds at CDN
 * - Serve stale for 120 seconds while revalidating
 * - Reduces DB load for frequently accessed preferences
 * 
 * @returns Cache-Control header string
 */
export function getPreferencesCacheControl(): string {
  return 's-maxage=60, stale-while-revalidate=120'
}

/**
 * Generate Cache-Control header for notification history endpoint
 * 
 * Strategy: s-maxage=30, stale-while-revalidate=60
 * - Cache for 30 seconds at CDN (more frequently updated)
 * - Serve stale for 60 seconds while revalidating
 * 
 * @returns Cache-Control header string
 */
export function getNotificationsCacheControl(): string {
  return 's-maxage=30, stale-while-revalidate=60'
}
