// app/frame/gm/route.tsx
// Dynamic GM / Daily Streak Frame Route
// Migrated from /api/frame?type=gm

import { NextResponse } from 'next/server'
import { sanitizeFID } from '@/lib/frames/frame-validation'
import { buildDynamicFrameImageUrl } from '@/lib/api/share'
import * as Ne from '@/lib/integrations/neynar'

export const runtime = 'nodejs'
export const revalidate = 300 // 5 minutes

type GMData = {
  gmCount: number
  streak: number
  lastGMDate: Date | null
}

async function fetchGMData(fid: number): Promise<GMData> {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: gmEvents, error } = await supabase
      .from('gmeow_rank_events')
      .select('created_at, chain')
      .eq('fid', fid)
      .eq('event_type', 'gm')
      .order('created_at', { ascending: false })
    
    if (error || !gmEvents || gmEvents.length === 0) {
      return { gmCount: 0, streak: 0, lastGMDate: null }
    }
    
    const gmCount = gmEvents.length
    const lastGMDate = new Date(gmEvents[0].created_at)
    
    // Calculate streak
    const uniqueDates = Array.from(
      new Set(
        gmEvents.map(event => {
          const d = new Date(event.created_at)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        })
      )
    ).sort().reverse()
    
    let streak = 1
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const currentDate = new Date(uniqueDates[i] + 'T00:00:00')
      const nextDate = new Date(uniqueDates[i + 1] + 'T00:00:00')
      const dayDiff = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (dayDiff === 1) {
        streak++
      } else {
        break
      }
    }
    
    return { gmCount, streak, lastGMDate }
  } catch (err) {
    console.error('[gm-frame] Error fetching GM data:', err)
    return { gmCount: 0, streak: 0, lastGMDate: null }
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = new URL(url.origin).origin
  
  // Get fid from query params
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
    } catch (err) {
      console.error('[gm-frame] Error fetching Neynar profile:', err)
    }
  }
  
  // Fetch GM data
  let gmData: GMData = { gmCount: 0, streak: 0, lastGMDate: null }
  if (fid) {
    gmData = await fetchGMData(fid)
  }
  
  const { gmCount, streak, lastGMDate } = gmData
  
  // Build title with streak milestones
  let title = 'GM Ritual • GMEOW'
  let heroBadgeLabel = 'GM'
  let heroBadgeIcon = '☀️'
  
  if (streak >= 30) {
    title = `🔥 ${streak}-Day Streak! Legendary!`
    heroBadgeLabel = 'LEGEND'
    heroBadgeIcon = '🔥'
  } else if (streak >= 7) {
    title = `⚡ ${streak}-Day Streak! Amazing!`
    heroBadgeLabel = 'HOT STREAK'
    heroBadgeIcon = '⚡'
  } else if (gmCount > 0) {
    title = `☀️ Good Morning! GM Count: ${gmCount}`
  }
  
  // Daily status
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isToday = lastGMDate && lastGMDate.getTime() >= today.getTime()
  
  let description: string
  if (isToday && streak > 0) {
    description = `✅ GM sent today! Keep your ${streak}-day streak alive • ⚡ Unlock multipliers + hidden boosts • — @gmeowbased`
  } else if (streak > 0) {
    description = `☀️ Send your GM now to continue your ${streak}-day streak! • ⚡ Unlock multipliers + hidden boosts • — @gmeowbased`
  } else {
    description = '🌅 Log your GM streak • ⚡ Unlock multipliers + hidden boosts • — @gmeowbased'
  }
  
  const launchUrl = `${origin}/gm`
  
  // Build dynamic image
  const imageUrl = fid
    ? buildDynamicFrameImageUrl({ 
        type: 'gm', 
        fid, 
        extra: { gmCount, streak, username, displayName } 
      }, origin)
    : `${origin}/frame-image.png`
  
  // Build Mini App Embed (vNext format)
  const frameJson = {
    version: 'next',
    imageUrl: imageUrl,
    button: {
      title: 'Open GM Ritual',
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
    <meta property="fc:frame:state" content="${escapeHtml(JSON.stringify({ frameType: 'gm' }))}" />
    <meta property="fc:frame:post_url" content="${origin}/api/frame" />
    <meta property="fc:frame:button:1" content="Open GM Ritual" />
    
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${launchUrl}" />
    <meta name="fc:frame:text" content="☀️ Just stacked my daily GM ritual! Join the meow squad @gmeowbased" />
    
    <style>
      body {
        margin: 0;
        padding: 20px;
        background: linear-gradient(135deg, #201005, #ff950020);
        font-family: system-ui, sans-serif;
        color: white;
        min-height: 100dvh;
      }
      .container {
        max-width: 768px;
        margin: 0 auto;
        padding: 30px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 20px;
        border: 2px solid #ff9500;
        box-shadow: 0 0 40px #ff950040;
      }
      .badge {
        display: inline-block;
        padding: 6px 14px;
        background: #ff950040;
        border: 1px solid #ff9500;
        border-radius: 6px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 12px;
      }
      h1 {
        color: #ff9500;
        margin: 0 0 16px 0;
        font-size: 24px;
        text-shadow: 0 2px 8px #ff950040;
      }
      p {
        line-height: 1.7;
        color: rgb(226 231 255);
        margin: 12px 0;
        font-size: 15px;
      }
      .powered-by {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid #ff950020;
        font-size: 12px;
        color: #ffab4080;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <span class="badge">${heroBadgeIcon} ${heroBadgeLabel}</span>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <div class="powered-by">Powered by @gmeowbased</div>
    </div>
  </body>
</html>`
  
  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'x-frame-options': 'ALLOWALL',
      'access-control-allow-origin': '*',
    }
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
