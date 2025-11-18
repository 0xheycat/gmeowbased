import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { fetchUsersByAddresses } from '@/lib/neynar'
import { AddressSchema } from '@/lib/validation/api-schemas'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/error-handler'

export const runtime = 'nodejs'

export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
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
      { status: 400 }
    )
  }
  
  const { addresses } = validation.data
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return NextResponse.json({}, { status: 200 })
  }

  // Hard cap to avoid abuse; client can send again if needed
  const unique = Array.from(new Set(addresses.map(a => String(a || '').toLowerCase()))).slice(0, 300)

  const result = await fetchUsersByAddresses(unique)
  return NextResponse.json(result || {}, { 
    status: 200,
    headers: { 'Cache-Control': 'no-store' }
  })
})