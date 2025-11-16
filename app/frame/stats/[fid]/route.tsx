// app/frame/stats/[fid]/route.tsx
/**
 * Warpcast-safe frame endpoint for user stats sharing
 * GI-11 compliant: Uses /frame/* pattern for user-facing URLs
 */

import { NextResponse } from 'next/server'
import { sanitizeFID, sanitizeChainKey } from '@/lib/frame-validation'

export const runtime = 'nodejs'
export const revalidate = 300

export async function GET(
  req: Request,
  { params }: { params: { fid: string } }
) {
  // Validate FID from URL path
  const fid = sanitizeFID(params.fid)
  
  if (!fid) {
    return new NextResponse('Invalid FID', { status: 400 })
  }
  
  const url = new URL(req.url)
  const origin = `${url.protocol}//${url.host}`
  
  // Validate optional chain parameter
  let chain = url.searchParams.get('chain')
  if (chain) {
    const validChain = sanitizeChainKey(chain)
    if (!validChain) {
      return new NextResponse('Invalid chain parameter', { status: 400 })
    }
    chain = validChain
  }
  
  // Redirect to main frame handler with validated parameters
  const frameUrl = new URL('/api/frame', origin)
  frameUrl.searchParams.set('type', 'onchainstats')
  frameUrl.searchParams.set('fid', String(fid))
  if (chain) {
    frameUrl.searchParams.set('chain', chain)
  }
  
  // Forward debug parameter if present
  const debugParam = url.searchParams.get('debug')
  if (debugParam) {
    frameUrl.searchParams.set('debug', debugParam)
  }
  
  // Fetch frame from API handler
  const frameResponse = await fetch(frameUrl.toString(), {
    headers: {
      'User-Agent': req.headers.get('User-Agent') || 'GmeowFrame/1.0',
    },
  })
  
  if (!frameResponse.ok) {
    return new NextResponse('Frame generation failed', { status: 500 })
  }
  
  const frameHtml = await frameResponse.text()
  
  return new NextResponse(frameHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      'X-Frame-Options': 'ALLOWALL',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
