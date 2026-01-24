// app/frame/badge/[fid]/route.tsx
/**
 * Warpcast-safe frame endpoint for badge sharing
 * GI-11 compliant: Uses /frame/* pattern for user-facing URLs
 */

import { NextResponse } from 'next/server'
import { sanitizeFID } from '@/lib/frames/frame-validation'
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
  const badgeId = url.searchParams.get('badgeId') || 'gm-master'
  
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
    
    const badgeCount = stats.data?.badgeCount || 0
    const title = `🎖️ Badge Collection • ${username || `FID ${fid}`}`
    const description = `${badgeCount} badges earned • Unlock achievements • @gmeowbased`
    const launchUrl = `${origin}/dashboard`
    
    // Build dynamic image
    const imageUrl = buildDynamicFrameImageUrl({
      type: 'badge',
      fid,
      badgeId,
      extra: { username, badgeCount: String(badgeCount) }
    }, origin)
    
    const frameJson = {
      version: 'next',
      imageUrl: imageUrl,
      button: {
        title: 'View Badges',
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
      body { margin:0; padding:20px; background:linear-gradient(135deg,#200510,#ff6b9d20); font-family:system-ui,sans-serif; color:#fff; min-height:100dvh }
      .container { max-width:768px; margin:0 auto; padding:30px; background:rgba(0,0,0,.6); border-radius:20px; border:2px solid #ff6b9d }
      h1 { color:#ff6b9d; margin:0 0 16px 0; font-size:24px }
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
    console.error('[badge-frame] Error:', error)
    return new NextResponse('Frame generation failed', { status: 500 })
  }
}
