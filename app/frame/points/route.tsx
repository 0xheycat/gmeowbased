// app/frame/points/route.tsx
// Dynamic Points Display Frame Route
// DIRECT HANDLER: Directly calls points handler instead of proxying

import { NextResponse } from 'next/server'
import { sanitizeFID, sanitizeChainKey } from '@/lib/frames/frame-validation'
import { handlePointsFrame } from '@/lib/frames/handlers/points'

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
  
  try {
    // Directly call handler with validated parameters
    const response = await handlePointsFrame({
      req,
      url,
      params: {
        type: 'points',
        user: user || undefined,
        fid: fid ? String(fid) : undefined,
        chain: chain || undefined,
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