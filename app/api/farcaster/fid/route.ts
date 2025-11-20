import { NextResponse } from 'next/server'
import type { Address } from 'viem'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { fetchFidByAddress } from '@/lib/neynar'
import { withErrorHandler, handleValidationError, handleRateLimitError, handleExternalApiError } from '@/lib/error-handler'
import { getCached } from '@/lib/cache'

function isAddress(a?: string): a is Address {
  return !!a && /^0x[a-fA-F0-9]{40}$/.test(a)
}

export const runtime = 'nodejs'

export const GET = withErrorHandler(async (req: Request) => {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return handleRateLimitError(60)
  }

  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address') || ''
  
  if (!isAddress(address)) {
    return handleValidationError(new Error(`Invalid Ethereum address format: ${address}`))
  }
  
  try {
    // Cache FID lookups for 5 minutes (they rarely change)
    const fid = await getCached(
      'fid-lookups',
      `address:${address.toLowerCase()}`,
      async () => await fetchFidByAddress(address),
      { ttl: 300 } // 5 minutes
    )
    
    return NextResponse.json({ ok: true, fid: fid ?? 0 })
  } catch (error) {
    throw handleExternalApiError(error instanceof Error ? error : new Error('Failed to fetch FID'), 'Neynar')
  }
})