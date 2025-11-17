import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { resetNeynarClientCache } from '@/lib/neynar-server'
import { validateAdminRequest } from '@/lib/admin-auth'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json({ ok: false, error: 'admin_auth_required', reason: auth.reason }, { status: 401 })
  }

  resetNeynarClientCache()
  return NextResponse.json({ ok: true, resetAt: new Date().toISOString() })
}
