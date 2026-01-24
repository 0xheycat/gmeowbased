// app/frame/leaderboard/route.tsx
/**
 * Warpcast-safe frame endpoint for leaderboard sharing
 * GI-11 compliant: Uses /frame/* pattern for user-facing URL
 * 
 * DIRECT HANDLER: Directly calls leaderboard handler instead of proxying
 * to ensure Farcaster crawlers receive proper OG tags in response headers
 */

import { NextResponse } from 'next/server'
import { sanitizeChainKey } from '@/lib/frames/frame-validation'
import { handleLeaderboardFrame } from '@/lib/frames/handlers/leaderboard'

export const runtime = 'nodejs'
export const revalidate = 300

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = `${url.protocol}//${url.host}`
  
  // Validate optional chain parameter
  // Special values for global leaderboard: 'all', 'global', 'combined'
  let chain = url.searchParams.get('chain')
  if (chain) {
    const chainLower = chain.toLowerCase().trim()
    const isGlobalAlias = ['all', 'global', 'combined'].includes(chainLower)
    
    if (isGlobalAlias) {
      // Pass through global aliases without validation
      chain = chainLower
    } else {
      // Validate actual chain keys
      const validChain = sanitizeChainKey(chain)
      if (!validChain) {
        return new NextResponse('Invalid chain parameter', { status: 400 })
      }
      chain = validChain
    }
  }
  
  try {
    // Directly call handler with validated parameters
    const response = await handleLeaderboardFrame({
      req,
      url,
      params: {
        type: 'leaderboards',
        chain: chain || undefined,
        global: url.searchParams.get('global') || undefined,
        limit: url.searchParams.get('limit') || undefined,
        season: url.searchParams.get('season') || undefined,
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
