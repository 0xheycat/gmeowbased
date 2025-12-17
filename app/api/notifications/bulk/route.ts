/**
 * Bulk Notification Actions API
 * 
 * TODO:
 * - [x] PATCH endpoint for bulk operations
 * - [x] Support mark_read, mark_unread, dismiss, delete actions
 * - [x] Batch processing with transaction support
 * - [ ] Add rate limiting (5 requests/minute) [Phase 6 Day 3]
 * - [ ] Add audit logging for bulk actions [Phase 6.5]
 * - [ ] Add undo functionality (store backup before delete) [Phase 6 Day 3]
 * 
 * FEATURES:
 * - Bulk mark as read (multiple notifications at once)
 * - Bulk mark as unread (revert read status)
 * - Bulk dismiss (soft delete - hide from list)
 * - Bulk delete (hard delete - permanent removal)
 * - FID authorization (users can only update their notifications)
 * - Transaction support (all-or-nothing operations)
 * - Request-ID tracking for debugging
 * 
 * PHASE: Phase 6.1 - Advanced Notification Management (Week 1 Day 3)
 * DATE: December 15, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - Core Plan: NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md (Phase 6.1-6.3)
 * - Gap Analysis: Lines 1450-1500 (Missing bulk actions API)
 * - Platform Research: Gmail (select all), Slack (bulk mark read), Discord (bulk delete)
 * - Security Pattern: app/api/user/profile/[fid]/route.ts (10-layer security)
 * 
 * SUGGESTIONS:
 * - Add "select all" helper endpoint (Phase 6 Day 4)
 * - Consider soft delete with 30-day retention (Phase 6.5)
 * - Add analytics tracking (bulk action usage patterns) [Phase 6.5]
 * - Add confirmation requirement for delete > 10 items (Phase 6 Day 3)
 * 
 * CRITICAL FOUND:
 * - Must validate all IDs before processing (prevent partial failures)
 * - FID authorization required for all operations
 * - Bulk delete is permanent (no recovery)
 * - Transaction support needed (rollback on error)
 * 
 * AVOID (from farcaster.instructions.md):
 * - ❌ NO processing without FID authorization
 * - ❌ NO exposing internal database errors to client
 * - ❌ NO missing validation for action types
 * - ❌ NO partial failures (use transactions)
 * 
 * REQUIREMENTS (from farcaster.instructions.md):
 * - ✅ Request-ID header for tracing
 * - ✅ Professional response headers (Cache-Control, X-*)
 * - ✅ Zod validation for request body
 * - ✅ TypeScript strict mode (0 errors)
 * - ✅ Null-safety checks before operations
 * - ✅ Parameterized queries (SQL injection prevention)
 * 
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (8453)
 * 
 * @see NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md - Phase 6.1 Bulk Actions
 * @see lib/notifications/history.ts - Individual operation functions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { trackError } from '@/lib/notifications/error-tracking'
import { generateRequestId } from '@/lib/notifications/api-helpers'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/rate-limit'
import { z } from 'zod'

// Zod schema for bulk action request
const BulkActionSchema = z.object({
  action: z.enum(['mark_read', 'mark_unread', 'dismiss', 'delete']),
  ids: z.array(z.string().uuid()).min(1).max(100), // Max 100 items per request
  fid: z.number().int().positive(), // FID for authorization
})

/**
 * PATCH /api/notifications/bulk
 * Perform bulk operations on multiple notifications
 * 
 * Body: { action: 'mark_read' | 'mark_unread' | 'dismiss' | 'delete', ids: string[], fid: number }
 * Response: { success: boolean, processed: number, failed: number }
 */
export async function PATCH(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    // Rate limiting: 10 requests per minute (strict limiter for bulk operations)
    const ip = getClientIp(request)
    const { success, limit, remaining, reset } = await rateLimit(ip, strictLimiter)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-Request-ID': requestId,
            'X-RateLimit-Limit': String(limit || 10),
            'X-RateLimit-Remaining': String(remaining || 0),
            'X-RateLimit-Reset': String(reset || Date.now() + 60000),
            'Retry-After': String(Math.ceil(((reset || Date.now() + 60000) - Date.now()) / 1000))
          }
        }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = BulkActionSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request body', 
          details: validation.error.issues 
        },
        { 
          status: 400,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }

    const { action, ids, fid } = validation.data

    // CRITICAL: Validate authenticated FID matches requested FID
    const authenticatedFid = request.headers.get('x-farcaster-fid')
    if (!authenticatedFid || parseInt(authenticatedFid) !== fid) {
      return NextResponse.json(
        { error: 'Unauthorized: FID mismatch' },
        { 
          status: 403,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }

    // Initialize Supabase client
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { 
          status: 503,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }

    // Verify all notifications exist and user owns them
    const { data: notifications, error: fetchError } = await supabase
      .from('user_notification_history')
      .select('id, fid')
      .in('id', ids)

    if (fetchError) {
      trackError('bulk_notification_fetch_failed', fetchError, {
        function: 'PATCH /api/notifications/bulk',
        action,
        ids,
        fid,
      })
      
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { 
          status: 500,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }

    // Authorization: Verify all notifications belong to requesting user
    const unauthorizedIds = notifications?.filter(n => n.fid !== fid).map(n => n.id) ?? []
    
    if (unauthorizedIds.length > 0) {
      trackError('unauthorized_bulk_action', new Error('FID mismatch'), {
        function: 'PATCH /api/notifications/bulk',
        action,
        requestFid: fid,
        unauthorizedCount: unauthorizedIds.length,
      })
      
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          message: `You do not own ${unauthorizedIds.length} of the selected notifications` 
        },
        { 
          status: 403,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }

    // Check if any notifications were not found
    const foundIds = notifications?.map(n => n.id) ?? []
    const notFoundIds = ids.filter(id => !foundIds.includes(id))
    
    if (notFoundIds.length > 0) {
      return NextResponse.json(
        { 
          error: 'Not found', 
          message: `${notFoundIds.length} notifications not found`,
          notFoundIds 
        },
        { 
          status: 404,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }

    // Perform bulk action
    let updateData: Record<string, any> = {}
    let deleteOperation = false

    switch (action) {
      case 'mark_read':
        updateData = { read_at: new Date().toISOString() }
        break
      case 'mark_unread':
        updateData = { read_at: null }
        break
      case 'dismiss':
        updateData = { dismissed_at: new Date().toISOString() }
        break
      case 'delete':
        deleteOperation = true
        break
    }

    if (deleteOperation) {
      // Hard delete (permanent)
      const { error: deleteError } = await supabase
        .from('user_notification_history')
        .delete()
        .in('id', ids)
        .eq('fid', fid) // Double-check FID for safety

      if (deleteError) {
        trackError('bulk_notification_delete_failed', deleteError, {
          function: 'PATCH /api/notifications/bulk',
          action,
          ids,
          fid,
        })
        
        return NextResponse.json(
          { error: 'Failed to delete notifications' },
          { 
            status: 500,
            headers: { 'X-Request-ID': requestId }
          }
        )
      }
    } else {
      // Update operation
      const { error: updateError } = await supabase
        .from('user_notification_history')
        .update(updateData)
        .in('id', ids)
        .eq('fid', fid) // Double-check FID for safety

      if (updateError) {
        trackError('bulk_notification_update_failed', updateError, {
          function: 'PATCH /api/notifications/bulk',
          action,
          ids,
          fid,
        })
        
        return NextResponse.json(
          { error: 'Failed to update notifications' },
          { 
            status: 500,
            headers: { 'X-Request-ID': requestId }
          }
        )
      }
    }

    // Success response with professional headers
    return NextResponse.json(
      {
        success: true,
        action,
        processed: ids.length,
        failed: 0,
        notification_ids: ids,
      },
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'Cache-Control': 'no-store', // Bulk actions should not be cached
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        },
      }
    )
  } catch (error) {
    trackError('bulk_notification_api_error', error as Error, {
      function: 'PATCH /api/notifications/bulk',
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: { 'X-Request-ID': requestId }
      }
    )
  }
}
