import { NextResponse } from 'next/server'
import { syncSupabaseLeaderboard } from '@/lib/leaderboard-sync'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase-server'
import { withErrorHandler } from '@/lib/error-handler'
import { generateRequestId } from '@/lib/request-id'

const SYNC_TOKEN = process.env.SUPABASE_SYNC_TOKEN || process.env.CRON_SECRET || process.env.SYNC_LEADERBOARD_TOKEN

function isAuthorized(req: Request): boolean {
  if (!SYNC_TOKEN) return false
  const authHeader = req.headers.get('authorization') || ''
  const expected = `Bearer ${SYNC_TOKEN}`
  return authHeader === expected
}

export const POST = withErrorHandler(async (req: Request) => {
  const requestId = generateRequestId()
  
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: 'supabase_not_configured' }, { status: 500, headers: { 'X-Request-ID': requestId } })
  }

  if (!SYNC_TOKEN) {
    return NextResponse.json({ ok: false, reason: 'sync_token_missing' }, { status: 500, headers: { 'X-Request-ID': requestId } })
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401, headers: { 'X-Request-ID': requestId } })
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: 'supabase_client_init_failed' }, { status: 500, headers: { 'X-Request-ID': requestId } })
  }

  const result = await syncSupabaseLeaderboard({ supabase })
  return NextResponse.json({ ok: true, ...result }, { headers: { 'X-Request-ID': requestId } })
})

export const runtime = 'nodejs'
