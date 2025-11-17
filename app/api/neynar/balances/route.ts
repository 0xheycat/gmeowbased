export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { withErrorHandler, handleValidationError, handleExternalApiError } from '@/lib/error-handler'

export const GET = withErrorHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url)
  const fid = searchParams.get('fid')
  const networks = (searchParams.get('networks') || 'base').trim()

  if (!fid) {
    return handleValidationError(new Error('Missing fid parameter'))
  }

  const key = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY
  if (!key) {
    throw new Error('NEYNAR_API_KEY not configured')
  }

  const url = new URL('https://api.neynar.com/v2/farcaster/user/balance/')
  url.searchParams.set('fid', fid)
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
    throw handleExternalApiError(
      new Error(`Neynar API returned ${res.status}: ${JSON.stringify(json)}`),
      'Neynar'
    )
  }
  
  return NextResponse.json({ ok: true, data: json }, { status: 200 })
})