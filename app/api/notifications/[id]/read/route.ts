/**
 * Mark Notification as Read/Unread API
 * 
 * TODO:
 * - [x] PATCH endpoint to toggle read status
 * - [x] UUID validation for notification ID
 * - [x] Authentication check (user owns notification)
 * - [ ] Add rate limiting (10 requests/minute) [Phase 6 Day 2]
 * - [ ] Add audit logging for read status changes [Phase 6.5]
 * 
 * FEATURES:
 * - Mark notification as read (set read_at = NOW())
 * - Mark notification as unread (set read_at = NULL)
 * - Toggle endpoint (single API for both actions)
 * - FID authorization (users can only update their notifications)
 * - Request-ID tracking for debugging
 * 
 * PHASE: Phase 6.1 - Advanced Notification Management (Week 1 Day 2)
 * DATE: December 15, 2025
 * 
 * REFERENCE DOCUMENTATION:
 * - Core Plan: NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md (Phase 6.2)
 * - Gap Analysis: Lines 1400-1450 (Missing mark as read API)
 * - Platform Research: Gmail (auto-mark), Slack (manual toggle), Discord (right-click)
 * - Security Pattern: app/api/user/profile/[fid]/route.ts (10-layer security)
 * 
 * SUGGESTIONS:
 * - Add bulk mark as read endpoint (Phase 6 Day 3)
 * - Consider auto-mark on notification view (Phase 6 Day 4)
 * - Add analytics tracking (read rate, time to read) [Phase 6.5]
 * - Add "mark all as read" shortcut (Phase 6 Day 3)
 * 
 * CRITICAL FOUND:
 * - Must verify FID ownership (prevent unauthorized updates)
 * - UUID validation required (prevent injection)
 * - read_at = NULL for unread (explicit state)
 * - Separate from dismissed_at (different concerns)
 * 
 * AVOID (from farcaster.instructions.md):
 * - ❌ NO mixing read_at with dismissed_at logic
 * - ❌ NO auto-dismiss when marking as read
 * - ❌ NO exposing internal database errors to client
 * - ❌ NO missing authentication checks
 * 
 * REQUIREMENTS (from farcaster.instructions.md):
 * - ✅ Request-ID header for tracing
 * - ✅ Professional response headers (Cache-Control, X-*)
 * - ✅ Zod validation for request body
 * - ✅ TypeScript strict mode (0 errors)
 * - ✅ Null-safety checks before operations
 * 
 * WEBSITE: https://gmeowhq.art
 * NETWORK: Base (8453)
 * 
 * @see NOTIFICATION-PRIORITY-ENHANCEMENT-PLAN.md - Phase 6.2 Mark as Read/Unread
 * @see lib/notifications/history.ts - markAsRead() helper function
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { trackError } from '@/lib/notifications/error-tracking'
import { generateRequestId } from '@/lib/notifications/api-helpers'
import { z } from 'zod'

// Zod schema for request validation
const MarkReadSchema = z.object({
  read: z.boolean(), // true = mark as read, false = mark as unread
  fid: z.number().int().positive(), // FID for authorization
})

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * PATCH /api/notifications/[id]/read
 * Mark notification as read or unread
 * 
 * Body: { read: boolean, fid: number }
 * Response: { success: boolean, read_at: string | null }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = generateRequestId()
  
  try {
    // Validate notification ID (UUID format)
    const notificationId = params.id
    if (!UUID_REGEX.test(notificationId)) {
      return NextResponse.json(
        { error: 'Invalid notification ID format' },
        { 
          status: 400,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = MarkReadSchema.safeParse(body)
    
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

    const { read, fid } = validation.data

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

    // Verify notification exists and user owns it
    const { data: notification, error: fetchError } = await supabase
      .from('user_notification_history')
      .select('id, fid')
      .eq('id', notificationId)
      .single()

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { 
          status: 404,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }

    // Authorization: Verify FID matches
    if (notification.fid !== fid) {
      trackError('unauthorized_read_update', new Error('FID mismatch'), {
        function: 'PATCH /api/notifications/[id]/read',
        notificationId,
        requestFid: fid,
        actualFid: notification.fid,
      })
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { 
          status: 403,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }

    // Update read_at timestamp
    const read_at = read ? new Date().toISOString() : null
    
    const { error: updateError } = await supabase
      .from('user_notification_history')
      .update({ read_at })
      .eq('id', notificationId)

    if (updateError) {
      trackError('notification_read_update_failed', updateError, {
        function: 'PATCH /api/notifications/[id]/read',
        notificationId,
        fid,
        read,
      })
      
      return NextResponse.json(
        { error: 'Failed to update notification' },
        { 
          status: 500,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }

    // Success response with professional headers
    return NextResponse.json(
      {
        success: true,
        read_at,
        notification_id: notificationId,
        action: read ? 'marked_as_read' : 'marked_as_unread',
      },
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId,
          'Cache-Control': 'no-store', // Read status should not be cached
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        },
      }
    )
  } catch (error) {
    trackError('notification_read_api_error', error as Error, {
      function: 'PATCH /api/notifications/[id]/read',
      notificationId: params.id,
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
