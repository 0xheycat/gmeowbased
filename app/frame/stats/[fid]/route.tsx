// app/frame/stats/[fid]/route.tsx
/**
 * Warpcast-safe frame endpoint for user stats sharing
 * GI-11 compliant: Uses /frame/* pattern for user-facing URLs
 */

import { NextResponse } from 'next/server'
import { sanitizeFID, sanitizeChainKey } from '@/lib/frames/frame-validation'
import { buildDynamicFrameImageUrl } from '@/lib/api/share'
import { fetchUserStats } from '@/lib/frames/hybrid-data'
import * as Ne from '@/lib/integrations/neynar'

export const runtime = 'nodejs'
export const revalidate = 300

function shortenAddress(addr: string, size = 4): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 2 + size)}…${addr.slice(-size)}`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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
    // Fetch user stats
    let username = ''
    let address = ''
    
    const stats = await fetchUserStats({ 
      address: '0x0', 
      fid, 
      traces: [] 
    })
    
    if (stats.data) {
      username = stats.data.username || shortenAddress(stats.data.address)
      address = stats.data.address
    }
    
    // Try to get Neynar profile for better display
    if (fid && Ne && typeof Ne.fetchUserByFid === 'function') {
      try {
        const fcUser = await Ne.fetchUserByFid(Number(fid))
        if (fcUser?.displayName) {
          username = fcUser.displayName
        }
      } catch {}
    }
    
    const totalXP = stats.data?.totalXP || 0
    const streak = stats.data?.currentStreak || 0
    const title = `⛓️ On-Chain Stats • ${username || `FID ${fid}`}`
    const description = `${totalXP} XP • 🔥 ${streak} day streak • @gmeowbased`
    const launchUrl = `${origin}/dashboard`
    
    // Build dynamic image
    const imageUrl = buildDynamicFrameImageUrl({
      type: 'onchainstats',
      fid,
      chain: chain as any,
      extra: { username, totalXP: String(totalXP), streak: String(streak) }
    }, origin)
    
    const frameJson = {
      version: '1',
      imageUrl: imageUrl,
      button: {
        title: 'View Stats',
        action: {
          type: 'launch_frame',
          name: 'Gmeowbased',
          url: launchUrl,
          splashImageUrl: `${origin}/splash.png`,
          splashBackgroundColor: '#000000'
        }
      }
    }
    
    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    
    <meta name="fc:frame" content="${JSON.stringify(frameJson).replace(/"/g, '&quot;')}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${launchUrl}" />
    
    <style>
      body { margin:0; padding:20px; background:linear-gradient(135deg,#001a4d,#0066ff20); font-family:system-ui,sans-serif; color:#fff; min-height:100dvh }
      .container { max-width:768px; margin:0 auto; padding:30px; background:rgba(0,0,0,.6); border-radius:20px; border:2px solid #0066ff }
      h1 { color:#0066ff; margin:0 0 16px 0; font-size:24px }
      p { line-height:1.7; margin:12px 0; font-size:15px }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
    </div>
  </body>
</html>`
    
    return new NextResponse(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
        'x-frame-options': 'ALLOWALL',
        'access-control-allow-origin': '*',
      }
    })
  } catch (error) {
    console.error('[stats-frame] Error:', error)
    return new NextResponse('Frame generation failed', { status: 500 })
  }
}
