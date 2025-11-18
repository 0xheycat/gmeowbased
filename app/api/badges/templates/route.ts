import { NextResponse } from 'next/server'

import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { listBadgeTemplates } from '@/lib/badges'
import { withErrorHandler } from '@/lib/error-handler'
import { withTiming } from '@/lib/middleware/timing'
import { getCached, buildBadgeTemplatesKey } from '@/lib/cache'

export const runtime = 'nodejs'

export const GET = withTiming(withErrorHandler(async (request: Request) => {
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const templates = await getCached(
    'badge-templates',
    buildBadgeTemplatesKey(false),
    () => listBadgeTemplates({ includeInactive: false }),
    { ttl: 300 }
  )
  
  return NextResponse.json({ ok: true, templates }, {
    headers: { 'cache-control': 's-maxage=180, stale-while-revalidate=300' },
  })
}))
