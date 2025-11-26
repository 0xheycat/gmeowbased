// app/frame/points/route.tsx
// Dynamic Points Display Frame Route

import { NextResponse } from 'next/server'
import { sanitizeFID, sanitizeChainKey } from '@/lib/frame-validation'

export const runtime = 'nodejs'
export const revalidate = 300

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = url.origin
  
  const user = url.searchParams.get('user') || url.searchParams.get('addr') || ''
  const fidParam = url.searchParams.get('fid') || url.searchParams.get('userFid')
  const fid = fidParam ? sanitizeFID(fidParam) : null
  const chainParam = url.searchParams.get('chain') || 'base'
  const chain = sanitizeChainKey(chainParam) || 'base'
  
  // Redirect to main frame handler with validated parameters
  const frameUrl = new URL('/api/frame', origin)
  frameUrl.searchParams.set('type', 'points')
  if (user) frameUrl.searchParams.set('user', user)
  if (fid) frameUrl.searchParams.set('fid', String(fid))
  frameUrl.searchParams.set('chain', chain)
  
  // Forward all extra params
  url.searchParams.forEach((value, key) => {
    if (!['user', 'addr', 'fid', 'userFid', 'chain'].includes(key)) {
      frameUrl.searchParams.set(key, value)
    }
  })
  
  const frameResponse = await fetch(frameUrl.toString(), {
    headers: { 'User-Agent': req.headers.get('User-Agent') || 'Farcaster-Crawler/1.0' }
  })
  
  if (!frameResponse.ok) {
    return new NextResponse('Frame generation failed', { status: 500 })
  }
  
  const frameHtml = await frameResponse.text()
  
  return new NextResponse(frameHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  })
}