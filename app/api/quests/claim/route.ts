import { NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit'
import { QuestClaimSchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/middleware/error-handler'
import { generateRequestId } from '@/lib/middleware/request-id'

// Demo in-memory store; swap to DB/KV in prod
const claims = new Map<string, { at: number; metaHash: string | null }>()

export const POST = withErrorHandler(async (req: Request) => {
  const requestId = generateRequestId();
  const ip = getClientIp(req);
  const { success } = await rateLimit(ip, apiLimiter);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  const body = await req.json()
    
    // Zod validation
    const validation = QuestClaimSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          ok: false, 
          reason: 'Invalid claim data',
          details: validation.error.flatten()
        },
        { status: 400 }
      )
    }
    
    const { chain, questId, address, metaHash } = body || {}
    if (!chain || questId == null || !address) {
      return NextResponse.json({ ok: false, reason: 'Missing fields' }, { status: 400 })
    }
    const key = `${chain}:${questId}:${String(address).toLowerCase()}`
    const metaHashNormalized = typeof metaHash === 'string' && metaHash.trim().length ? metaHash.trim() : null
    const prior = claims.get(key)
    if (prior) {
      if (metaHashNormalized && prior.metaHash && prior.metaHash !== metaHashNormalized) {
        return NextResponse.json({ ok: false, reason: 'Claim metadata mismatch' }, { status: 409 })
      }
      return NextResponse.json({ ok: false, reason: 'Already claimed' }, { status: 409 })
    }
    claims.set(key, { at: Date.now(), metaHash: metaHashNormalized })
    // Place to enqueue fulfillment/job
    return NextResponse.json(
      { ok: true, metaHash: metaHashNormalized },
      { headers: { 'X-Request-ID': requestId } }
    )
})