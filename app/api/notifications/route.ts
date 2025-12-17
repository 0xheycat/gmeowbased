import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseEdgeClient } from '@/lib/supabase/edge'
import { 
  generateRequestId,
  checkIdempotency,
  storeIdempotency,
  getIdempotencyKey,
  isValidIdempotencyKey,
  returnCachedResponse,
  getNotificationsCacheControl
} from '@/lib/notifications/api-helpers'

/**
 * GET /api/notifications
 * 
 * Fetch user notification history with optional filters.
 * Used by NotificationHistory component for displaying notification feed.
 * 
 * Query params:
 * - fid: Filter by Farcaster ID (MUST match authenticated user - enforced at line 37-45)
 * - walletAddress: Filter by wallet address
 * - category: Filter by category (quest, badge, guild, reward, tip, streak, level, achievement, viral)
 * - limit: Max results (default 50, max 100)
 * - includeDismissed: Include dismissed notifications (default false)
 * 
 * Authorization: Requires x-farcaster-fid header matching query FID (see line 37-45)
 * Performance: 30s cache TTL (notifications update frequently, user-specific)
 * 
 * COMPLETED (Phase 6.5):
 * - [x] Cursor-based pagination implemented (MEDIUM #1) - Dec 15, 2025
 * 
 * TODO (Phase 7+):
 * - [ ] Consider adding date range filters
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const fid = searchParams.get('fid')
    const walletAddress = searchParams.get('walletAddress')
    const category = searchParams.get('category')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const includeDismissed = searchParams.get('includeDismissed') === 'true'
    const cursor = searchParams.get('cursor') // ISO timestamp for pagination

    // CRITICAL: Validate authenticated FID matches requested FID
    const authenticatedFid = request.headers.get('x-farcaster-fid')
    if (fid && authenticatedFid && authenticatedFid !== fid) {
      return NextResponse.json(
        { error: 'Unauthorized: FID mismatch' },
        { 
          status: 403,
          headers: { 'X-Request-ID': requestId }
        }
      )
    }

    const supabase = getSupabaseEdgeClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection unavailable' },
        { status: 503 }
      )
    }

    // Build query
    let query = supabase
      .from('user_notification_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by user (fid or wallet)
    if (fid) {
      query = query.eq('fid', parseInt(fid))
    } else if (walletAddress) {
      query = query.eq('wallet_address', walletAddress.toLowerCase())
    }

    // Filter by category
    if (category) {
      const validCategories = ['quest', 'badge', 'guild', 'reward', 'tip', 'streak', 'level', 'achievement']
      if (validCategories.includes(category)) {
        query = query.eq('category', category)
      }
    }

    // Filter dismissed
    if (!includeDismissed) {
      query = query.is('dismissed_at', null)
    }

    // Cursor-based pagination: fetch notifications older than cursor
    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Transform to client-friendly format
    const notifications = (data || []).map(row => ({
      id: row.id,
      fid: row.fid,
      walletAddress: row.wallet_address,
      category: row.category,
      title: row.title,
      description: row.description,
      tone: row.tone,
      metadata: row.metadata,
      actionLabel: row.action_label,
      actionHref: row.action_href,
      dismissedAt: row.dismissed_at,
      createdAt: row.created_at,
    }))

    // Calculate next cursor for pagination
    const nextCursor = notifications.length > 0 
      ? notifications[notifications.length - 1].createdAt 
      : null

    return NextResponse.json({
      notifications,
      count: notifications.length,
      limit,
      nextCursor, // ISO timestamp for fetching next page
      hasMore: notifications.length === limit // true if there might be more data
    }, {
      headers: {
        'X-Request-ID': requestId,
        'Cache-Control': getNotificationsCacheControl()
      }
    })
  } catch (err) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}

/**
 * POST /api/notifications
 * Create a new notification (for server-side events)
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    // Check idempotency key (prevent duplicate notifications)
    const idempotencyKey = getIdempotencyKey(request)
    if (idempotencyKey) {
      if (!isValidIdempotencyKey(idempotencyKey)) {
        return NextResponse.json(
          { error: 'Invalid idempotency key format' },
          { status: 400, headers: { 'X-Request-ID': requestId } }
        )
      }
      
      const idempotencyResult = await checkIdempotency(idempotencyKey)
      if (idempotencyResult.exists) {
        return returnCachedResponse(idempotencyResult)
      }
    }
    
    const body = await request.json()
    const { fid, walletAddress, category, title, description, tone, metadata, actionLabel, actionHref } = body

    // Validate required fields
    if (!category || !title || !tone) {
      return NextResponse.json(
        { error: 'Missing required fields: category, title, tone' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    // Validate at least one identifier
    if (!fid && !walletAddress) {
      return NextResponse.json(
        { error: 'Must provide fid or walletAddress' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    const supabase = getSupabaseEdgeClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection unavailable' },
        { status: 503, headers: { 'X-Request-ID': requestId } }
      )
    }

    const { data, error } = await supabase
      .from('user_notification_history')
      .insert({
        fid: fid ? parseInt(fid) : null,
        wallet_address: walletAddress?.toLowerCase() || null,
        category,
        title,
        description: description || null,
        tone,
        metadata: metadata || {},
        action_label: actionLabel || null,
        action_href: actionHref || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create notification', details: error.message },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    const responseData = { success: true, notification: data }
    
    // Store idempotency key (24h TTL)
    if (idempotencyKey) {
      await storeIdempotency(idempotencyKey, responseData, 201)
    }
    
    return NextResponse.json(responseData, { 
      status: 201, 
      headers: { 
        'X-Request-ID': requestId,
        'X-Idempotency-Replayed': 'false'
      } 
    })
  } catch (err) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}

/**
 * PATCH /api/notifications/:id
 * Dismiss a notification
 */
export async function PATCH(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing notification ID' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      )
    }

    const supabase = getSupabaseEdgeClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection unavailable' },
        { status: 503, headers: { 'X-Request-ID': requestId } }
      )
    }

    const { error } = await supabase
      .from('user_notification_history')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to dismiss notification', details: error.message },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      )
    }

    return NextResponse.json({ success: true }, { headers: { 'X-Request-ID': requestId } })
  } catch (err) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}
