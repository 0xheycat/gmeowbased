/**
 * GM Frame Handler
 * Daily GM ritual and streak tracking using hybrid data
 */

import type { FrameHandlerContext } from '../types'
import { tracePush, buildHtmlResponse, formatPoints, shortenAddress, timeAgo } from '../utils'
import { fetchUserStats } from '../hybrid-data'
import { getUserProfile } from '@/lib/supabase/queries/user'

export async function handleGMFrame(ctx: FrameHandlerContext): Promise<Response> {
  const { params, traces, origin, defaultFrameImage, asJson } = ctx

  const fidParam = params.fid
  const userParam = params.user
  const fid = typeof fidParam === 'number' ? fidParam : typeof fidParam === 'string' ? parseInt(fidParam) : 0
  const userAddress = typeof userParam === 'string' ? userParam.toLowerCase() : ''

  tracePush(traces, 'gm-start', { fid, address: userAddress })

  if (!userAddress && !fid) {
    return buildErrorFrame(origin, defaultFrameImage, 'No user specified')
  }

  try {
    // Resolve wallet address by FID if address not provided
    let resolvedAddress = userAddress
    if (!resolvedAddress && fid) {
      try {
        const profile = await getUserProfile('', fid)
        if (profile?.wallet_address) resolvedAddress = profile.wallet_address.toLowerCase()
      } catch (err) {
        console.warn('[gm-frame] Failed to resolve wallet by FID', err)
      }
    }

    // Fetch hybrid user stats
    const result = await fetchUserStats({ 
      address: resolvedAddress || '0x0', 
      fid, 
      traces 
    })
    const stats = result.data

    tracePush(traces, 'gm-fetched', {
      source: result.source,
      cached: result.cached,
      streak: stats.currentStreak,
      lifetimeGMs: stats.lifetimeGMs,
    })

    if (asJson) {
      return new Response(JSON.stringify({ 
        stats, 
        traces: result.traces 
      }, null, 2), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    // Build GM frame
    const imageUrl = buildGMImageUrl(origin, stats)
    const frameHtml = buildGMFrameHtml({
      imageUrl,
      stats,
      origin,
      defaultFrameImage,
    })

    tracePush(traces, 'gm-complete')
    return buildHtmlResponse(frameHtml)

  } catch (error: any) {
    tracePush(traces, 'gm-error', error.message)
    return buildErrorFrame(origin, defaultFrameImage, 'Failed to load GM data')
  }
}

function buildGMImageUrl(origin: string, stats: any): string {
  const url = new URL(`${origin}/api/frame/image/gm`)
  url.searchParams.set('streak', String(stats.currentStreak || 0))
  url.searchParams.set('lifetimeGMs', String(stats.lifetimeGMs || 0))
  url.searchParams.set('xp', String(stats.totalXP || 0))
  url.searchParams.set('username', stats.username || stats.displayName || shortenAddress(stats.address))
  return url.toString()
}

function buildGMFrameHtml(params: {
  imageUrl: string
  stats: any
  origin: string
  defaultFrameImage: string
}): string {
  const { imageUrl, stats, origin, defaultFrameImage } = params

  const buttons = [
    { label: '☀️ Send GM', action: 'post', target: `${origin}/api/frame/action/sendgm` },
    { label: '🔥 My Streak', action: 'post', target: `${origin}/api/frame?type=gm&user=${stats.address}` },
    { label: '🏆 Leaderboard', action: 'link', target: `${origin}/leaderboard` },
  ]

  const metaTags = [
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="fc:frame:image:aspect_ratio" content="1:1" />`,
    `<meta property="og:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="og:title" content="Gmeowbased - Daily GM" />`,
    `<meta property="og:description" content="${stats.currentStreak} day streak | ${stats.lifetimeGMs} total GMs" />`,
  ]

  buttons.forEach((btn, i) => {
    const idx = i + 1
    metaTags.push(`<meta property="fc:frame:button:${idx}" content="${btn.label}" />`)
    metaTags.push(`<meta property="fc:frame:button:${idx}:action" content="${btn.action}" />`)
    if (btn.target) {
      metaTags.push(`<meta property="fc:frame:button:${idx}:target" content="${btn.target}" />`)
    }
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Gmeowbased - GM</title>
  ${metaTags.join('\n  ')}
</head>
<body>
  <h1>☀️ GM!</h1>
  <p><strong>Streak:</strong> 🔥 ${stats.currentStreak} days</p>
  <p><strong>Lifetime GMs:</strong> ${stats.lifetimeGMs}</p>
  <p><strong>Total XP:</strong> ${formatPoints(stats.totalXP)}</p>
  <p><a href="${origin}">Play Gmeowbased</a></p>
</body>
</html>`
}

function buildErrorFrame(origin: string, defaultImage: string, message: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Error - Gmeowbased</title>
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${defaultImage}" />
  <meta property="fc:frame:button:1" content="🔄 Retry" />
  <meta property="fc:frame:button:1:action" content="post" />
  <meta property="fc:frame:button:1:target" content="${origin}/api/frame?type=gm" />
</head>
<body>
  <h1>⚠️ Error</h1>
  <p>${message}</p>
</body>
</html>`
  return buildHtmlResponse(html)
}
