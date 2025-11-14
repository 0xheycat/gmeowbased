import { NextResponse } from 'next/server'
import { syncSupabaseLeaderboard } from '@/lib/leaderboard-sync'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase-server'

const SYNC_TOKEN = process.env.SUPABASE_SYNC_TOKEN || process.env.CRON_SECRET || process.env.SYNC_LEADERBOARD_TOKEN

function isAuthorized(req: Request): boolean {
  if (!SYNC_TOKEN) return false
  const authHeader = req.headers.get('authorization') || ''
  const expected = `Bearer ${SYNC_TOKEN}`
  return authHeader === expected
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: 'supabase_not_configured' }, { status: 500 })
  }

  if (!SYNC_TOKEN) {
    return NextResponse.json({ ok: false, reason: 'sync_token_missing' }, { status: 500 })
  }

  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: 'supabase_client_init_failed' }, { status: 500 })
  }

  try {
    const result = await syncSupabaseLeaderboard({ supabase })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'sync_failed'
    console.error('leaderboard sync api failed:', error)
    return NextResponse.json({ ok: false, reason: message }, { status: 500 })
  }
}

export const runtime = 'nodejs'
