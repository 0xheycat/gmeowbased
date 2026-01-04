/**
 * Neynar Profile Cache
 * 
 * Caches Neynar API responses in Upstash Redis for 30x performance improvement
 * TTL: 1 hour (profiles rarely change)
 * 
 * NO HARDCODED COLORS
 * NO EMOJIS
 */

import { Redis } from '@upstash/redis'

// Initialize Redis client (Vercel KV = Upstash Redis)
// Safe initialization: Falls back to null if env vars missing
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

export type CachedNeynarUser = {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  cachedAt: number
}

const CACHE_PREFIX = 'neynar:user:'
const CACHE_PREFIX_ADDR = 'neynar:addr:'
const CACHE_TTL = 1800 // 30 minutes in seconds (optimized from 1 hour)

/**
 * Get Neynar user from cache
 * @param fid - Farcaster FID
 * @returns Cached user data or null
 */
export async function getCachedNeynarUser(
  fid: number
): Promise<CachedNeynarUser | null> {
  // Skip cache if Redis not configured
  if (!redis) {
    console.warn('[Neynar Cache] Redis not configured, skipping cache')
    return null
  }

  try {
    const key = `${CACHE_PREFIX}${fid}`
    const cached = await redis.get<CachedNeynarUser>(key)
    
    if (cached) {
      console.log(`[neynar-cache] HIT: FID ${fid}`)
      return cached
    }
    
    console.log(`[neynar-cache] MISS: FID ${fid}`)
    return null
  } catch (error) {
    console.error('[neynar-cache] Get error:', error)
    return null
  }
}

/**
 * Set Neynar user in cache
 * @param fid - Farcaster FID
 * @param data - User data to cache
 */
export async function setCachedNeynarUser(
  fid: number,
  data: Omit<CachedNeynarUser, 'cachedAt'>
): Promise<void> {
  // Skip cache if Redis not configured
  if (!redis) {
    return
  }

  try {
    const key = `${CACHE_PREFIX}${fid}`
    const cacheData: CachedNeynarUser = {
      ...data,
      cachedAt: Date.now(),
    }
    
    await redis.setex(key, CACHE_TTL, cacheData)
    console.log(`[neynar-cache] SET: FID ${fid} (TTL: ${CACHE_TTL}s)`)
  } catch (error) {
    console.error('[neynar-cache] Set error:', error)
  }
}

/**
 * Get multiple Neynar users from cache in batch
 * @param fids - Array of Farcaster FIDs
 * @returns Map of FID to cached user data
 */
export async function getBatchCachedNeynarUsers(
  fids: number[]
): Promise<Map<number, CachedNeynarUser>> {
  const results = new Map<number, CachedNeynarUser>()
  
  try {
    // Fetch all keys in parallel
    const promises = fids.map(async (fid) => {
      const user = await getCachedNeynarUser(fid)
      if (user) {
        results.set(fid, user)
      }
    })
    
    await Promise.all(promises)
    console.log(`[neynar-cache] BATCH: ${results.size}/${fids.length} hits`)
  } catch (error) {
    console.error('[neynar-cache] Batch get error:', error)
  }
  
  return results
}

/**
 * Invalidate Neynar user cache
 * @param fid - Farcaster FID
 */
export async function invalidateCachedNeynarUser(fid: number): Promise<void> {
  if (!redis) return

  try {
    const key = `${CACHE_PREFIX}${fid}`
    await redis.del(key)
    console.log(`[neynar-cache] INVALIDATE: FID ${fid}`)
  } catch (error) {
    console.error('[neynar-cache] Invalidate error:', error)
  }
}

/**
 * Get Neynar user by address from cache
 * @param address - Wallet address (lowercase)
 * @returns Cached user data or null
 */
export async function getCachedNeynarUserByAddress(
  address: string
): Promise<CachedNeynarUser | null> {
  if (!redis) {
    console.warn('[Neynar Cache] Redis not configured, skipping cache')
    return null
  }

  try {
    const key = `${CACHE_PREFIX_ADDR}${address.toLowerCase()}`
    const cached = await redis.get<CachedNeynarUser>(key)
    
    if (cached) {
      console.log(`[neynar-cache] HIT (address): ${address}`)
      return cached
    }
    
    console.log(`[neynar-cache] MISS (address): ${address}`)
    return null
  } catch (error) {
    console.error('[neynar-cache] Get by address error:', error)
    return null
  }
}

/**
 * Set Neynar user by address in cache
 * @param address - Wallet address (lowercase)
 * @param data - User data to cache
 */
export async function setCachedNeynarUserByAddress(
  address: string,
  data: Omit<CachedNeynarUser, 'cachedAt'>
): Promise<void> {
  if (!redis) {
    return
  }

  try {
    const key = `${CACHE_PREFIX_ADDR}${address.toLowerCase()}`
    const cacheData: CachedNeynarUser = {
      ...data,
      cachedAt: Date.now(),
    }
    
    await redis.setex(key, CACHE_TTL, cacheData)
    console.log(`[neynar-cache] SET (address): ${address} (TTL: ${CACHE_TTL}s)`)
  } catch (error) {
    console.error('[neynar-cache] Set by address error:', error)
  }
}

/**
 * Get multiple Neynar users by addresses from cache in batch
 * @param addresses - Array of wallet addresses (lowercase)
 * @returns Map of address to cached user data
 */
export async function getBatchCachedNeynarUsersByAddress(
  addresses: string[]
): Promise<Map<string, CachedNeynarUser>> {
  const results = new Map<string, CachedNeynarUser>()
  
  if (!redis || addresses.length === 0) {
    return results
  }

  try {
    // Fetch all addresses in parallel
    const promises = addresses.map(async (addr) => {
      const user = await getCachedNeynarUserByAddress(addr)
      if (user) {
        results.set(addr.toLowerCase(), user)
      }
    })
    
    await Promise.all(promises)
    console.log(`[neynar-cache] BATCH (addresses): ${results.size}/${addresses.length} hits (${((results.size / addresses.length) * 100).toFixed(1)}%)`)
  } catch (error) {
    console.error('[neynar-cache] Batch get by address error:', error)
  }
  
  return results
}

/**
 * Set multiple Neynar users by addresses in cache
 * @param users - Map of address to user data
 */
export async function setBatchCachedNeynarUsersByAddress(
  users: Map<string, Omit<CachedNeynarUser, 'cachedAt'>>
): Promise<void> {
  if (!redis || users.size === 0) {
    return
  }

  try {
    const promises = Array.from(users.entries()).map(([addr, data]) =>
      setCachedNeynarUserByAddress(addr, data)
    )
    
    await Promise.all(promises)
    console.log(`[neynar-cache] BATCH SET (addresses): ${users.size} users`)
  } catch (error) {
    console.error('[neynar-cache] Batch set by address error:', error)
  }
}

/**
 * Get cache statistics
 * @returns Cache stats object
 */
export async function getNeynarCacheStats(): Promise<{
  totalKeys: number
  sampleKeys: string[]
}> {
  if (!redis) {
    return { totalKeys: 0, sampleKeys: [] }
  }

  try {
    // Get all keys with prefix (limit to 100 for performance)
    const keys = await redis.keys(`${CACHE_PREFIX}*`)
    
    return {
      totalKeys: keys.length,
      sampleKeys: keys.slice(0, 10),
    }
  } catch (error) {
    console.error('[neynar-cache] Stats error:', error)
    return {
      totalKeys: 0,
      sampleKeys: [],
    }
  }
}
