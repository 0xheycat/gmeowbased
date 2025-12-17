import { NextResponse, type NextRequest } from 'next/server'

import { generateRequestId } from '@/lib/request-id'
import { BADGE_BUCKET_NAME, invalidateBadgeCaches, uploadBadgeArt } from '@/lib/badges'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { validateAdminRequest } from '@/lib/auth/admin'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/rate-limit'
import { withErrorHandler } from '@/lib/error-handler'

export const runtime = 'nodejs'

export const POST = withErrorHandler(async (req: NextRequest) => {
  const requestId = generateRequestId()
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: { 'X-Request-ID': requestId } })
  }

  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json({ ok: false, error: 'admin_auth_required', reason: auth.reason }, { status: 401, headers: { 'X-Request-ID': requestId } })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500, headers: { 'X-Request-ID': requestId } })
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'file field is required' }, { status: 400, headers: { 'X-Request-ID': requestId } })
  }

  const { url, path } = await uploadBadgeArt(file)
  const removePath = form.get('removePath')
  if (removePath && typeof removePath === 'string' && removePath.trim().length > 0) {
    const supabase = getSupabaseServerClient()
    if (supabase) {
      await supabase.storage.from(BADGE_BUCKET_NAME).remove([removePath])
    }
  }
  await invalidateBadgeCaches()
  return NextResponse.json({ ok: true, url, path }, { headers: { 'X-Request-ID': requestId } })
})
