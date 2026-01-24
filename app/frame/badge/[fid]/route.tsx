// app/frame/badge/[fid]/route.tsx
/**
 * Warpcast-safe frame endpoint for badge sharing
 * GI-11 compliant: Uses /frame/* pattern for user-facing URLs
 * 
 * DIRECT HANDLER: Directly calls badge handler instead of proxying
 * to ensure Farcaster crawlers receive proper OG tags in response headers
 */

import { NextResponse } from 'next/server'
import { sanitizeFID } from '@/lib/frames/frame-validation'
import { handleBadgeFrame } from '@/lib/frames/handlers/badge'

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
  
  try {
    // Directly call handler with validated parameters
    const response = await handleBadgeFrame({
      req,
      url,
      params: {
        type: 'badge',
        fid: String(fid),
        // Pass through query parameters (handle null values)
        badgeId: url.searchParams.get('badgeId') || undefined,
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
