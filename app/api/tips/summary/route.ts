import { NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { getTipMentionSummary } from '@/lib/tips-scoreboard'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const summary = getTipMentionSummary()
  return NextResponse.json({ ok: true, summary })
}
