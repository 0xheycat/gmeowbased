import { NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { getTipMentionSummary } from '@/lib/tips-scoreboard'
import { withErrorHandler } from '@/lib/error-handler'
import { generateRequestId } from '@/lib/request-id'

export const runtime = 'nodejs'

export const GET = withErrorHandler(async (request: Request) => {
  const requestId = generateRequestId()
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  const summary = getTipMentionSummary()
  return NextResponse.json({ ok: true, summary }, { headers: { 'X-Request-ID': requestId } })
})
