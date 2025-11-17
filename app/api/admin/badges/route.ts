import { NextResponse, type NextRequest } from 'next/server'

import { rateLimit, getClientIp, strictLimiter } from '@/lib/rate-limit'
import { AdminBadgeCreateSchema } from '@/lib/validation/api-schemas'
import { createBadgeTemplate, invalidateBadgeCaches, listBadgeTemplates } from '@/lib/badges'
import { validateAdminRequest } from '@/lib/admin-auth'
import type { BadgeTemplateInput } from '@/lib/badges'
import { CHAIN_IDS, type ChainKey } from '@/lib/gm-utils'

export const runtime = 'nodejs'

function parseTemplateInput(body: any): BadgeTemplateInput {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid payload')
  }

  const {
    name,
    slug,
    badgeType,
    description,
    chain,
    pointsCost,
    imageUrl,
    artPath,
    active,
    metadata,
  } = body

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('name is required')
  }
  if (typeof badgeType !== 'string' || badgeType.trim().length === 0) {
    throw new Error('badgeType is required')
  }
  if (typeof chain !== 'string') {
    throw new Error('chain is required')
  }
  const chainKey = chain.trim()
  if (!Object.prototype.hasOwnProperty.call(CHAIN_IDS, chainKey)) {
    throw new Error(`Unsupported chain: ${chain}`)
  }
  const points = Number(pointsCost)
  
  if (!Number.isFinite(points) || points < 0) {
    throw new Error('pointsCost must be a non-negative number')
  }

  return {
    name: name.trim(),
    slug: typeof slug === 'string' ? slug.trim() : undefined,
    badgeType: badgeType.trim(),
    description: typeof description === 'string' ? description : null,
    chain: chainKey as ChainKey,
    pointsCost: Math.floor(points),
    imageUrl: typeof imageUrl === 'string' ? imageUrl : null,
    artPath: typeof artPath === 'string' ? artPath : null,
    active: typeof active === 'boolean' ? active : true,
    metadata: metadata && typeof metadata === 'object' ? metadata : null,
  } as BadgeTemplateInput
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json({ ok: false, error: 'admin_auth_required', reason: auth.reason }, { status: 401 })
  }

  try {
    const force = req.nextUrl.searchParams.get('refresh') === '1'
    const templates = await listBadgeTemplates({ includeInactive: true, force, throwOnMissingTable: true })
    return NextResponse.json({ ok: true, templates })
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to load badge templates'
    const missingTable = typeof message === 'string' && message.includes('Supabase table')
    return NextResponse.json({ ok: false, error: message, missingTable }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json({ ok: false, error: 'admin_auth_required', reason: auth.reason }, { status: 401 })
  }

  try {
    const body = await req.json()
    const input = parseTemplateInput(body)
    const template = await createBadgeTemplate(input)
    await invalidateBadgeCaches()
    return NextResponse.json({ ok: true, template }, { status: 201 })
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to create badge template'
    const status = /required|invalid|exists/i.test(message) ? 400 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
