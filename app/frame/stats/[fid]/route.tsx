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
  { params }: { params: Promise<{ fid: string }> }
) {
  // Validate FID from URL path
  const { fid: fidParam } = await params
  const fid = sanitizeFID(fidParam)
  
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
  
  // Redirect to API frame handler
  return NextResponse.redirect(frameUrl.toString(), 302)
}
