/**
 * Notification Preferences API - Priority System Integration
 * 
 * TODO:
 * - [ ] Add rate limiting per user (10 requests/minute) [Phase 3 - lib/rate-limit.ts ready]
 * - [x] Add Request-ID header for tracing [COMPLETED - Phase 2, uses lib/request-id.ts]
 * - [x] Add idempotency key support for PATCH [COMPLETED - Phase 2, uses lib/idempotency.ts Redis]
 * - [ ] Add preference change audit logging [Phase 3 - requires audit_logs table]
 * 
 * FEATURES:
 * - GET: Fetch user preferences with priority settings
 * - PATCH: Update preferences including priority thresholds
 * - Default values for priority system (medium threshold, XP enabled)
 * - Automatic priority_last_updated timestamp
 * - Upsert logic (creates if not exists)
 * 
 * PHASE: Phase 2 - Priority System API Integration (Dec 15, 2025)
 * DATE: December 15, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - Core Plan: NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md
 * - Priority Logic: lib/notifications/priority.ts (validatePrioritySettings, DEFAULT_PRIORITY_MAP)
 * - UI Component: components/notifications/NotificationSettings.tsx
 * - farcaster.instructions.md: Section 3.2 (10-layer API security)
 * 
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (8453)
 * 
 * @see NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md - Phase 2 API implementation
 * @see lib/notifications/priority.ts - Priority helper functions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/edge'
import { trackError } from '@/lib/notifications/error-tracking'
import { validatePrioritySettings, DEFAULT_PRIORITY_MAP } from '@/lib/notifications/priority'
import type { NotificationPriority } from '@/lib/notifications/priority'
import { 
  generateRequestId, 
  getPreferencesCacheControl,
  checkIdempotency,
  storeIdempotency,
  returnCachedResponse,
  isValidIdempotencyKey 
} from '@/lib/notifications/api-helpers'

// Default preferences (returned when user has no saved preferences)
const DEFAULT_PREFERENCES = {
  globalMute: false,
  muteUntil: null,
  categorySettings: {
    gm: { enabled: true, push: false },
    quest: { enabled: true, push: true },
    badge: { enabled: true, push: true },
    tip: { enabled: true, push: true },
    mention: { enabled: true, push: true },
    guild: { enabled: true, push: false },
    level: { enabled: true, push: true },
    rank: { enabled: true, push: false },
    social: { enabled: true, push: false },
    achievement: { enabled: true, push: true },
    reward: { enabled: true, push: true },
    streak: { enabled: true, push: false },
    system: { enabled: true, push: false },
  },
  // Phase 2: Priority system defaults
  prioritySettings: DEFAULT_PRIORITY_MAP,
  minPriorityForPush: 'medium' as NotificationPriority,
  xpRewardsDisplay: true,
  priorityLastUpdated: null,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: 'UTC',
  },
}

/**
 * GET /api/notifications/preferences?fid=123
 * Fetch user's notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const fid = request.nextUrl.searchParams.get('fid')
    
    if (!fid) {
      return NextResponse.json({ error: 'Missing fid parameter' }, { status: 400 })
    }
    
    // Initialize Supabase client with server-side auth
    // This client respects RLS policies (users can only access own preferences)
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed', requestId: 'internal' },
        { status: 503 }
      )
    }
    
    // Query preferences with single() to ensure only one row returned
    // PGRST116 error code means no rows found (not an error, return defaults)
    const { data, error } = await (supabase as any)
      .from('notification_preferences')
      .select('*')
      .eq('fid', parseInt(fid))
      .single()
    
    // Not found is ok - return defaults
    if (error && error.code === 'PGRST116') {
      return NextResponse.json({
        fid: parseInt(fid),
        ...DEFAULT_PREFERENCES,
      })
    }
    
    if (error) {
      trackError('notification_preferences_fetch_error', error, { function: 'GET', fid })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Transform database format (snake_case) to API format (camelCase)
    // All fields have fallback defaults to ensure consistent response shape
    const response = NextResponse.json({
      fid: data.fid,
      walletAddress: data.wallet_address,
      globalMute: data.global_mute,
      muteUntil: data.mute_until,
      // Category settings: { category: { enabled: bool, push: bool } }
      categorySettings: data.category_settings,
      // Phase 2: Priority system fields with defaults
      // prioritySettings: Maps each category to priority level (critical/high/medium/low)
      prioritySettings: data.priority_settings || DEFAULT_PRIORITY_MAP,
      // minPriorityForPush: Threshold for Farcaster push (default: medium)
      // Only notifications >= this priority trigger push
      minPriorityForPush: data.min_priority_for_push || 'medium',
      // xpRewardsDisplay: Toggle XP badges in notification bodies (default: true)
      xpRewardsDisplay: data.xp_rewards_display ?? true,
      // priorityLastUpdated: Analytics timestamp for last priority change
      priorityLastUpdated: data.priority_last_updated,
      quietHours: {
        enabled: data.quiet_hours_enabled,
        start: data.quiet_hours_start,
        end: data.quiet_hours_end,
        timezone: data.quiet_hours_timezone,
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    })
    
    // Phase 2 TODO RESOLVED: Add Request-ID header for distributed tracing
    // Generate unique ID for this request (helps correlate logs across services)
    // Format: req_<timestamp>_<random> (e.g., req_1702598400000_a7b3c9)
    const requestId = generateRequestId()
    response.headers.set('X-Request-ID', requestId)
    
    // Phase 2: Add Cache-Control for CDN optimization
    // Strategy: s-maxage=60 (cache 60s), stale-while-revalidate=120
    // Reduces DB load for frequently accessed preferences
    response.headers.set('Cache-Control', getPreferencesCacheControl())
    
    return response
  } catch (err) {
    trackError('notification_preferences_get_error', err, { function: 'GET' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/notifications/preferences
 * Update user's notification preferences (upsert)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Phase 2 TODO RESOLVED: Idempotency key support
    // Check for Idempotency-Key header to prevent duplicate updates
    // If same key sent twice within 24h, return cached response (prevents double-clicks)
    const idempotencyKey = request.headers.get('Idempotency-Key')
    
    // Validate idempotency key format if provided
    // Format: uuid, timestamp, or any alphanumeric string (max 255 chars)
    if (idempotencyKey && !isValidIdempotencyKey(idempotencyKey)) {
      return NextResponse.json(
        { error: 'Invalid idempotency key format', details: 'Must be alphanumeric with max 255 chars' },
        { status: 400 }
      )
    }
    
    // Check if this idempotency key was already processed
    // Returns cached response if found (prevents duplicate updates)
    if (idempotencyKey) {
      const idempotencyResult = await checkIdempotency(idempotencyKey)
      if (idempotencyResult.exists) {
        return returnCachedResponse(idempotencyResult)
      }
    }
    
    const body = await request.json()
    const { 
      fid, 
      walletAddress, 
      globalMute, 
      muteUntil, 
      categorySettings, 
      quietHours,
      // Phase 2: Priority system fields
      prioritySettings,
      minPriorityForPush,
      xpRewardsDisplay,
      priorityLastUpdated,
    } = body
    
    if (!fid) {
      return NextResponse.json({ error: 'Missing fid in request body' }, { status: 400 })
    }
    
    // Phase 2: Validate priority settings JSONB structure
    // validatePrioritySettings checks:
    // 1. All values are valid priority levels ('critical'|'high'|'medium'|'low')
    // 2. No invalid category keys
    // 3. JSONB structure is well-formed
    if (prioritySettings && !validatePrioritySettings(prioritySettings)) {
      return NextResponse.json({ 
        error: 'Invalid priority settings format',
        details: 'Priority settings must map categories to valid priority levels (critical/high/medium/low)'
      }, { status: 400 })
    }
    
    // Validate minPriorityForPush CHECK constraint
    // Database enforces: CHECK (min_priority_for_push IN ('critical', 'high', 'medium', 'low'))
    if (minPriorityForPush && !['critical', 'high', 'medium', 'low'].includes(minPriorityForPush)) {
      return NextResponse.json({ 
        error: 'Invalid minPriorityForPush value',
        details: 'Must be one of: critical, high, medium, low'
      }, { status: 400 })
    }
    
    // Build update object with only provided fields (partial update pattern)
    // This allows updating individual preferences without affecting others
    const updateData: any = {
      fid: parseInt(fid),
      updated_at: new Date().toISOString(), // Always update modified timestamp
    }
    
    if (walletAddress !== undefined) updateData.wallet_address = walletAddress
    if (globalMute !== undefined) updateData.global_mute = globalMute
    if (muteUntil !== undefined) updateData.mute_until = muteUntil
    if (categorySettings !== undefined) updateData.category_settings = categorySettings
    
    // Phase 2: Priority system updates with automatic timestamp tracking
    // Any priority change updates priority_last_updated for analytics
    if (prioritySettings !== undefined) {
      updateData.priority_settings = prioritySettings
      // Update timestamp when user customizes category priorities
      // Used for analytics: "How often do users adjust priorities?"
      updateData.priority_last_updated = new Date().toISOString()
    }
    if (minPriorityForPush !== undefined) {
      updateData.min_priority_for_push = minPriorityForPush
      // Update timestamp when user changes threshold
      // Analytics: Track threshold adjustments over time
      updateData.priority_last_updated = new Date().toISOString()
    }
    // XP rewards display toggle (no timestamp update, cosmetic change)
    if (xpRewardsDisplay !== undefined) updateData.xp_rewards_display = xpRewardsDisplay
    // Allow manual timestamp override (for migration/import scenarios)
    if (priorityLastUpdated !== undefined) updateData.priority_last_updated = priorityLastUpdated
    
    if (quietHours !== undefined) {
      updateData.quiet_hours_enabled = quietHours.enabled
      updateData.quiet_hours_start = quietHours.start
      updateData.quiet_hours_end = quietHours.end
      updateData.quiet_hours_timezone = quietHours.timezone
    }
    
    // Initialize Supabase client with server-side auth
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      )
    }
    
    // Upsert preferences (insert if not exists, update if exists)
    // onConflict: 'fid' means use fid as unique constraint
    // This creates a new row if FID doesn't exist, updates if it does
    const { data, error } = await (supabase as any)
      .from('notification_preferences')
      .upsert(updateData, {
        onConflict: 'fid',
      })
      .select()
      .single()
    
    if (error) {
      trackError('notification_preferences_upsert_error', error, { function: 'PATCH', fid })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Build response data structure
    const responseData = {
      success: true,
      preferences: {
        fid: data.fid,
        walletAddress: data.wallet_address,
        globalMute: data.global_mute,
        muteUntil: data.mute_until,
        categorySettings: data.category_settings,
        // Phase 2: Priority system fields
        prioritySettings: data.priority_settings || DEFAULT_PRIORITY_MAP,
        minPriorityForPush: data.min_priority_for_push || 'medium',
        xpRewardsDisplay: data.xp_rewards_display ?? true,
        priorityLastUpdated: data.priority_last_updated,
        quietHours: {
          enabled: data.quiet_hours_enabled,
          start: data.quiet_hours_start,
          end: data.quiet_hours_end,
          timezone: data.quiet_hours_timezone,
        },
        updatedAt: data.updated_at,
      },
    }
    
    // Store idempotency key for 24h (prevents duplicate processing)
    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, responseData, 200)
    }
    
    // Return updated preferences with tracing headers
    const response = NextResponse.json(responseData)
    
    // Phase 2 TODO RESOLVED: Add Request-ID header for distributed tracing
    const requestId = generateRequestId()
    response.headers.set('X-Request-ID', requestId)
    
    // If idempotency key provided, echo it back for client verification
    if (idempotencyKey) {
      response.headers.set('X-Idempotency-Key', idempotencyKey)
      response.headers.set('X-Idempotency-Replayed', 'false')
    }
    
    // Add cache control (invalidate cached preferences after update)
    response.headers.set('Cache-Control', 'no-cache, must-revalidate')
    
    return response
  } catch (err) {
    trackError('notification_preferences_patch_error', err, { function: 'PATCH' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
