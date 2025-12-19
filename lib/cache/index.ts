/**
 * Cache Layer - Unified Caching System (Phase 8.1 Complete)
 * 
 * =====================================================
 * CONSOLIDATED MULTI-LEVEL CACHING (Phase 8.1.1-8.1.6)
 * =====================================================
 * 
 * SERVER-SIDE CACHING (lib/cache/server.ts):
 * - Primary cache system with 3-tier architecture (L1/L2/L3)
 * - L1: Memory cache (1000 entries, fast)
 * - L2: Redis/KV cache (persistent, shared)
 * - L3: Filesystem cache (free-tier fallback)
 * - Features: Stale-while-revalidate, stampede prevention, graceful degradation
 * - Use for: API routes, server components, database queries
 * 
 * CLIENT-SIDE CACHING (lib/cache/client.ts):
 * - Browser-based caching (localStorage, sessionStorage, memory)
 * - CacheStorage class for structured caching
 * - Simple helpers: readStorageCache, writeStorageCache, clearStorageCache
 * - Use for: Client components, hooks, user preferences
 * 
 * SPECIALIZED CACHES:
 * - frame.ts: Frame-specific caching (Upstash Redis)
 * - contract-cache.ts: Contract data caching
 * - neynar-cache.ts: Neynar API caching
 * 
 * =====================================================
 * IMPORT PATTERNS
 * =====================================================
 * 
 * Server-side (RECOMMENDED):
 *   import { getCached, invalidateCache } from '@/lib/cache/server'
 * 
 * Client-side structured:
 *   import { CacheStorage } from '@/lib/cache/client'
 * 
 * Client-side simple:
 *   import { readStorageCache, writeStorageCache } from '@/lib/cache/client'
 * 
 * Frame caching:
 *   import { getCachedFrame, setCachedFrame } from '@/lib/cache/frame'
 * 
 * =====================================================
 * DEPRECATIONS (Phase 8.1)
 * =====================================================
 * 
 * ❌ DO NOT CREATE NEW INLINE CACHES:
 *    - const cache = new Map() // BAD - use getCached() instead
 *    - class ServerCache { ... } // BAD - moved to cache/server.ts
 *    - function memoizeAsync() { ... } // BAD - use getCached() instead
 * 
 * ✅ USE UNIFIED CACHE SYSTEM:
 *    - getCached('namespace', 'key', fetcher, {ttl: 60})
 *    - Automatic stale-while-revalidate
 *    - Automatic stampede prevention
 *    - Automatic graceful degradation
 * 
 * Note: Some functions have duplicate names (getCacheStats).
 * Import directly from specific files to avoid conflicts.
 */

// Export from server (main cache)
export { 
  getCached, 
  invalidateCache, 
  getCacheStats as getServerCacheStats,
  buildUserBadgesKey,
  buildUserProfileKey,
  buildBadgeTemplatesKey
} from './server'

// Export from client (Phase 8.1.6: Added storage cache helpers)
export { 
  CacheStorage, 
  getAllCacheStats, 
  clearAllCaches,
  readStorageCache,
  writeStorageCache,
  clearStorageCache
} from './client'

// Export from frame (avoid getCacheStats conflict)
export { 
  getCachedFrame, 
  setCachedFrame, 
  getCacheStats as getFrameCacheStats,
  type FrameCacheKey 
} from './frame'

// Specialized caches
export * from './contract-cache'
export * from './neynar-cache'
