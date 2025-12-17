export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { withErrorHandler, handleValidationError, handleExternalApiError } from '@/lib/middleware/error-handler'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { generateRequestId } from '@/lib/middleware/request-id'

export const GET = withErrorHandler(async (req: Request) => {
  const requestId = generateRequestId()
  const { searchParams } = new URL(req.url)
  const fidParam = searchParams.get('fid')
  const networks = (searchParams.get('networks') || 'base').trim()

  if (!fidParam) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Missing fid parameter' },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  const fid = parseInt(fidParam, 10)
  
  // GI-8: Validate FID with Zod
  const fidValidation = FIDSchema.safeParse(fid)
  if (!fidValidation.success) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Invalid fid parameter: must be a positive integer' },
      { status: 400, headers: { 'X-Request-ID': requestId } }
    )
  }

  const key = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY
  if (!key) {
    throw new Error('NEYNAR_API_KEY not configured')
  }

  const url = new URL('https://api.neynar.com/v2/farcaster/user/balance/')
  url.searchParams.set('fid', String(fid))
  url.searchParams.set('networks', networks)

  const res = await fetch(url.toString(), { 
    method: 'GET', 
    headers: { 'x-api-key': key, Accept: 'application/json' } 
  })
  
  const text = await res.text()
  let json: any = null
  try { 
    json = JSON.parse(text) 
  } catch { 
    json = { raw: text } 
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: 'external_api_error', message: `Neynar API returned ${res.status}`, details: json },
      { status: 502, headers: { 'X-Request-ID': requestId } }
    )
  }
  
  return NextResponse.json({ ok: true, data: json }, { 
    status: 200,
    headers: { 'X-Request-ID': requestId }
  })
})