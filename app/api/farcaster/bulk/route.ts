import { NextRequest } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { fetchUsersByAddresses } from '@/lib/neynar'
import { AddressSchema } from '@/lib/validation/api-schemas'
import { z } from 'zod'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { 
      status: 429, 
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = (await req.json()) as { addresses?: string[] }
    
    // Zod validation
    const BulkAddressSchema = z.object({
      addresses: z.array(AddressSchema).min(1).max(300)
    })
    
    const validation = BulkAddressSchema.safeParse(body)
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid addresses format', details: validation.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const { addresses } = validation.data
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    // Hard cap to avoid abuse; client can send again if needed
    const unique = Array.from(new Set(addresses.map(a => String(a || '').toLowerCase()))).slice(0, 300)

    const result = await fetchUsersByAddresses(unique)
    return new Response(JSON.stringify(result || {}), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (e: any) {
    console.error('/api/farcaster/bulk failed:', e?.message || String(e))
    return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
}