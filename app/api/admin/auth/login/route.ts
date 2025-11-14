import { NextRequest, NextResponse } from 'next/server'

import {
  buildAdminSessionCookie,
  isAdminSecurityEnabled,
  isTotpRequired,
  issueAdminSession,
  validateAccessCode,
  validateTotp,
} from '@/lib/admin-auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!isAdminSecurityEnabled()) {
    return NextResponse.json(
      { ok: false, error: 'Admin security is not configured on this deployment.' },
      { status: 500 }
    )
  }

  let body: { passcode?: string; totp?: string; remember?: boolean }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 })
  }

  const passcode = typeof body.passcode === 'string' ? body.passcode : ''
  if (!validateAccessCode(passcode)) {
    return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 })
  }

  if (isTotpRequired()) {
    const totp = typeof body.totp === 'string' ? body.totp : ''
    if (!validateTotp(totp)) {
      return NextResponse.json({ ok: false, error: 'Invalid one-time code' }, { status: 401 })
    }
  }

  const remember = Boolean(body.remember)
  const session = await issueAdminSession({ remember })
  const { name, value, options } = buildAdminSessionCookie(session)

  const res = NextResponse.json({ ok: true })
  res.cookies.set({ name, value, ...options })
  return res
}
