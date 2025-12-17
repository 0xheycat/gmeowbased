import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { generateRequestId } from '@/lib/middleware/request-id'
import { resetNeynarClientCache } from '@/lib/integrations/neynar-server'
import { validateAdminRequest } from '@/lib/auth/admin'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/middleware/rate-limit'
import { withErrorHandler } from '@/lib/middleware/error-handler'

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

  resetNeynarClientCache()
  return NextResponse.json({ ok: true, resetAt: new Date().toISOString() }, { headers: { 'X-Request-ID': requestId } })
})
