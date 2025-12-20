import { NextResponse } from 'next/server'
import { syncSupabaseLeaderboard } from '@/lib/leaderboard/leaderboard-sync'
import { getSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase/edge'
import { withErrorHandler } from '@/lib/middleware/error-handler'

const SYNC_TOKEN = process.env.SUPABASE_SYNC_TOKEN || process.env.CRON_SECRET || process.env.SYNC_LEADERBOARD_TOKEN

function isAuthorized(req: Request): boolean {
  if (!SYNC_TOKEN) return false
  const authHeader = req.headers.get('authorization') || ''
  const expected = `Bearer ${SYNC_TOKEN}`
  return authHeader === expected
}

export const POST = withErrorHandler(async (req: Request) => {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: 'supabase_not_configured' }, { status: 500 })
  }

  if (!SYNC_TOKEN) {
    return NextResponse.json({ ok: false, reason: 'sync_token_missing' }, { status: 500 })
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: 'supabase_client_init_failed' }, { status: 500 })
  }

  const result = await syncSupabaseLeaderboard({ supabase })
  return NextResponse.json({ ok: true, ...result })
})

export const runtime = 'nodejs'
