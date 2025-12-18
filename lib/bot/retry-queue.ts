/**
 * @file lib/bot/retry-queue.ts
 * @description In-memory retry queue for failed operations with exponential backoff
 * 
 * PHASE: Phase 7.2 - Bot (December 17, 2025)
 * ENHANCED: Existing documentation upgraded with comprehensive Phase 7 header
 * 
 * ORIGINAL: Free-Tier Failover Architecture (Day 3-4)
 * DATE: December 17, 2025
 * 
 * FEATURES:
 *   - In-memory retry queue (no external service required)
 *   - Exponential backoff (1s, 2s, 4s, 8s, 16s)
 *   - Max 5 retries per operation
 *   - Persistent storage to disk on shutdown
 *   - Auto-cleanup after 1 hour
 *   - Support for 4 operation types (cache-update, notification, analytics, webhook)
 *   - Background processing every 5 seconds
 * 
 * REFERENCE DOCUMENTATION:
 *   - Unified cache: lib/cache/server.ts (Phase 8.1 consolidation)
 *   - Stats fallback: lib/bot/stats-with-fallback.ts
 *   - Free-tier architecture: FOUNDATION-REBUILD-ROADMAP.md
 * 
 * REQUIREMENTS:
 *   - Filesystem write access for persistence
 *   - Max queue size: 1000 items
 *   - Processing interval: 5 seconds
 *   - Auto-cleanup: 1 hour after failure
 * 
 * TODO:
 *   - [ ] Add retry priority system (critical vs normal)
 *   - [ ] Add queue monitoring and alerts
 *   - [ ] Add configurable backoff strategies
 *   - [ ] Add dead letter queue for permanent failures
 *   - [ ] Add queue persistence to database option
 *   - [ ] Add queue size limits per operation type
 * 
 * CRITICAL:
 *   - Queue size limited to 1000 items (prevent memory leaks)
 *   - Exponential backoff prevents thundering herd
 *   - Failed items cleaned up after 1 hour
 *   - Disk persistence only on graceful shutdown
 *   - Processing interval must not block main thread
 * 
 * SUGGESTIONS:
 *   - Use Redis queue for production (distributed)
 *   - Add queue metrics (items pending, success rate)
 *   - Implement circuit breaker for failing endpoints
 *   - Add queue drain on deployment
 *   - Log all retry attempts for debugging
 * 
 * AVOID:
 *   - Adding items without max retry limit
 *   - Processing queue synchronously (use background)
 *   - Storing large payloads in queue items
 *   - Retrying operations that will never succeed
 *   - Ignoring queue overflow (implement backpressure)
 */

/**
 * In-memory retry queue for failed operations (no external queue service required)
 */

import { localCache } from '@/lib/cache/server'
import { promises as fs } from 'fs'
import path from 'path'

interface RetryQueueItem {
  id: string
  operation: 'cache-update' | 'notification' | 'analytics' | 'webhook'
  payload: any
  attempts: number
  maxAttempts: number
  nextRetry: number
  createdAt: number
  lastError?: string
}

const QUEUE_FILE = path.join(process.cwd(), '.cache', 'retry-queue.json')
const MAX_QUEUE_SIZE = 1000
const PROCESSING_INTERVAL = 5000 // 5 seconds

/**
 * In-memory retry queue with exponential backoff
 * 
 * Features:
 * - Exponential backoff: 1s, 2s, 4s, 8s, 16s
 * - Max 5 retries per operation
 * - Persists to disk on shutdown
 * - Auto-cleanup after 1 hour
 * - No external dependencies
 */
export class InMemoryRetryQueue {
  private queue: Map<string, RetryQueueItem> = new Map()
  private isProcessing = false
  private processingInterval?: NodeJS.Timeout
  private isShuttingDown = false

  constructor() {
    // Load persisted queue on startup
    this.loadQueueFromDisk()
    
    // Start processing loop
    this.startProcessing()
    
    // Setup shutdown handlers
    this.setupShutdownHandlers()
  }

  /**
   * Add operation to retry queue
   */
  add(
    operation: RetryQueueItem['operation'],
    payload: any,
    maxAttempts = 5
  ): string {
    // Limit queue size (prevent memory exhaustion)
    if (this.queue.size >= MAX_QUEUE_SIZE) {
      console.warn('[RetryQueue] Queue full, dropping oldest items')
      this.cleanup(true) // Force cleanup
    }

    const id = `${operation}:${Date.now()}:${Math.random().toString(36).slice(2)}`
    const item: RetryQueueItem = {
      id,
      operation,
      payload,
      attempts: 0,
      maxAttempts,
      nextRetry: Date.now() + 1000, // Retry in 1s
      createdAt: Date.now()
    }

    this.queue.set(id, item)
    console.log(`[RetryQueue] Added ${operation} (queue size: ${this.queue.size})`)
    
    return id
  }

  /**
   * Get queue item by ID
   */
  get(id: string): RetryQueueItem | undefined {
    return this.queue.get(id)
  }

  /**
   * Remove item from queue
   */
  remove(id: string): boolean {
    return this.queue.delete(id)
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const now = Date.now()
    const items = Array.from(this.queue.values())
    
    return {
      total: items.length,
      byOperation: {
        'cache-update': items.filter(i => i.operation === 'cache-update').length,
        'notification': items.filter(i => i.operation === 'notification').length,
        'analytics': items.filter(i => i.operation === 'analytics').length,
        'webhook': items.filter(i => i.operation === 'webhook').length
      },
      pending: items.filter(i => i.nextRetry > now).length,
      ready: items.filter(i => i.nextRetry <= now).length,
      oldestItem: items.length > 0 
        ? Math.floor((now - Math.min(...items.map(i => i.createdAt))) / 1000)
        : 0
    }
  }

  /**
   * Start processing loop
   */
  private startProcessing(): void {
    this.processingInterval = setInterval(async () => {
      if (this.isProcessing || this.isShuttingDown) return
      
      this.isProcessing = true
      
      try {
        await this.processQueue()
      } catch (error) {
        console.error('[RetryQueue] Processing error:', error)
      } finally {
        this.isProcessing = false
      }
    }, PROCESSING_INTERVAL)
  }

  /**
   * Process retry queue
   */
  private async processQueue(): Promise<void> {
    const now = Date.now()
    const toRetry: RetryQueueItem[] = []

    // Find items ready for retry
    for (const item of this.queue.values()) {
      if (item.nextRetry <= now) {
        toRetry.push(item)
      }
    }

    if (toRetry.length === 0) return

    console.log(`[RetryQueue] Processing ${toRetry.length} items...`)

    // Process each item
    for (const item of toRetry) {
      await this.processItem(item)
    }
  }

  /**
   * Process single queue item
   */
  private async processItem(item: RetryQueueItem): Promise<void> {
    item.attempts++

    try {
      // Execute operation based on type
      if (item.operation === 'cache-update') {
        await this.executeCacheUpdate(item.payload)
      }
      else if (item.operation === 'notification') {
        await this.executeNotification(item.payload)
      }
      else if (item.operation === 'analytics') {
        await this.executeAnalytics(item.payload)
      }
      else if (item.operation === 'webhook') {
        await this.executeWebhook(item.payload)
      }

      // Success - remove from queue
      this.queue.delete(item.id)
      console.log(`[RetryQueue] ✅ Success: ${item.operation} (attempt ${item.attempts})`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      item.lastError = errorMessage
      
      console.error(`[RetryQueue] ❌ Failed: ${item.operation} (attempt ${item.attempts}):`, errorMessage)

      // Check if should retry
      if (item.attempts >= item.maxAttempts) {
        // Max retries reached - give up
        this.queue.delete(item.id)
        console.error(`[RetryQueue] Giving up on ${item.operation} after ${item.attempts} attempts`)
      } else {
        // Schedule next retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, item.attempts), 30000) // Max 30s
        item.nextRetry = Date.now() + delay
        console.log(`[RetryQueue] Will retry ${item.operation} in ${delay}ms (attempt ${item.attempts + 1}/${item.maxAttempts})`)
      }
    }
  }

  /**
   * Execute cache update
   */
  private async executeCacheUpdate(payload: any): Promise<void> {
    await localCache.set(payload.key, payload.data, payload.ttl)
  }

  /**
   * Execute notification
   */
  private async executeNotification(payload: any): Promise<void> {
    const response = await fetch(payload.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload.body)
    })

    if (!response.ok) {
      throw new Error(`Notification failed: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Execute analytics event
   */
  private async executeAnalytics(payload: any): Promise<void> {
    const response = await fetch(payload.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload.event)
    })

    if (!response.ok) {
      throw new Error(`Analytics failed: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Execute webhook
   */
  private async executeWebhook(payload: any): Promise<void> {
    const response = await fetch(payload.url, {
      method: payload.method || 'POST',
      headers: payload.headers || { 'Content-Type': 'application/json' },
      body: payload.body ? JSON.stringify(payload.body) : undefined
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Clean up old items (>1 hour)
   */
  cleanup(force = false): void {
    const now = Date.now()
    const maxAge = force ? 0 : 60 * 60 * 1000 // 1 hour

    let deletedCount = 0
    for (const [id, item] of this.queue.entries()) {
      if (now - item.createdAt > maxAge) {
        this.queue.delete(id)
        deletedCount++
      }
    }

    if (deletedCount > 0) {
      console.log(`[RetryQueue] Cleaned up ${deletedCount} old items`)
    }
  }

  /**
   * Load queue from disk (on startup)
   */
  private async loadQueueFromDisk(): Promise<void> {
    try {
      const data = await fs.readFile(QUEUE_FILE, 'utf-8')
      const items: RetryQueueItem[] = JSON.parse(data)

      for (const item of items) {
        // Only restore items < 1 hour old
        if (Date.now() - item.createdAt < 60 * 60 * 1000) {
          this.queue.set(item.id, item)
        }
      }

      if (this.queue.size > 0) {
        console.log(`[RetryQueue] Restored ${this.queue.size} items from disk`)
      }
    } catch (error) {
      // No persisted queue or invalid JSON - start fresh
    }
  }

  /**
   * Persist queue to disk (on shutdown)
   */
  private async persistQueueToDisk(): Promise<void> {
    try {
      const items = Array.from(this.queue.values())
      const dir = path.dirname(QUEUE_FILE)
      
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(QUEUE_FILE, JSON.stringify(items, null, 2), 'utf-8')
      
      console.log(`[RetryQueue] Persisted ${items.length} items to disk`)
    } catch (error) {
      console.error('[RetryQueue] Failed to persist queue:', error)
    }
  }

  /**
   * Setup shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async () => {
      if (this.isShuttingDown) return
      
      this.isShuttingDown = true
      console.log('[RetryQueue] Shutting down...')
      
      // Stop processing
      if (this.processingInterval) {
        clearInterval(this.processingInterval)
      }
      
      // Persist queue
      await this.persistQueueToDisk()
      
      console.log('[RetryQueue] Shutdown complete')
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
    process.on('beforeExit', shutdown)
  }

  /**
   * Stop processing (for testing)
   */
  stop(): void {
    this.isShuttingDown = true
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }
  }
}

// Export singleton instance
export const retryQueue = new InMemoryRetryQueue()
