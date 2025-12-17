// app/frame/verify/route.tsx
// Dynamic Quest Verification Frame Route

import { NextResponse } from 'next/server'
import { sanitizeFID } from '@/lib/frames/frame-validation'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = url.origin
  
  const fidParam = url.searchParams.get('fid')
  const fid = fidParam ? sanitizeFID(fidParam) : null
  const cast = url.searchParams.get('cast') || ''
  const questId = url.searchParams.get('questId') || url.searchParams.get('id') || ''
  
  // Redirect to main frame handler
  const frameUrl = new URL('/api/frame', origin)
  frameUrl.searchParams.set('type', 'verify')
  if (fid) frameUrl.searchParams.set('fid', String(fid))
  if (cast) frameUrl.searchParams.set('cast', cast)
  if (questId) frameUrl.searchParams.set('questId', questId)
  
  // Forward debug parameter if present
  const debugParam = url.searchParams.get('debug')
  if (debugParam) frameUrl.searchParams.set('debug', debugParam)
  
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
      'Cache-Control': 'public, max-age=60'
    }
  })
}