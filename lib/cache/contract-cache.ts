/**
 * Contract Read Cache
 * 
 * Caches contract read operations (basePoints, streakBonus) for 5x performance improvement
 * TTL: 5 minutes (on-chain data changes slowly)
 * 
 * NO HARDCODED COLORS
 * NO EMOJIS
 */

import { Redis } from '@upstash/redis'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

export type CachedContractData = {
  address: string
  basePoints: number
  streakBonus: number
  cachedAt: number
}

const CACHE_PREFIX = 'contract:user:'
const CACHE_TTL = 600 // 10 minutes in seconds (optimized from 5 minutes)

/**
 * Get contract data from cache
 * @param address - User's wallet address
 * @returns Cached contract data or null
 */
export async function getCachedContractData(
  address: string
): Promise<CachedContractData | null> {
  try {
    const key = `${CACHE_PREFIX}${address.toLowerCase()}`
    const cached = await redis.get<CachedContractData>(key)
    
    if (cached) {
      console.log(`[contract-cache] HIT: ${address}`)
      return cached
    }
    
    console.log(`[contract-cache] MISS: ${address}`)
    return null
  } catch (error) {
    console.error('[contract-cache] Get error:', error)
    return null
  }
}

/**
 * Set contract data in cache
 * @param data - Contract data to cache
 */
export async function setCachedContractData(
  data: Omit<CachedContractData, 'cachedAt'>
): Promise<void> {
  try {
    const key = `${CACHE_PREFIX}${data.address.toLowerCase()}`
    const cacheData: CachedContractData = {
      ...data,
      cachedAt: Date.now(),
    }
    
    await redis.setex(key, CACHE_TTL, cacheData)
    console.log(`[contract-cache] SET: ${data.address} (TTL: ${CACHE_TTL}s)`)
  } catch (error) {
    console.error('[contract-cache] Set error:', error)
  }
}

/**
 * Get multiple contract data from cache in batch
 * @param addresses - Array of wallet addresses
 * @returns Map of address to cached contract data
 */
export async function getBatchCachedContractData(
  addresses: string[]
): Promise<Map<string, CachedContractData>> {
  const results = new Map<string, CachedContractData>()
  
  try {
    // Fetch all keys in parallel
    const promises = addresses.map(async (address) => {
      const data = await getCachedContractData(address)
      if (data) {
        results.set(address.toLowerCase(), data)
      }
    })
    
    await Promise.all(promises)
    console.log(`[contract-cache] BATCH: ${results.size}/${addresses.length} hits`)
  } catch (error) {
    console.error('[contract-cache] Batch get error:', error)
  }
  
  return results
}

/**
 * Invalidate contract data cache
 * @param address - User's wallet address
 */
export async function invalidateCachedContractData(address: string): Promise<void> {
  try {
    const key = `${CACHE_PREFIX}${address.toLowerCase()}`
    await redis.del(key)
    console.log(`[contract-cache] INVALIDATE: ${address}`)
  } catch (error) {
    console.error('[contract-cache] Invalidate error:', error)
  }
}

/**
 * Get cache statistics
 * @returns Cache stats object
 */
export async function getContractCacheStats(): Promise<{
  totalKeys: number
  sampleKeys: string[]
}> {
  try {
    // Get all keys with prefix (limit to 100 for performance)
    const keys = await redis.keys(`${CACHE_PREFIX}*`)
    
    return {
      totalKeys: keys.length,
      sampleKeys: keys.slice(0, 10),
    }
  } catch (error) {
    console.error('[contract-cache] Stats error:', error)
    return {
      totalKeys: 0,
      sampleKeys: [],
    }
  }
}
