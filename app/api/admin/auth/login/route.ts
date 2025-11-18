import { NextRequest, NextResponse } from 'next/server'

import {
  buildAdminSessionCookie,
  isAdminSecurityEnabled,
  isTotpRequired,
  issueAdminSession,
  validateAccessCode,
  validateTotp,
} from '@/lib/admin-auth'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/rate-limit'
import { AdminLoginSchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/error-handler'

export const runtime = 'nodejs'

export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  if (!isAdminSecurityEnabled()) {
    return NextResponse.json(
      { ok: false, error: 'Admin security is not configured on this deployment.' },
      { status: 500 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 })
  }

  // Validate input with Zod
  const validation = AdminLoginSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid input', details: validation.error.issues },
      { status: 400 }
    )
  }

  const { passcode, totp, remember } = validation.data

  if (!validateAccessCode(passcode)) {
    return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 })
  }

  if (isTotpRequired()) {
    if (!totp || !validateTotp(totp)) {
      return NextResponse.json({ ok: false, error: 'Invalid one-time code' }, { status: 401 })
    }
  }
  const session = await issueAdminSession({ remember })
  const { name, value, options } = buildAdminSessionCookie(session)

  const res = NextResponse.json({ ok: true })
  res.cookies.set({ name, value, ...options })
  return res
})
