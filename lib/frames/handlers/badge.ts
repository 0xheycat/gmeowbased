/**
 * Badge Frame Handler
 * Badge showcase and achievements
 */

import type { FrameHandlerContext } from '../types'
import { tracePush, buildHtmlResponse, shortenAddress } from '../utils'
import { fetchUserStats } from '../hybrid-data'

export async function handleBadgeFrame(ctx: FrameHandlerContext): Promise<Response> {
  const { params, traces, origin, defaultFrameImage, asJson } = ctx

  const fidParam = params.fid
  const userParam = params.user
  const badgeIdParam = params.badgeId || params.id
  
  const fid = typeof fidParam === 'number' ? fidParam : typeof fidParam === 'string' ? parseInt(fidParam) : 0
  const userAddress = typeof userParam === 'string' ? userParam.toLowerCase() : ''
  const badgeId = badgeIdParam ? String(badgeIdParam) : null

  tracePush(traces, 'badge-start', { fid, address: userAddress, badgeId })

  if (!userAddress && !fid) {
    return buildErrorFrame(origin, defaultFrameImage, 'No user specified')
  }

  try {
    // Fetch user stats for badge count
    const result = await fetchUserStats({ 
      address: userAddress || '0x0', 
      fid, 
      traces 
    })
    const stats = result.data

    tracePush(traces, 'badge-fetched', {
      source: result.source,
      cached: result.cached,
      badgeCount: stats.badgeCount,
    })

    if (asJson) {
      return new Response(JSON.stringify({ 
        stats, 
        badgeCount: stats.badgeCount,
        traces: result.traces 
      }, null, 2), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    // Build badge frame
    const imageUrl = buildBadgeImageUrl(origin, stats, badgeId)
    const frameHtml = buildBadgeFrameHtml({
      imageUrl,
      stats,
      badgeId,
      origin,
      defaultFrameImage,
    })

    tracePush(traces, 'badge-complete')
    return buildHtmlResponse(frameHtml)

  } catch (error: any) {
    tracePush(traces, 'badge-error', error.message)
    return buildErrorFrame(origin, defaultFrameImage, 'Failed to load badges')
  }
}

function buildBadgeImageUrl(origin: string, stats: any, badgeId: string | null): string {
  const url = new URL(`${origin}/api/frame/image/badge`)
  url.searchParams.set('username', stats.username || shortenAddress(stats.address))
  url.searchParams.set('count', String(stats.badgeCount))
  url.searchParams.set('id', badgeId || 'gm-master')
  url.searchParams.set('name', stats.latestBadgeName || 'GM Master')
  url.searchParams.set('earned', stats.latestBadgeDate || new Date().toISOString().split('T')[0])
  return url.toString()
}

function buildBadgeFrameHtml(params: {
  imageUrl: string
  stats: any
  badgeId: string | null
  origin: string
  defaultFrameImage: string
}): string {
  const { imageUrl, stats, badgeId, origin, defaultFrameImage } = params

  const buttons = [
    { label: '🎖️ My Badges', action: 'post', target: `${origin}/api/frame?type=badge&user=${stats.address}` },
    { label: '🏆 Earn More', action: 'link', target: `${origin}/Quest` },
    { label: '📊 Dashboard', action: 'link', target: `${origin}/Dashboard` },
  ]

  const metaTags = [
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="fc:frame:image:aspect_ratio" content="1:1" />`,
    `<meta property="og:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="og:title" content="Gmeowbased - Badges" />`,
    `<meta property="og:description" content="${stats.badgeCount} badges earned" />`,
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
  <title>Badges - Gmeowbased</title>
  ${metaTags.join('\n  ')}
</head>
<body>
  <h1>🎖️ Badges</h1>
  <p><strong>User:</strong> ${stats.username || shortenAddress(stats.address)}</p>
  <p><strong>Badges Earned:</strong> ${stats.badgeCount}</p>
  ${badgeId ? `<p><strong>Viewing Badge:</strong> #${badgeId}</p>` : ''}
  <p>Badges represent your achievements in Gmeowbased. Complete quests, maintain streaks, and participate in guilds to earn more!</p>
  <p><a href="${origin}/Dashboard">View Dashboard</a></p>
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
</head>
<body>
  <h1>⚠️ Error</h1>
  <p>${message}</p>
</body>
</html>`
  return buildHtmlResponse(html)
}
