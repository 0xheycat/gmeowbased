import { NextResponse } from 'next/server'

import { buildAdminSessionClearCookie, isAdminSecurityEnabled } from '@/lib/admin-auth'
import { withErrorHandler } from '@/lib/error-handler'

export const runtime = 'nodejs'

export const POST = withErrorHandler(async () => {
  if (!isAdminSecurityEnabled()) {
    return NextResponse.json({ ok: true })
  }

  const { name, value, options } = buildAdminSessionClearCookie()
  const res = NextResponse.json({ ok: true })
  res.cookies.set({ name, value, ...options })
  return res
})
