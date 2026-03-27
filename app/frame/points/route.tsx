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
    // Wrap in Promise.race with timeout to prevent hanging
    const timeoutPromise = new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Frame generation timeout')), 4000)
    )
    
    const framePromise = handlePointsFrame({
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
    
    // Race: first to complete wins
    const response = await Promise.race([framePromise, timeoutPromise])
    
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