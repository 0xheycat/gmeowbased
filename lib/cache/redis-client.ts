/**
 * Redis Client Configuration
 * Phase 7 Priority 2: Caching Layer
 * 
 * Provides centralized Redis connection management for caching across the application.
 * 
 * Features:
 * - Singleton pattern for connection pooling
 * - Automatic reconnection with exponential backoff
 * - Environment-based configuration
 * - Health check support
 * - Error handling and logging
 * 
 * Usage:
 * ```typescript
 * import redis from '@/lib/cache/redis-client'
 * await getRedisClient().set('key', 'value', 'EX', 300) // 5 minute TTL
 * const value = await getRedisClient().get('key')
 * ```
 * 
 * Environment Variables:
 * - REDIS_HOST: Redis server hostname (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 * - REDIS_DB: Redis database number (default: 0)
 * 
 * @module lib/cache/redis-client
 */

import Redis from 'ioredis'

// Lazy-load Redis client to avoid build-time connection attempts
let _redis: Redis | null = null
let isShuttingDown = false

function getRedisClient(): Redis {
  if (_redis) return _redis

  // Redis configuration from environment
  // Use REDIS_URL (full connection string for Upstash) or fallback to individual params
  const redisUrl = process.env.REDIS_URL

  const REDIS_CONFIG = redisUrl 
    ? redisUrl // Use connection string (Upstash format: rediss://...)
    : {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
      }

  const redisOptions = {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true, // Don't connect immediately during build
    retryStrategy: (times: number) => {
      // Exponential backoff: 50ms, 100ms, 200ms, 400ms, ... up to 2s
      const delay = Math.min(times * 50, 2000)
      console.log(`[Redis] Retry attempt ${times}, waiting ${delay}ms`)
      return delay
    },
    reconnectOnError: (err: Error) => {
      const targetError = 'READONLY'
      if (err.message.includes(targetError)) {
        // Reconnect on READONLY errors (replica promotion)
        return true
      }
      return false
    },
  }

  // Create Redis client instance with connection string or config object
  _redis = typeof REDIS_CONFIG === 'string' 
    ? new Redis(REDIS_CONFIG, redisOptions)
    : new Redis({ ...REDIS_CONFIG, ...redisOptions })

  // Event handlers
  _redis.on('connect', () => {
    console.log('[Redis] Connected to Redis server')
  })

  _redis.on('ready', () => {
    console.log('[Redis] Redis client ready')
  })

  _redis.on('error', (err: Error) => {
    console.error('[Redis] Redis client error:', err.message)
  })

  _redis.on('close', () => {
    console.log('[Redis] Redis connection closed')
  })

  _redis.on('reconnecting', (delay: number) => {
    console.log(`[Redis] Reconnecting in ${delay}ms`)
  })

  return _redis
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (isShuttingDown || !_redis) return
  isShuttingDown = true
  console.log('[Redis] SIGTERM received, closing Redis connection')
  try {
    // Only quit if connection is active (not already closed/ended)
    if (_redis.status === 'ready' || _redis.status === 'connect' || _redis.status === 'connecting') {
      await _redis.quit()
      console.log('[Redis] Redis connection gracefully closed')
    } else {
      console.log(`[Redis] Connection already ${_redis.status}, skipping quit`)
    }
  } catch (error) {
    // Ignore errors during shutdown
    console.log('[Redis] Error during shutdown (ignored):', error instanceof Error ? error.message : 'unknown')
  }
})

process.on('SIGINT', async () => {
  if (isShuttingDown || !_redis) return
  isShuttingDown = true
  console.log('[Redis] SIGINT received, closing Redis connection')
  try {
    // Only quit if connection is active (not already closed/ended)
    if (_redis.status === 'ready' || _redis.status === 'connect' || _redis.status === 'connecting') {
      await _redis.quit()
      console.log('[Redis] Redis connection gracefully closed')
    } else {
      console.log(`[Redis] Connection already ${_redis.status}, skipping quit`)
    }
  } catch (error) {
    // Ignore errors during shutdown
    console.log('[Redis] Error during shutdown (ignored):', error instanceof Error ? error.message : 'unknown')
  }
})

/**
 * Helper: Check Redis connection health
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await getRedisClient().ping()
    return result === 'PONG'
  } catch (error) {
    console.error('[Redis] Health check failed:', error)
    return false
  }
}

/**
 * Helper: Get Redis info
 */
export async function getRedisInfo() {
  try {
    const info = await getRedisClient().info('stats')
    const memory = await getRedisClient().info('memory')
    const dbsize = await getRedisClient().dbsize()
    
    return {
      connected: getRedisClient().status === 'ready',
      totalKeys: dbsize,
      info,
      memory,
    }
  } catch (error) {
    console.error('[Redis] Failed to get info:', error)
    return null
  }
}

/**
 * Helper: Clear all cache (use with caution)
 */
export async function clearAllCache(): Promise<number> {
  try {
    const keys = await getRedisClient().keys('*')
    if (keys.length === 0) return 0
    
    const deleted = await getRedisClient().del(...keys)
    console.log(`[Redis] Cleared ${deleted} cache entries`)
    return deleted
  } catch (error) {
    console.error('[Redis] Failed to clear cache:', error)
    return 0
  }
}

/**
 * Helper: Clear cache by pattern
 */
export async function clearCacheByPattern(pattern: string): Promise<number> {
  try {
    const keys = await getRedisClient().keys(pattern)
    if (keys.length === 0) return 0
    
    const deleted = await getRedisClient().del(...keys)
    console.log(`[Redis] Cleared ${deleted} cache entries matching ${pattern}`)
    return deleted
  } catch (error) {
    console.error('[Redis] Failed to clear cache by pattern:', error)
    return 0
  }
}

// Export Redis client as default
export default getRedisClient()
