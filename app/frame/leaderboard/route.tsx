// app/frame/leaderboard/route.tsx
/**
 * Warpcast-safe frame endpoint for leaderboard sharing
 * GI-11 compliant: Uses /frame/* pattern for user-facing URL
 */

import { NextResponse } from 'next/server'
import { sanitizeChainKey } from '@/lib/frames/frame-validation'

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
  
  // Redirect to main frame handler with validated parameters
  const frameUrl = new URL('/api/frame', origin)
  frameUrl.searchParams.set('type', 'leaderboards')
  if (chain) {
    frameUrl.searchParams.set('chain', chain)
  }
  
  // Forward debug parameter if present
  const debugParam = url.searchParams.get('debug')
  if (debugParam) {
    frameUrl.searchParams.set('debug', debugParam)
  }
  
  // Fetch frame HTML from API handler (crawlers don't follow redirects)
  const frameResponse = await fetch(frameUrl.toString(), {
    headers: {
      'User-Agent': req.headers.get('User-Agent') || 'Farcaster-Crawler/1.0',
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
    },
  })
}
