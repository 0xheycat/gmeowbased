/**
 * Unified Cache Storage Utility
 * 
 * ⚠️ **CLIENT-SIDE CACHING ONLY** ⚠️
 * 
 * This module is for client components and hooks ONLY.
 * DO NOT import in API routes or server components (use lib/cache.ts for server-side caching).
 * 
 * Purpose:
 * - Cache user preferences and UI state
 * - Persist data across browser sessions (localStorage)
 * - Reduce unnecessary API calls from client
 * - Improve perceived performance
 * 
 * Provides a consistent caching layer with support for:
 * - localStorage (persistent across sessions)
 * - sessionStorage (cleared on tab close)
 * - memory (in-memory only, cleared on page reload)
 * 
 * Features:
 * - TTL-based expiration
 * - Automatic eviction when max entries reached
 * - Type-safe with generics
 * - SSR-safe (checks for window availability)
 * - Graceful degradation if storage unavailable
 * 
 * For server-side caching (database queries, API responses):
 * @see lib/cache.ts
 */

type StorageType = 'localStorage' | 'sessionStorage' | 'memory'

interface CacheOptions {
  storage: StorageType
  prefix: string
  ttl: number // Time to live in milliseconds
  maxEntries?: number
}

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class CacheStorage<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private readonly options: CacheOptions

  constructor(options: CacheOptions) {
    this.options = {
      ...options,
      maxEntries: options.maxEntries ?? 100,
    }
  }

  /**
   * Get a value from cache
   * @param key - Cache key (without prefix)
   * @returns Cached value or null if not found/expired
   */
  get(key: string): T | null {
    // Check memory cache first
    const memEntry = this.cache.get(key)
    if (memEntry && Date.now() < memEntry.expiresAt) {
      return memEntry.value
    }

    // Check persistent storage if available
    if (this.options.storage !== 'memory' && typeof window !== 'undefined') {
      try {
        const storage = this.getStorage()
        if (!storage) return null

        const fullKey = this.getFullKey(key)
        const item = storage.getItem(fullKey)
        
        if (item) {
          const parsed: CacheEntry<T> = JSON.parse(item)
          
          // Check if expired
          if (Date.now() < parsed.expiresAt) {
            // Restore to memory cache
            this.cache.set(key, parsed)
            return parsed.value
          }
          
          // Expired - remove from storage
          storage.removeItem(fullKey)
        }
      } catch (err) {
        // Storage quota exceeded or parsing error
        console.warn(`[CacheStorage] Failed to read from ${this.options.storage}:`, err)
      }
    }

    // Not found or expired
    this.cache.delete(key)
    return null
  }

  /**
   * Set a value in cache
   * @param key - Cache key (without prefix)
   * @param value - Value to cache
   */
  set(key: string, value: T): void {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + this.options.ttl,
    }

    // Store in memory
    this.cache.set(key, entry)

    // Store in persistent storage if available
    if (this.options.storage !== 'memory' && typeof window !== 'undefined') {
      try {
        const storage = this.getStorage()
        if (storage) {
          const fullKey = this.getFullKey(key)
          storage.setItem(fullKey, JSON.stringify(entry))
        }
      } catch (err) {
        // Storage quota exceeded - try to make space
        console.warn(`[CacheStorage] Failed to write to ${this.options.storage}:`, err)
        this.evictOldestEntry()
      }
    }

    // Evict old entries if needed
    if (this.options.maxEntries && this.cache.size > this.options.maxEntries) {
      this.evictOldestEntry()
    }
  }

  /**
   * Check if a key exists and is not expired
   * @param key - Cache key (without prefix)
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Delete a specific key from cache
   * @param key - Cache key (without prefix)
   */
  delete(key: string): void {
    this.cache.delete(key)

    if (this.options.storage !== 'memory' && typeof window !== 'undefined') {
      try {
        const storage = this.getStorage()
        if (storage) {
          storage.removeItem(this.getFullKey(key))
        }
      } catch (err) {
        console.warn(`[CacheStorage] Failed to delete from ${this.options.storage}:`, err)
      }
    }
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear()

    if (this.options.storage !== 'memory' && typeof window !== 'undefined') {
      try {
        const storage = this.getStorage()
        if (!storage) return

        // Remove all keys with our prefix
        const keys = Object.keys(storage)
        keys.forEach(key => {
          if (key.startsWith(this.options.prefix)) {
            storage.removeItem(key)
          }
        })
      } catch (err) {
        console.warn(`[CacheStorage] Failed to clear ${this.options.storage}:`, err)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    entries: Array<{ key: string; expiresAt: number; expiresIn: number }>
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      expiresAt: entry.expiresAt,
      expiresIn: Math.max(0, entry.expiresAt - Date.now()),
    }))

    return {
      size: this.cache.size,
      entries,
    }
  }

  /**
   * Evict expired entries from cache
   */
  evictExpired(): number {
    const now = Date.now()
    let evicted = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.delete(key)
        evicted++
      }
    }

    return evicted
  }

  private getFullKey(key: string): string {
    return `${this.options.prefix}${key}`
  }

  private getStorage(): Storage | null {
    try {
      if (this.options.storage === 'localStorage') {
        return window.localStorage
      } else if (this.options.storage === 'sessionStorage') {
        return window.sessionStorage
      }
    } catch {
      // Storage blocked or unavailable
      return null
    }
    return null
  }

  private evictOldestEntry(): void {
    // Find entry closest to expiration
    let oldestKey: string | null = null
    let oldestExpiry = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < oldestExpiry) {
        oldestExpiry = entry.expiresAt
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.delete(oldestKey)
    }
  }
}

/**
 * Shared cache instances for common use cases
 */

// Farcaster wallet verification cache (persistent, 2 minutes)
export const farcasterVerificationCache = new CacheStorage<boolean>({
  storage: 'localStorage',
  prefix: 'gmeow:farcaster:verified:',
  ttl: 120_000, // 2 minutes
  maxEntries: 100,
})

// Profile data cache (session-only, 1 minute)
export const profileDataCache = new CacheStorage<any>({
  storage: 'sessionStorage',
  prefix: 'gmeow:profile:data:',
  ttl: 60_000, // 1 minute
  maxEntries: 50,
})

// User context cache (persistent, 5 minutes)
export const userContextCache = new CacheStorage<any>({
  storage: 'localStorage',
  prefix: 'gmeow:user:context:',
  ttl: 300_000, // 5 minutes
  maxEntries: 10,
})

// Quest data cache (session-only, 30 seconds)
export const questDataCache = new CacheStorage<any>({
  storage: 'sessionStorage',
  prefix: 'gmeow:quest:data:',
  ttl: 30_000, // 30 seconds
  maxEntries: 50,
})

// Chain state cache (memory-only, 10 seconds)
export const chainStateCache = new CacheStorage<any>({
  storage: 'memory',
  prefix: 'gmeow:chain:state:',
  ttl: 10_000, // 10 seconds
  maxEntries: 20,
})

// Notification preferences cache (persistent, no expiration)
export const notificationPreferencesCache = new CacheStorage<any>({
  storage: 'localStorage',
  prefix: 'gmeow:notification:prefs:',
  ttl: 365 * 24 * 60 * 60 * 1000, // 1 year (effectively permanent)
  maxEntries: 20,
})

// Guild data cache (session-only, 2 minutes)
export const guildDataCache = new CacheStorage<any>({
  storage: 'sessionStorage',
  prefix: 'gmeow:guild:data:',
  ttl: 120_000, // 2 minutes
  maxEntries: 30,
})

/**
 * Utility: Clear all GMEOW caches
 */
export function clearAllCaches(): void {
  farcasterVerificationCache.clear()
  profileDataCache.clear()
  userContextCache.clear()
  questDataCache.clear()
  chainStateCache.clear()
  notificationPreferencesCache.clear()
  guildDataCache.clear()
}

/**
 * Utility: Get stats for all caches
 */
/**
 * Utility: Get stats for all caches
 */
export function getAllCacheStats(): Record<string, ReturnType<CacheStorage<any>['getStats']>> {
  return {
    farcasterVerification: farcasterVerificationCache.getStats(),
    profileData: profileDataCache.getStats(),
    userContext: userContextCache.getStats(),
    questData: questDataCache.getStats(),
    chainState: chainStateCache.getStats(),
    notificationPreferences: notificationPreferencesCache.getStats(),
    guildData: guildDataCache.getStats(),
  }
}
