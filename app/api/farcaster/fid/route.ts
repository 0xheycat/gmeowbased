import { NextResponse } from 'next/server'
import type { Address } from 'viem'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { AddressSchema } from '@/lib/validation/api-schemas'
import { fetchFidByAddress } from '@/lib/neynar'

function isAddress(a?: string): a is Address {
  return !!a && /^0x[a-fA-F0-9]{40}$/.test(a)
}

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const address = searchParams.get('address') || ''
    if (!isAddress(address)) {
      return NextResponse.json({ ok: false, reason: 'Invalid address' }, { status: 422 })
    }
    const fid = await fetchFidByAddress(address)
    return NextResponse.json({ ok: true, fid: fid ?? 0 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e?.message || 'failed' }, { status: 500 })
  }
}