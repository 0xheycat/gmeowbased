import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/middleware/rate-limit'
import { fetchUsersByAddresses } from '@/lib/integrations/neynar'
import { AddressSchema } from '@/lib/validation/api-schemas'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/middleware/error-handler'
import { generateRequestId } from '@/lib/middleware/request-id'

export const runtime = 'nodejs'

export const POST = withErrorHandler(async (req: NextRequest) => {
  const requestId = generateRequestId()
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { 
      status: 429,
      headers: { 'X-Request-ID': requestId }
    })
  }

  const body = (await req.json()) as { addresses?: string[] }
  
  // Zod validation
  const BulkAddressSchema = z.object({
    addresses: z.array(AddressSchema).min(1).max(300)
  })
  
  const validation = BulkAddressSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid addresses format', details: validation.error.flatten() },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }
  
  const { addresses } = validation.data
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return NextResponse.json({}, { 
      status: 200,
      headers: { 'X-Request-ID': requestId }
    })
  }

  // Hard cap to avoid abuse; client can send again if needed
  const unique = Array.from(new Set(addresses.map(a => String(a || '').toLowerCase()))).slice(0, 300)

  const result = await fetchUsersByAddresses(unique)
  return NextResponse.json(result || {}, { 
    status: 200,
    headers: { 
      'X-Request-ID': requestId,
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
    }
  })
})