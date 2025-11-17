import { NextResponse, type NextRequest } from 'next/server'

import { rateLimit, getClientIp, strictLimiter } from '@/lib/rate-limit'
import { AdminBadgeUpdateSchema } from '@/lib/validation/api-schemas'
import { deleteBadgeTemplate, getBadgeTemplateById, invalidateBadgeCaches, updateBadgeTemplate } from '@/lib/badges'
import { validateAdminRequest } from '@/lib/admin-auth'
import { CHAIN_IDS, type ChainKey } from '@/lib/gm-utils'
import type { BadgeTemplateInput } from '@/lib/badges'

export const runtime = 'nodejs'

function normalizeInput(body: any, allowPartial = false): Partial<BadgeTemplateInput> {
  if (!body || typeof body !== 'object') {
    if (allowPartial) return {}
    throw new Error('Invalid payload')
  }

  const result: any = {}
  if ('name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim()) throw new Error('name must be a non-empty string')
    result.name = body.name.trim()
  }
  if ('slug' in body) {
    if (body.slug != null && typeof body.slug !== 'string') throw new Error('slug must be a string')
    result.slug = typeof body.slug === 'string' ? body.slug : undefined
  }
  if ('badgeType' in body) {
    if (typeof body.badgeType !== 'string' || !body.badgeType.trim()) throw new Error('badgeType must be a non-empty string')
    result.badgeType = body.badgeType.trim()
  }
  if ('description' in body) {
    if (body.description != null && typeof body.description !== 'string') throw new Error('description must be a string')
    result.description = typeof body.description === 'string' ? body.description : null
  }
  if ('chain' in body) {
    if (typeof body.chain !== 'string') throw new Error('chain must be a string')
    const chain = body.chain.trim()
    if (!Object.prototype.hasOwnProperty.call(CHAIN_IDS, chain)) throw new Error(`Unsupported chain: ${body.chain}`)
    result.chain = chain as ChainKey
  }
  if ('pointsCost' in body) {
    const points = Number(body.pointsCost)
    if (!Number.isFinite(points) || points < 0) throw new Error('pointsCost must be a non-negative number')
    result.pointsCost = Math.floor(points)
  }
  if ('imageUrl' in body) {
    if (body.imageUrl != null && typeof body.imageUrl !== 'string') throw new Error('imageUrl must be a string')
    result.imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : null
  }
  if ('artPath' in body) {
    if (body.artPath != null && typeof body.artPath !== 'string') throw new Error('artPath must be a string')
    result.artPath = typeof body.artPath === 'string' ? body.artPath : null
  }
  if ('active' in body) {
    if (typeof body.active !== 'boolean') throw new Error('active must be boolean')
    result.active = body.active
  }
  if ('metadata' in body) {
    if (body.metadata != null && typeof body.metadata !== 'object') throw new Error('metadata must be an object')
    result.metadata = body.metadata ?? null
  }
  return result
}

type RouteContext = { params: Promise<{ id?: string | string[] }> }

async function resolveId(context: RouteContext): Promise<string> {
  const params = await context.params
  const value = params?.id
  const id = Array.isArray(value) ? value[0] : value
  if (!id || typeof id !== 'string') {
    throw new Error('Missing badge template id')
  }
  return id
}

export async function GET(req: NextRequest, context: RouteContext) {
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
    const id = await resolveId(context)
    const template = await getBadgeTemplateById(id)
    if (!template) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, template })
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to load badge template'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
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
    
    // Zod validation
    const validation = AdminBadgeUpdateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'Invalid badge update data',
          details: validation.error.flatten()
        },
        { status: 400 }
      )
    }
    
    const updates = normalizeInput(body, true)
    const id = await resolveId(context)
    const template = await updateBadgeTemplate(id, updates)
    await invalidateBadgeCaches()
    return NextResponse.json({ ok: true, template })
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to update badge template'
    const status = /must|Unsupported|exists/i.test(message) ? 400 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
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
    const id = await resolveId(context)
    await deleteBadgeTemplate(id)
    await invalidateBadgeCaches()
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to delete badge template'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
