// app/frame/referral/route.tsx
/**
 * Warpcast-safe frame endpoint for referral sharing
 * GI-11 compliant: Uses /frame/* pattern for user-facing URLs
 * 
 * DIRECT HANDLER: Directly calls referral handler instead of proxying
 * to ensure Farcaster crawlers receive proper OG tags in response headers
 */

import { NextResponse } from 'next/server'
import { sanitizeFID } from '@/lib/frames/frame-validation'
import { handleReferralFrame } from '@/lib/frames/handlers/referral'

export const runtime = 'nodejs'
export const revalidate = 300

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = `${url.protocol}//${url.host}`
  
  // Get referral parameters from query string
  const code = url.searchParams.get('code') || url.searchParams.get('ref') || ''
  const fidParam = url.searchParams.get('fid') || url.searchParams.get('referrerFid') || ''
  const fid = fidParam ? sanitizeFID(fidParam) : null
  const user = url.searchParams.get('user') || url.searchParams.get('addr') || ''
  
  try {
    // Wrap in Promise.race with timeout to prevent hanging
    const timeoutPromise = new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Frame generation timeout')), 4000)
    )
    
    const framePromise = handleReferralFrame({
      req,
      url,
      params: {
        type: 'referral',
        code: code || undefined,
        fid: fid ? String(fid) : undefined,
        user: user || undefined,
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