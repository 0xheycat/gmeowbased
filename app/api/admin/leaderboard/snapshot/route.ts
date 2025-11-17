import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { rateLimit, getClientIp, strictLimiter } from '@/lib/rate-limit'
import { validateAdminRequest } from '@/lib/admin-auth'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase-server'
import { syncSupabaseLeaderboard } from '@/lib/leaderboard-sync'
import { extractHttpErrorMessage } from '@/lib/http-error'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json({ ok: false, error: 'admin_auth_required', reason: auth.reason }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'supabase_not_configured', message: 'Supabase environment variables are not configured.' },
      { status: 500 },
    )
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: 'supabase_client_unavailable', message: 'Failed to initialise Supabase client.' },
      { status: 500 },
    )
  }

  try {
    const result = await syncSupabaseLeaderboard({ supabase, logger: console })
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    const message = extractHttpErrorMessage(error, 'Failed to sync leaderboard snapshot')
    return NextResponse.json({ ok: false, error: 'sync_failed', message }, { status: 500 })
  }
}
