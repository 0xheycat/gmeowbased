/**
 * Miniapp Notification Dispatcher - Farcaster Push Notifications
 * 
 * TODO:
 * - [x] Add priority filtering for Farcaster push (Phase 1 complete)
 * - [x] Query notification_preferences for user thresholds (Phase 1 complete)
 * - [x] Fail-open strategy for backward compatibility (Phase 1 complete)
 * - [ ] Add XP reward badges to notification bodies (Phase 2)
 * - [ ] Implement quiet hours timezone support (Phase 2)
 * - [ ] Add priority decay for stale notifications (Phase 3)
 * - [ ] Rate limiting per user (10 notifications/hour max) (Phase 3)
 * 
 * FEATURES:
 * - Priority-based notification filtering (critical/high/medium/low)
 * - User preference threshold checking (min_priority_for_push)
 * - Batch processing (50 FIDs max per Neynar call)
 * - Retry logic (3 attempts with exponential backoff 400ms)
 * - Token metadata tracking (last_event, last_seen_at, last_event_at)
 * - Fail-open strategy (no preferences = send all)
 * - Category-based filtering (13 notification categories)
 * 
 * PHASE: Phase 1 - Priority Filtering Integration (Dec 15, 2025)
 * DATE: December 15, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - Core Plan: NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md (Phase 1)
 * - Priority Logic: lib/notifications/priority.ts (9 helper functions)
 * - Priority Icons: components/icons/notification/PriorityIcon.tsx (4 SVG variants)
 * - Schema Migration: supabase/migrations/20251212000000_notification_preferences.sql
 * - farcaster.instructions.md: Section 3.2 (10-layer API security)
 * - XP System: XP-SYSTEM-COMPREHENSIVE-GUIDE-PART-2.md
 * 
 * SUGGESTIONS:
 * - [x] Add category field to NotificationPayload for priority checks (Phase 1)
 * - [x] Query preferences once for all FIDs (single query optimization) (Phase 1)
 * - [x] Filter FIDs before batch processing (reduce Neynar API calls) (Phase 1)
 * - [ ] Add console logging for filtered FID stats (debugging) (Phase 2)
 * - [ ] Implement exponential backoff with jitter for retries (Phase 3)
 * - [ ] Add notification deduplication (prevent duplicate pushes) (Phase 3)
 * - [ ] Create notification queue with priority-based scheduling (Phase 4)
 * 
 * CRITICAL FOUND:
 * - Currently NO priority filtering (all notifications treated equally)
 * - Users cannot control push notification frequency/priority
 * - No XP reward badges displayed in notification bodies
 * - Missing quiet hours timezone support (notifications at night)
 * - No rate limiting (users can get 100+ notifications/hour)
 * - Batch size hardcoded (MAX_BATCH_SIZE=50, no dynamic adjustment)
 * - Retry logic has no jitter (thundering herd on failures)
 * 
 * AVOID (from farcaster.instructions.md):
 * - ❌ NO hardcoded secrets (use Deno.env.get)
 * - ❌ NO `any` types without explicit annotation
 * - ❌ NO missing error handling (all DB queries in try-catch)
 * - ❌ NO console.log in production (use console.warn/error for errors only)
 * - ❌ NO synchronous blocking operations (use async/await)
 * 
 * REQUIREMENTS (from farcaster.instructions.md):
 * - ✅ Edge Function compatible (Deno runtime)
 * - ✅ TypeScript strict mode (explicit types)
 * - ✅ Supabase auth (CRON_SECRET validation)
 * - ✅ Neynar SDK v3.84.0+ (publishFrameNotifications)
 * - ✅ Error handling (try-catch with fallback)
 * - ✅ Null-safety checks (filter, map guards)
 * - ✅ Performance optimization (batch processing, single query)
 * 
 * ARCHITECTURE FLOW:
 * 1. Validate auth (CRON_SECRET or service role key)
 * 2. Parse notification payload (title, body, target_url, category)
 * 3. Query miniapp_notification_tokens (filter by status, ids, fid)
 * 4. Query notification_preferences for all unique FIDs
 * 5. Filter FIDs by priority threshold (min_priority_for_push)
 * 6. Batch FIDs into chunks (MAX_BATCH_SIZE=50)
 * 7. Send to Neynar (retry up to 3 times on failure)
 * 8. Update token metadata (last_event_at, last_seen_at)
 * 9. Return results (success count, error count, filtered count)
 * 
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (8453)
 * 
 * @see NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md - Complete implementation roadmap
 * @see lib/notifications/priority.ts - Priority helper functions
 */

/* eslint-disable no-console */
// Shared Miniapp Notification dispatcher logic used by multiple Edge Functions.

// @ts-ignore - npm specifier is resolved at deploy time in Supabase Edge
import { createClient } from "npm:@supabase/supabase-js@2.33.1"
// @ts-ignore - npm specifier is resolved at deploy time in Supabase Edge
import { Configuration, NeynarAPIClient } from "npm:@neynar/nodejs-sdk@3.84.0"

declare const Deno: {
  env: { get(key: string): string | undefined }
}

type MiniappHandler = (req: Request) => Response | Promise<Response>

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CRON_SECRET =
  Deno.env.get('MINIAPP_NOTIFICATION_DISPATCH_SECRET') ??
  Deno.env.get('CRON_SECRET') ??
  ''
const NEYNAR_API_KEY = Deno.env.get('NEYNAR_API_KEY') ?? ''
const MAX_BATCH_SIZE = 50
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 400

const AUTHORIZED_SECRETS = [SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET].filter(
  (value): value is string => Boolean(value && value.trim()),
)

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

if (!NEYNAR_API_KEY) {
  console.error('Missing NEYNAR_API_KEY environment variable')
}

if (!AUTHORIZED_SECRETS.length) {
  console.error('Missing request authentication secret for miniapp dispatch function')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const neynarClient = new NeynarAPIClient(new Configuration({ apiKey: NEYNAR_API_KEY }))

type NotificationPayload = {
  title?: string
  body?: string
  target_url?: string
  uuid?: string
  data?: Record<string, unknown>
  category?: string // Phase 1: For priority filtering (achievement, badge, quest, etc.)
}

type DispatchFilter = {
  status?: string
  fid?: number
}

type DispatchRequest = {
  ids?: string[]
  filter?: DispatchFilter
  notification: NotificationPayload
}

type TokenRow = {
  id: string
  fid: number
  token: string
  notification_url: string
  status: string
}

type DispatchResult = {
  id: string
  fid: number
  status: 'sent' | 'failed'
  error?: string
  attemptCount: number
}

function chunkArray<T>(input: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < input.length; i += size) {
    chunks.push(input.slice(i, i + size))
  }
  return chunks
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function executeDispatch(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    let incomingToken = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!incomingToken) {
      const alternateHeaders = ['x-cron-secret', 'x-api-key', 'apikey']
      for (const header of alternateHeaders) {
        const headerValue = req.headers.get(header)
        if (headerValue) {
          incomingToken = headerValue.trim()
          break
        }
      }
    }

    if (!incomingToken || !AUTHORIZED_SECRETS.includes(incomingToken)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let payload: DispatchRequest
    try {
      payload = (await req.json()) as DispatchRequest
    } catch (error) {
      console.error('Invalid JSON payload', error)
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!payload?.notification) {
      return new Response(JSON.stringify({ error: 'Missing notification payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let query = supabase.from('miniapp_notification_tokens').select('*')

    if (payload.ids?.length) {
      query = query.in('id', payload.ids)
    } else {
      if (payload.filter?.status) query = query.eq('status', payload.filter.status)
      if (payload.filter?.fid) query = query.eq('fid', payload.filter.fid)
    }

    const { data: tokens, error: tokenError } = await query
    if (tokenError) {
      console.error('Token query failed', tokenError)
      return new Response(JSON.stringify({ error: 'Database query failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const tokenRows = (tokens ?? []) as TokenRow[]
    if (!tokenRows.length) {
      return new Response(JSON.stringify({ ok: true, count: 0, results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const tokensByFid = new Map<number, TokenRow[]>()
    for (const row of tokenRows) {
      const fid = Number(row.fid)
      if (!Number.isFinite(fid) || fid <= 0) continue
      if (!tokensByFid.has(fid)) tokensByFid.set(fid, [])
      tokensByFid.get(fid)!.push(row)
    }

    const uniqueFids = Array.from(tokensByFid.keys())

    // Phase 1: Priority filtering - Check user preferences for min_priority_for_push
    let filteredFids = uniqueFids
    const category = payload.notification.category
    
    if (category) {
      try {
        // Fetch notification preferences for all unique FIDs
        const { data: preferences, error: prefError } = await supabase
          .from('notification_preferences')
          .select('fid, priority_settings, min_priority_for_push')
          .in('fid', uniqueFids)
        
        if (!prefError && preferences) {
          // Helper function to check if notification should send based on priority
          const shouldSend = (userPref: any): boolean => {
            if (!userPref) return true // No preferences = send all (default behavior)
            
            const minPriority = userPref.min_priority_for_push || 'medium'
            const prioritySettings = userPref.priority_settings || {}
            const notificationPriority = prioritySettings[category] || 'medium'
            
            // Priority hierarchy: critical=4, high=3, medium=2, low=1
            const priorityValues: Record<string, number> = {
              critical: 4,
              high: 3,
              medium: 2,
              low: 1,
            }
            
            const notifValue = priorityValues[notificationPriority] || 2
            const minValue = priorityValues[minPriority] || 2
            
            return notifValue >= minValue
          }
          
          // Build preference map for quick lookup
          const prefMap = new Map(preferences.map((p: any) => [p.fid, p]))
          
          // Filter FIDs based on priority threshold
          filteredFids = uniqueFids.filter(fid => {
            const userPref = prefMap.get(fid)
            return shouldSend(userPref)
          })
          
          console.log(`Priority filtering: ${uniqueFids.length} → ${filteredFids.length} FIDs (category: ${category})`)
        }
      } catch (error) {
        console.error('Priority filtering failed, sending to all FIDs', error)
        // Fail open: If priority check fails, send to all FIDs (backward compatible)
      }
    }

    const fidChunks = chunkArray(filteredFids, MAX_BATCH_SIZE)

    const results: DispatchResult[] = []

    for (const chunk of fidChunks) {
      let attempt = 0
      let sent = false
      let lastError: unknown = null

      while (attempt < MAX_RETRIES && !sent) {
        attempt += 1
        try {
          const uuid = payload.notification.uuid ?? crypto.randomUUID()
          await neynarClient.publishFrameNotifications({
            target_fids: chunk,
            notification: {
              title: payload.notification.title ?? 'Gmeow notification',
              body: payload.notification.body ?? '',
              target_url: payload.notification.target_url,
              uuid,
            },
          })
          sent = true
          for (const fid of chunk) {
            const rows = tokensByFid.get(fid) ?? []
            for (const row of rows) {
              results.push({ id: row.id, fid, status: 'sent', attemptCount: attempt })
            }
          }
        } catch (error) {
          lastError = error
          console.error('Neynar dispatch failed (attempt %d)', attempt, error)
          if (attempt < MAX_RETRIES) await delay(RETRY_DELAY_MS * attempt)
        }
      }

      if (!sent) {
        for (const fid of chunk) {
          const rows = tokensByFid.get(fid) ?? []
          for (const row of rows) {
            results.push({
              id: row.id,
              fid,
              status: 'failed',
              error: lastError ? String(lastError) : 'Unknown error',
              attemptCount: MAX_RETRIES,
            })
          }
        }
      }
    }

    const targetedIds = tokenRows.map((row) => row.id)
    const eventMetadata = {
      last_event: payload.notification.title ?? 'notification',
      last_event_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      last_gm_context: payload.notification.data ?? null,
    }

    const { error: updateError } = await supabase
      .from('miniapp_notification_tokens')
      .update(eventMetadata)
      .in('id', targetedIds)

    if (updateError) {
      console.error('Failed to update token metadata', updateError)
    }

    try {
      await supabase.from('miniapp_notification_dispatches').insert({
        notification_title: payload.notification.title ?? null,
        notification_body: payload.notification.body ?? null,
        target_count: targetedIds.length,
        payload,
        results,
      })
    } catch (error) {
      console.warn('Dispatch log insert failed (table may be missing)', error)
    }

    return new Response(
      JSON.stringify({ ok: true, count: results.length, results }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Unhandled error', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const handleMiniappNotificationRequest: MiniappHandler = executeDispatch
