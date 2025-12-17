import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { generateRequestId } from '@/lib/request-id'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/rate-limit'
import { validateAdminRequest } from '@/lib/auth/admin'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { syncSupabaseLeaderboard } from '@/lib/leaderboard-sync'
import { withErrorHandler } from '@/lib/error-handler'

export const runtime = 'nodejs'

export const POST = withErrorHandler(async (req: NextRequest) => {
  const requestId = generateRequestId()
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json({ ok: false, error: 'admin_auth_required', reason: auth.reason }, { status: 401, headers: { 'X-Request-ID': requestId } })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'supabase_not_configured', message: 'Supabase environment variables are not configured.' },
      { status: 500, headers: { 'X-Request-ID': requestId } },
    )
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: 'supabase_client_unavailable', message: 'Failed to initialise Supabase client.' },
      { status: 500, headers: { 'X-Request-ID': requestId } },
    )
  }

  const result = await syncSupabaseLeaderboard({ supabase, logger: console })
  return NextResponse.json({ ok: true, result }, { headers: { 'X-Request-ID': requestId } })
})
