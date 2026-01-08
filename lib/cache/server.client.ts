/**
 * Client-side stub for server-only cache module
 * This file is used when cache/server is imported in client components
 * All functions throw errors or return empty values to prevent usage
 */

export function getCached(): never {
  throw new Error('getCached() is server-only and cannot be used in client components')
}

export function invalidateCache(): never {
  throw new Error('invalidateCache() is server-only and cannot be used in client components')
}

export function invalidateCachePattern(): never {
  throw new Error('invalidateCachePattern() is server-only and cannot be used in client components')
}

export function clearCacheNamespace(): never {
  throw new Error('clearCacheNamespace() is server-only and cannot be used in client components')
}

export function getCacheStats() {
  return { hits: 0, misses: 0, hitRate: 0 }
}

export class ServerCache {
  constructor() {
    throw new Error('ServerCache is server-only and cannot be used in client components')
  }
}

export const serverCache = null as any
export const localCache = null as any
