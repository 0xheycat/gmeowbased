/**
 * Rate Limiter Utility
 * 
 * Purpose: Protect free tier API limits (Etherscan, etc.)
 * Pattern: Sliding window algorithm
 * 
 * Usage:
 * ```ts
 * const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 })
 * await limiter.wait() // Blocks until allowed
 * ```
 */

type RateLimiterConfig = {
  maxRequests: number
  windowMs: number
  keyPrefix?: string
}

type RequestRecord = {
  timestamp: number
  count: number
}

export class RateLimiter {
  private maxRequests: number
  private windowMs: number
  private keyPrefix: string
  private requests: Map<string, RequestRecord[]> = new Map()

  constructor(config: RateLimiterConfig) {
    this.maxRequests = config.maxRequests
    this.windowMs = config.windowMs
    this.keyPrefix = config.keyPrefix || 'rate-limit'
  }

  /**
   * Check if request is allowed (non-blocking)
   */
  check(key: string): { allowed: boolean; remaining: number; resetMs: number } {
    const fullKey = `${this.keyPrefix}:${key}`
    const now = Date.now()
    
    // Clean old requests
    this.cleanOldRequests(fullKey, now)
    
    const records = this.requests.get(fullKey) || []
    const currentCount = records.length
    
    if (currentCount >= this.maxRequests) {
      const oldestRequest = records[0]
      const resetMs = oldestRequest.timestamp + this.windowMs - now
      
      return {
        allowed: false,
        remaining: 0,
        resetMs: Math.max(0, resetMs),
      }
    }
    
    return {
      allowed: true,
      remaining: this.maxRequests - currentCount,
      resetMs: 0,
    }
  }

  /**
   * Wait until request is allowed (blocking)
   */
  async wait(key: string = 'default'): Promise<void> {
    const fullKey = `${this.keyPrefix}:${key}`
    
    while (true) {
      const result = this.check(key)
      
      if (result.allowed) {
        // Record this request
        const records = this.requests.get(fullKey) || []
        records.push({ timestamp: Date.now(), count: 1 })
        this.requests.set(fullKey, records)
        return
      }
      
      // Wait until next slot available
      await new Promise((resolve) => setTimeout(resolve, result.resetMs + 10))
    }
  }

  /**
   * Clean up old requests outside the window
   */
  private cleanOldRequests(key: string, now: number): void {
    const records = this.requests.get(key)
    if (!records) return
    
    const validRecords = records.filter((r) => now - r.timestamp < this.windowMs)
    
    if (validRecords.length === 0) {
      this.requests.delete(key)
    } else {
      this.requests.set(key, validRecords)
    }
  }

  /**
   * Reset all rate limits (testing only)
   */
  reset(): void {
    this.requests.clear()
  }
}
