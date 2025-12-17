/**
 * API Helpers - Cache Control & Response Utilities
 * 
 * Re-exports existing infrastructure to avoid duplication:
 * - Request-ID: lib/request-id.ts (existing)
 * - Idempotency: lib/idempotency.ts (Redis-backed, existing)
 * - Rate Limiting: lib/rate-limit.ts (Upstash Redis, existing)
 * 
 * PHASE: Phase 2 - API Infrastructure (Dec 15, 2025)
 * DATE: December 15, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - Core Plan: NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md (Phase 2 API)
 * - Existing Infrastructure: lib/request-id.ts, lib/idempotency.ts, lib/rate-limit.ts
 * 
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (8453)
 * 
 * @see lib/request-id.ts - Request-ID generation (existing)
 * @see lib/idempotency.ts - Redis-backed idempotency (existing)
 * @see lib/rate-limit.ts - Upstash Redis rate limiting (existing)
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
