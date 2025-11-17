import { NextResponse } from 'next/server'

import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { listBadgeTemplates } from '@/lib/badges'
import { withErrorHandler } from '@/lib/error-handler'

export const runtime = 'nodejs'

export const GET = withErrorHandler(async (request: Request) => {
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const templates = await listBadgeTemplates({ includeInactive: false })
  return NextResponse.json({ ok: true, templates }, {
    headers: { 'cache-control': 's-maxage=60, stale-while-revalidate=120' },
  })
})
