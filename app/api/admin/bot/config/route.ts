import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { generateRequestId } from '@/lib/middleware/request-id'
import { rateLimit, getClientIp, strictLimiter } from '@/lib/middleware/rate-limit'
import { validateAdminRequest } from '@/lib/auth/admin'
import { loadBotStatsConfig, saveBotStatsConfig, sanitiseBotStatsConfigInput } from '@/lib/bot/config'
import { DEFAULT_BOT_STATS_CONFIG, type BotStatsConfig } from '@/lib/bot/config/types'
import { withErrorHandler } from '@/lib/middleware/error-handler'
import { BotConfigUpdateSchema } from '@/lib/validation/api-schemas'

export const runtime = 'nodejs'

function unauthorizedResponse(reason: string) {
  return NextResponse.json({ ok: false, error: 'admin_auth_required', reason }, { status: 401 })
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim().length > 0) return error
  return fallback
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const requestId = generateRequestId()
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return unauthorizedResponse(auth.reason ?? 'unknown')
  }

  try {
    const config = await loadBotStatsConfig({ refresh: true })
    return NextResponse.json({ ok: true, config }, { headers: { 'X-Request-ID': requestId } })
  } catch (error) {
    console.warn('[bot-config] Failed to load config for admin panel:', (error as Error)?.message || error)
    return NextResponse.json({ ok: true, config: { ...DEFAULT_BOT_STATS_CONFIG }, warning: toErrorMessage(error, 'Falling back to defaults.') }, { headers: { 'X-Request-ID': requestId } })
  }
})

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const requestId = generateRequestId()
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, strictLimiter)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return unauthorizedResponse(auth.reason ?? 'unknown')
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json', message: 'Request body must be valid JSON.' }, { status: 400, headers: { 'X-Request-ID': requestId } })
  }

  // Validate input with Zod
  const validation = BotConfigUpdateSchema.safeParse(payload)
  if (!validation.success) {
    return NextResponse.json(
      { ok: false, error: 'validation_error', issues: validation.error.issues },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  const config = sanitiseBotStatsConfigInput(validation.data) as BotStatsConfig

  try {
    await saveBotStatsConfig(config)
    return NextResponse.json({ ok: true, config }, { headers: { 'X-Request-ID': requestId } })
  } catch (error) {
    const message = toErrorMessage(error, 'Unable to persist bot stats configuration.')
    return NextResponse.json({ ok: false, error: 'save_failed', message }, { status: 500, headers: { 'X-Request-ID': requestId } })
  }
})
