import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseEdgeClient } from '@/lib/supabase'

/**
 * GET /api/notifications
 * Fetch user notification history with optional filters
 * 
 * Query params:
 * - fid: Filter by Farcaster ID
 * - walletAddress: Filter by wallet address
 * - category: Filter by category (quest, badge, guild, reward, tip, streak, level)
 * - limit: Max results (default 50, max 100)
 * - includeDismissed: Include dismissed notifications (default false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fid = searchParams.get('fid')
    const walletAddress = searchParams.get('walletAddress')
    const category = searchParams.get('category')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const includeDismissed = searchParams.get('includeDismissed') === 'true'

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

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message },
        { status: 500 }
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

    return NextResponse.json({
      notifications,
      count: notifications.length,
      limit,
    })
  } catch (err) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications
 * Create a new notification (for server-side events)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fid, walletAddress, category, title, description, tone, metadata, actionLabel, actionHref } = body

    // Validate required fields
    if (!category || !title || !tone) {
      return NextResponse.json(
        { error: 'Missing required fields: category, title, tone' },
        { status: 400 }
      )
    }

    // Validate at least one identifier
    if (!fid && !walletAddress) {
      return NextResponse.json(
        { error: 'Must provide fid or walletAddress' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseEdgeClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection unavailable' },
        { status: 503 }
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
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      notification: data 
    }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notifications/:id
 * Dismiss a notification
 */
export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing notification ID' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseEdgeClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection unavailable' },
        { status: 503 }
      )
    }

    const { error } = await supabase
      .from('user_notification_history')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to dismiss notification', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
