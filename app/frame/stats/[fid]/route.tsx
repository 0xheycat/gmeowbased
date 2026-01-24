// app/frame/stats/[fid]/route.tsx
/**
 * Warpcast-safe frame endpoint for user stats sharing
 * GI-11 compliant: Uses /frame/* pattern for user-facing URLs
 * 
 * DIRECT HANDLER: Directly calls onchainstats handler instead of proxying
 * to ensure Farcaster crawlers receive proper OG tags in response headers
 */

import { NextResponse } from 'next/server'
import { sanitizeFID, sanitizeChainKey } from '@/lib/frames/frame-validation'
import { handleOnchainStatsFrame } from '@/lib/frames/handlers/onchainstats'

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
  
  try {
    // Directly call handler with validated parameters
    const response = await handleOnchainStatsFrame({
      req,
      url,
      params: {
        type: 'onchainstats',
        fid: String(fid),
        chain: chain || undefined,
        user: url.searchParams.get('user') || undefined,
        debug: url.searchParams.get('debug') || undefined,
      },
      traces: [],
      origin,
      defaultFrameImage: `${origin}/frame-image.png`,
      asJson: false,
    })
    
    // Ensure proper cache headers for Farcaster crawlers
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    return new NextResponse('Frame generation failed', { 
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  }
}
