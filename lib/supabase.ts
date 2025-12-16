/**
 * Unified Supabase Client - Phase 12: MCP Integration
 * 
 * Strategy:
 * - Reuses old foundation patterns (ServerCache, timeout handling)
 * - Edge-safe client for Edge Runtime (API routes, middleware)
 * - Server-safe client for Node.js runtime (server actions, SSR)
 * - MCP-ready for migrations and schema management
 * 
 * Priority Order (from old foundation):
 * 1. Service Role Key (admin operations, RLS bypass)
 * 2. Anon Key (public operations, RLS enforced)
 * 
 * Based on: backups/pre-migration-20251126-213424/lib/supabase-server.ts
 * UI: NEVER use old foundation UI/UX
 * Logic: 100% reuse + improvements
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// ========================================
// Server-Side Cache (from old foundation)
// ========================================

type CacheEntry<T> = {
  data: T
  timestamp: number
}

export class ServerCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private ttl: number

  constructor(ttlMs: number) {
    this.ttl = ttlMs
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    if (age > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  size(): number {
    return this.cache.size
  }
}

// ========================================
// Configuration & Validation
// ========================================

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  )
}

export function getSupabaseConfig() {
  if (!isSupabaseConfigured()) {
    return null
  }

  return {
    url: process.env.SUPABASE_URL as string,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined,
    anonKey: process.env.SUPABASE_ANON_KEY as string,
  }
}

// ========================================
// Server Client (Node.js Runtime)
// ========================================

let cachedServerClient: SupabaseClient<Database> | null = null

/**
 * Get server-side Supabase client (Node.js runtime)
 * 
 * Features from old foundation:
 * - Caches client instance for reuse
 * - 10s timeout on all requests
 * - Service Role Key prioritized (admin operations)
 * - Anon Key fallback (public operations)
 * - No session persistence
 * 
 * Usage:
 * - Server Components
 * - API Routes (App Router)
 * - Server Actions
 * - Cron Jobs
 * 
 * @returns SupabaseClient or null if not configured
 */
export function getSupabaseServerClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) return null
  if (cachedServerClient) return cachedServerClient

  const config = getSupabaseConfig()
  if (!config) return null

  const url = config.url
  const key = config.serviceRoleKey || config.anonKey

  cachedServerClient = createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'gmeow-server/2.0.0',
      },
      fetch: (url, options = {}) => {
        // Add 10s timeout (from old foundation)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId))
      },
    },
  })

  return cachedServerClient
}

// ========================================
// Edge Client (Edge Runtime)
// ========================================

let cachedEdgeClient: SupabaseClient<Database> | null = null

/**
 * Get edge-safe Supabase client (Edge Runtime)
 * 
 * Features:
 * - Edge Runtime compatible (no Node.js APIs)
 * - 5s timeout (faster than server, Edge is time-limited)
 * - Anon Key only (Edge Runtime security best practice)
 * - No session persistence
 * 
 * Usage:
 * - Edge API Routes
 * - Middleware
 * - Edge Functions
 * 
 * @returns SupabaseClient or null if not configured
 */
export function getSupabaseEdgeClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) return null
  if (cachedEdgeClient) return cachedEdgeClient

  const config = getSupabaseConfig()
  if (!config) return null

  const url = config.url
  const key = config.anonKey // Edge Runtime uses Anon Key only

  cachedEdgeClient = createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'gmeow-edge/2.0.0',
      },
      fetch: (url, options = {}) => {
        // 5s timeout for Edge Runtime
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId))
      },
    },
  })

  return cachedEdgeClient
}

// ========================================
// Admin Client (Service Role Key Only)
// ========================================

let cachedAdminClient: SupabaseClient<Database> | null = null

/**
 * Get admin Supabase client with Service Role Key
 * 
 * Features:
 * - Bypasses Row-Level Security (RLS)
 * - Full database access
 * - Service Role Key REQUIRED
 * 
 * ⚠️ WARNING: Use with caution!
 * - Never expose to client-side
 * - Never use in Edge Runtime
 * - Only for trusted server-side operations
 * 
 * Usage:
 * - Database migrations
 * - Admin operations
 * - Batch processing
 * - MCP tool operations
 * 
 * @returns SupabaseClient or null if Service Role Key not configured
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[Supabase] Admin client requires SUPABASE_SERVICE_ROLE_KEY')
    return null
  }

  if (cachedAdminClient) return cachedAdminClient

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  cachedAdminClient = createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'gmeow-admin/2.0.0',
      },
      fetch: (url, options = {}) => {
        // 15s timeout for admin operations (longer for migrations)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId))
      },
    },
  })

  return cachedAdminClient
}

// ========================================
// Browser Client (Client-Side Components)
// ========================================

let cachedBrowserClient: SupabaseClient<Database> | null = null

/**
 * Get browser-safe Supabase client (singleton)
 * 
 * Features:
 * - Single instance shared across all client components
 * - Prevents "Multiple GoTrueClient instances" warning
 * - Anon Key only (public operations, RLS enforced)
 * - Session persistence enabled for auth
 * 
 * Usage:
 * - Client Components ('use client')
 * - Browser-side operations
 * - User-scoped queries
 * 
 * @returns SupabaseClient or null if not configured
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (typeof window === 'undefined') {
    console.warn('[Supabase] Browser client called on server-side')
    return null
  }
  
  if (cachedBrowserClient) return cachedBrowserClient
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return null
  }
  
  cachedBrowserClient = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'gmeow-browser/2.0.0',
      },
    },
  })
  
  return cachedBrowserClient
}

// ========================================
// Utility Functions (from old foundation)
// ========================================

/**
 * Clear all cached Supabase clients
 * 
 * Useful for:
 * - Testing (reset state between tests)
 * - Hot module reload (development)
 * - Environment changes
 */
export function clearSupabaseCache(): void {
  cachedServerClient = null
  cachedEdgeClient = null
  cachedAdminClient = null
  cachedBrowserClient = null
}

/**
 * Test Supabase connection
 * 
 * @returns true if connection successful, false otherwise
 */
export async function testSupabaseConnection(): Promise<boolean> {
  const client = getSupabaseServerClient()
  if (!client) return false

  try {
    const { error } = await client.from('user_profiles').select('id').limit(1)
    return !error
  } catch (error) {
    console.error('[Supabase] Connection test failed:', error)
    return false
  }
}

// ========================================
// Type Exports
// ========================================

export type { Database } from '@/types/supabase'
export type { SupabaseClient } from '@supabase/supabase-js'
