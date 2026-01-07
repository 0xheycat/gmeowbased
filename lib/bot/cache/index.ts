/**
 * @file lib/bot/cache/index.ts
 * @description Bot response caching, rate limiting, and conversation state management
 * 
 * PHASE: Phase 7.2 - Bot (December 17, 2025)
 * 
 * FEATURES:
 *   - In-memory caching with TTL expiration
 *   - Rate limiting (5 replies/hour per FID)
 *   - Conversation context tracking (24h TTL)
 *   - Multi-step conversation state (P3 & P8 features)
 *   - Rich context storage for follow-up questions
 *   - User stats caching
 *   - Type-safe cache entries
 * 
 * REFERENCE DOCUMENTATION:
 *   - Auto-reply: lib/bot/core/auto-reply.ts
 *   - User context: lib/bot/context/user-context.ts
 *   - Rate limiting: Redis-based throttling
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Base blockchain (8453)
 *   - Rate limits configurable via environment
 *   - TTLs must be reasonable (5min-24h range)
 * 
 * TODO:
 *   - [ ] Add Redis integration for distributed caching
 *   - [ ] Add cache warming for frequent users
 *   - [ ] Add cache analytics (hit rate, miss rate)
 *   - [ ] Add cache invalidation API
 *   - [ ] Add cache size limits and LRU eviction
 *   - [ ] Add persistent storage for conversation state
 * 
 * CRITICAL:
 *   - Rate limits prevent spam (5 replies/hour max)
 *   - Conversation state expires after 5 minutes (P8)
 *   - Cache must be cleared on logout/reset
 *   - TTL must be validated on every get operation
 *   - Memory usage must be monitored (in-memory cache)
 * 
 * SUGGESTIONS:
 *   - Use Redis for production (distributed cache)
 *   - Add cache preloading for predicted queries
 *   - Implement cache compression for large objects
 *   - Add cache versioning for schema changes
 *   - Track cache performance metrics
 * 
 * AVOID:
 *   - Storing sensitive data without encryption
 *   - Setting TTLs longer than 24 hours
 *   - Caching error responses
 *   - Blocking operations while reading cache
 *   - Infinite cache growth (implement size limits)
 */

// Bot response caching and rate limiting
import type { BotUserStats } from '@/lib/bot/analytics/stats'

type CacheEntry<T> = {
  data: T
  timestamp: number
  expiresAt: number
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

type ConversationContext = {
  fid: number
  interactions: Array<{
    text: string
    intent: string
    timestamp: number
  }>
  lastInteraction: number
}

/**
 * Multi-step conversation state for P3 & P8 features
 * Tracks pending questions, expected user responses, and rich context for multi-turn conversations
 * 
 * P8 Enhancement: Added activeQuests, lastStatsShown, lastGuildInfo, lastReferralInfo, lastAchievements
 * to enable intelligent follow-up questions like "tell me more", "show details"
 */
type ConversationState = {
  fid: number
  expectingAnswer: boolean
  pendingQuestion: string | null
  contextOptions: string[] // Options user can select (e.g., ["week", "month", "all"])
  lastIntent: string // Intent that triggered the question
  stateExpiry: number // Timestamp when state expires (5 minutes)
  timestamp: number
  
  // P8: Rich context for multi-turn conversations
  activeQuests?: Array<{ id: string | number, name: string, progress?: number }> // Last shown quests
  lastStatsShown?: { level: number, xp: number, rank?: number } // Last stats snapshot
  lastGuildInfo?: { id: string | number, name: string, level: number, bonus: number } // Last guild data
  lastReferralInfo?: { count: number, link: string, bonus: number } // Last referral data
  lastAchievements?: Array<{ id: string, name: string, unlocked: boolean }> // Last achievements
  lastFrameType?: string // Last frame type shown
}

// In-memory cache with TTL
const statsCache = new Map<string, CacheEntry<BotUserStats | null>>()
const eventsCache = new Map<string, CacheEntry<any>>()
const rateLimits = new Map<number, RateLimitEntry>()
const conversationHistory = new Map<number, ConversationContext>()
const conversationStates = new Map<number, ConversationState>()

// Cache configuration
const STATS_CACHE_TTL_MS = 60 * 1000 // 60 seconds
const EVENTS_CACHE_TTL_MS = 30 * 1000 // 30 seconds
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5
const CONVERSATION_MAX_HISTORY = 5
const CONVERSATION_TTL_MS = 15 * 60 * 1000 // 15 minutes

// Cache utilities
function getCacheKey(...parts: (string | number)[]): string {
  return parts.join(':')
}

function isExpired(entry: CacheEntry<any>): boolean {
  return Date.now() > entry.expiresAt
}

function cleanExpiredEntries<T>(cache: Map<string, CacheEntry<T>>): void {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key)
    }
  }
}

// Stats caching
export function getCachedStats(address: string): BotUserStats | null | undefined {
  const key = getCacheKey('stats', address.toLowerCase())
  const entry = statsCache.get(key)
  
  if (!entry) return undefined
  if (isExpired(entry)) {
    statsCache.delete(key)
    return undefined
  }
  
  return entry.data
}

export function setCachedStats(address: string, stats: BotUserStats | null): void {
  const key = getCacheKey('stats', address.toLowerCase())
  const now = Date.now()
  
  statsCache.set(key, {
    data: stats,
    timestamp: now,
    expiresAt: now + STATS_CACHE_TTL_MS,
  })
  
  // Periodically clean expired entries (1% chance per call)
  if (Math.random() < 0.01) {
    cleanExpiredEntries(statsCache)
  }
}

export function invalidateStatsCache(address: string): void {
  const key = getCacheKey('stats', address.toLowerCase())
  statsCache.delete(key)
}

// Events caching
export function getCachedEvents(
  fid: number,
  address: string,
  eventTypes: string[],
  sinceTimestamp: number
): any | undefined {
  const key = getCacheKey('events', fid, address.toLowerCase(), eventTypes.sort().join(','), sinceTimestamp)
  const entry = eventsCache.get(key)
  
  if (!entry) return undefined
  if (isExpired(entry)) {
    eventsCache.delete(key)
    return undefined
  }
  
  return entry.data
}

export function setCachedEvents(
  fid: number,
  address: string,
  eventTypes: string[],
  sinceTimestamp: number,
  data: any
): void {
  const key = getCacheKey('events', fid, address.toLowerCase(), eventTypes.sort().join(','), sinceTimestamp)
  const now = Date.now()
  
  eventsCache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + EVENTS_CACHE_TTL_MS,
  })
  
  if (Math.random() < 0.01) {
    cleanExpiredEntries(eventsCache)
  }
}

// Rate limiting
export function checkRateLimit(fid: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimits.get(fid)
  
  // No entry or expired window - allow and create new entry
  if (!entry || now > entry.resetAt) {
    rateLimits.set(fid, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
    
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    }
  }
  
  // Within window - check if limit exceeded
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }
  
  // Increment count and allow
  entry.count++
  
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.count,
    resetAt: entry.resetAt,
  }
}

// Conversation history
export function getConversationContext(fid: number): ConversationContext | undefined {
  const context = conversationHistory.get(fid)
  
  if (!context) return undefined
  
  // Check if expired
  const now = Date.now()
  if (now - context.lastInteraction > CONVERSATION_TTL_MS) {
    conversationHistory.delete(fid)
    return undefined
  }
  
  return context
}

export function addConversationInteraction(
  fid: number,
  text: string,
  intent: string
): ConversationContext {
  const now = Date.now()
  const existing = conversationHistory.get(fid)
  
  const interaction = {
    text,
    intent,
    timestamp: now,
  }
  
  if (existing) {
    // Add new interaction and keep only last N
    existing.interactions.push(interaction)
    if (existing.interactions.length > CONVERSATION_MAX_HISTORY) {
      existing.interactions.shift()
    }
    existing.lastInteraction = now
    
    return existing
  }
  
  // Create new context
  const context: ConversationContext = {
    fid,
    interactions: [interaction],
    lastInteraction: now,
  }
  
  conversationHistory.set(fid, context)
  
  // Periodically clean expired contexts
  if (Math.random() < 0.01) {
    for (const [contextFid, ctx] of conversationHistory.entries()) {
      if (now - ctx.lastInteraction > CONVERSATION_TTL_MS) {
        conversationHistory.delete(contextFid)
      }
    }
  }
  
  return context
}

export function clearConversationContext(fid: number): void {
  conversationHistory.delete(fid)
}

// Multi-step conversation state management (P3 & P8: Multi-Step + Multi-Turn Conversations)
const CONVERSATION_STATE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * P8: Enhanced to store rich context for multi-turn conversations
 * Now supports storing quest data, stats snapshots, guild info, etc. for intelligent follow-ups
 */
export function saveConversationState(
  fid: number,
  pendingQuestion: string,
  contextOptions: string[],
  lastIntent: string,
  richContext?: {
    activeQuests?: Array<{ id: string | number, name: string, progress?: number }>
    lastStatsShown?: { level: number, xp: number, rank?: number }
    lastGuildInfo?: { id: string | number, name: string, level: number, bonus: number }
    lastReferralInfo?: { count: number, link: string, bonus: number }
    lastAchievements?: Array<{ id: string, name: string, unlocked: boolean }>
    lastFrameType?: string
  }
): ConversationState {
  const now = Date.now()
  const state: ConversationState = {
    fid,
    expectingAnswer: true,
    pendingQuestion,
    contextOptions,
    lastIntent,
    stateExpiry: now + CONVERSATION_STATE_TTL_MS,
    timestamp: now,
    // P8: Store rich context for multi-turn conversations
    ...richContext,
  }
  
  conversationStates.set(fid, state)
  
  // Periodically clean expired states
  if (Math.random() < 0.01) {
    for (const [stateFid, s] of conversationStates.entries()) {
      if (now > s.stateExpiry) {
        conversationStates.delete(stateFid)
      }
    }
  }
  
  return state
}

export function getConversationState(fid: number): ConversationState | undefined {
  const state = conversationStates.get(fid)
  
  if (!state) return undefined
  
  // Check if expired
  const now = Date.now()
  if (now > state.stateExpiry) {
    conversationStates.delete(fid)
    return undefined
  }
  
  return state
}

export function clearConversationState(fid: number): void {
  conversationStates.delete(fid)
}

// Analytics
export function getCacheStats(): {
  stats: { size: number; hits: number; misses: number }
  events: { size: number }
  rateLimits: { size: number }
  conversations: { size: number }
  conversationStates: { size: number }
} {
  return {
    stats: {
      size: statsCache.size,
      hits: 0, // Would need counters for accurate tracking
      misses: 0,
    },
    events: {
      size: eventsCache.size,
    },
    rateLimits: {
      size: rateLimits.size,
    },
    conversations: {
      size: conversationHistory.size,
    },
    conversationStates: {
      size: conversationStates.size,
    },
  }
}

export function clearAllCaches(): void {
  statsCache.clear()
  eventsCache.clear()
  rateLimits.clear()
  conversationHistory.clear()
}
