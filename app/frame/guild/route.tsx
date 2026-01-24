// app/frame/guild/route.tsx
// Dynamic Guild Frame Route

import { NextResponse } from 'next/server'
import { sanitizeFID } from '@/lib/frames/frame-validation'
import { buildDynamicFrameImageUrl } from '@/lib/api/share'
import * as Ne from '@/lib/integrations/neynar'

export const runtime = 'nodejs'
export const revalidate = 300

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = url.origin
  
  const guildId = Number(url.searchParams.get('id') || url.searchParams.get('guildId') || 0)
  const fidParam = url.searchParams.get('fid') || url.searchParams.get('user')
  const fid = fidParam ? sanitizeFID(fidParam) : null
  
  // Resolve username
  let username: string | null = null
  let displayName: string | null = null
  if (fid && Ne && typeof Ne.fetchUserByFid === 'function') {
    try {
      const fcUser = await Ne.fetchUserByFid(Number(fid))
      if (fcUser) {
        username = fcUser.username?.trim() || null
        displayName = fcUser.displayName?.trim() || null
      }
    } catch {}
  }
  
  // Fetch guild name for better SEO (with timeout)
  let guildName = guildId ? `Guild #${guildId}` : 'Guild'
  if (guildId) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 2000) // 2s timeout
      
      const guildResponse = await fetch(`${origin}/api/guild/${guildId}`, {
        next: { revalidate: 300 }, // Cache for 5 minutes
        signal: controller.signal
      })
      clearTimeout(timeout)
      
      if (guildResponse.ok) {
        const guildData = await guildResponse.json()
        if (guildData.guild?.name) {
          guildName = guildData.guild.name
        }
      }
    } catch (err) {
      // Fallback to Guild #X on error
      console.error('[Frame] Failed to fetch guild name:', err)
    }
  }
  
  const title = guildName
  const description = guildId ? `Join ${guildName} on @gmeowbased` : '@gmeowbased guild preview'
  const guildUrl = `${origin}/guild/${guildId}`
  
  const imageUrl = buildDynamicFrameImageUrl({
    type: 'guild',
    fid: fid || undefined,
    extra: { username, displayName, guildId: String(guildId) }
  }, origin)
  
  const frameJson = {
    version: '1',
    imageUrl,
    button: {
      title: 'Open Guild',
      action: {
        type: 'launch_frame',
        name: 'Gmeowbased',
        url: guildUrl,
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
    <meta property="og:url" content="${guildUrl}" />
    <meta property="og:image" content="${imageUrl}" />
    <style>
      body{margin:0;padding:20px;background:linear-gradient(135deg,#050a20,#4da3ff20);font-family:system-ui,sans-serif;color:#fff;min-height:100dvh}
      .container{max-width:768px;margin:0 auto;padding:30px;background:rgba(0,0,0,.6);border-radius:20px;border:2px solid #4da3ff}
      h1{color:#4da3ff;margin:0 0 16px}
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
      'cache-control': 'public, max-age=300',
      'x-frame-options': 'ALLOWALL',
      'access-control-allow-origin': '*'
    }
  })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m))
}