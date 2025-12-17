import { NextResponse } from 'next/server'

import { buildAdminSessionClearCookie, isAdminSecurityEnabled } from '@/lib/auth/admin'
import { withErrorHandler } from '@/lib/error-handler'
import { generateRequestId } from '@/lib/request-id'

export const runtime = 'nodejs'

export const POST = withErrorHandler(async () => {
  const requestId = generateRequestId()
  
  if (!isAdminSecurityEnabled()) {
    return NextResponse.json(
      { ok: true },
      { headers: { 'X-Request-ID': requestId } }
    )
  }

  const { name, value, options } = buildAdminSessionClearCookie()
  const res = NextResponse.json(
    { ok: true },
    { headers: { 'X-Request-ID': requestId } }
  )
  res.cookies.set({ name, value, ...options })
  return res
})
