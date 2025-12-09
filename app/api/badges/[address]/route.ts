import { NextResponse, type NextRequest } from 'next/server'

import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { AddressSchema } from '@/lib/validation/api-schemas'
import { fetchMintedBadges } from '@/lib/badges'
import { CHAIN_IDS, type ChainKey, isAddress } from '@/lib/gmeow-utils'
import { generateRequestId } from '@/lib/request-id'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ address?: string | string[] }> }

export async function GET(req: NextRequest, context: RouteContext) {
  const requestId = generateRequestId();
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  const resolved = await context.params
  const rawAddress = resolved?.address
  const addressParam = Array.isArray(rawAddress) ? rawAddress[0] : rawAddress
  
  // Validate address format
  const addressValidation = AddressSchema.safeParse(addressParam)
  if (!addressValidation.success || !isAddress(addressParam)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_address' },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  try {
    const chainsParam = req.nextUrl.searchParams.get('chains')
    let chains: ChainKey[] | undefined
    if (chainsParam) {
      const requested = chainsParam.split(',').map((item) => item.trim()).filter(Boolean)
      chains = requested.filter((chain): chain is ChainKey => Object.prototype.hasOwnProperty.call(CHAIN_IDS, chain))
    }

    const badges = await fetchMintedBadges(addressParam.toLowerCase() as `0x${string}`, { chains })
    const payload = badges.map((entry) => ({
      chain: entry.chain,
      badgeId: entry.badgeId,
      badgeType: entry.badgeType,
      mintedAt: entry.mintedAt ?? null,
      tokenUri: entry.tokenUri ?? null,
      template: entry.template
        ? {
            id: entry.template.id,
            name: entry.template.name,
            slug: entry.template.slug,
            pointsCost: entry.template.pointsCost,
            imageUrl: entry.template.imageUrl,
            badgeType: entry.template.badgeType,
            chain: entry.template.chain,
          }
        : null,
    }))

    return NextResponse.json(
      { ok: true, address: addressParam.toLowerCase(), badges: payload },
      {
        headers: {
          'cache-control': 's-maxage=30, stale-while-revalidate=60',
          'X-Request-ID': requestId,
        },
      }
    )
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to load badge history'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    )
  }
}
