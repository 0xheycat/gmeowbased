import { NextResponse } from 'next/server'

import { buildAdminSessionClearCookie, isAdminSecurityEnabled } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export async function POST() {
  if (!isAdminSecurityEnabled()) {
    return NextResponse.json({ ok: true })
  }

  const { name, value, options } = buildAdminSessionClearCookie()
  const res = NextResponse.json({ ok: true })
  res.cookies.set({ name, value, ...options })
  return res
}
