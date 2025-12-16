/**
 * Badge Collection Frame Handler  
 * Multiple badges showcase
 */

import type { FrameHandlerContext } from '../types'
import { tracePush, buildHtmlResponse, shortenAddress } from '../utils'
import { fetchUserStats } from '../hybrid-data'

export async function handleBadgeCollectionFrame(ctx: FrameHandlerContext): Promise<Response> {
  const { params, traces, origin, defaultFrameImage, asJson } = ctx

  const fidParam = params.fid
  const userParam = params.user
  
  const fid = typeof fidParam === 'number' ? fidParam : typeof fidParam === 'string' ? parseInt(fidParam) : 0
  const userAddress = typeof userParam === 'string' ? userParam.toLowerCase() : ''

  tracePush(traces, 'badgecollection-start', { fid, address: userAddress })

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

    tracePush(traces, 'badgecollection-fetched', {
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

    // Build badge collection image URL
    const imageUrl = buildBadgeCollectionImageUrl(origin, stats)
    const frameHtml = buildBadgeCollectionFrameHtml({
      imageUrl,
      stats,
      origin,
      defaultFrameImage,
    })

    tracePush(traces, 'badgecollection-complete')
    return buildHtmlResponse(frameHtml)

  } catch (error: any) {
    tracePush(traces, 'badgecollection-error', error.message)
    return buildErrorFrame(origin, defaultFrameImage, 'Failed to load badge collection')
  }
}

function buildBadgeCollectionImageUrl(origin: string, stats: any): string {
  const url = new URL(`${origin}/api/frame/image/badgecollection`)
  url.searchParams.set('earnedCount', String(stats.badgeCount || 0))
  url.searchParams.set('eligibleCount', String(stats.badgeCount + 5 || 5))
  url.searchParams.set('badgeXp', String(stats.badgePrestige || stats.badgeCount * 25))
  url.searchParams.set('username', stats.username || stats.displayName || shortenAddress(stats.address))
  url.searchParams.set('address', stats.address || '')
  url.searchParams.set('fid', String(stats.fid || 0))
  url.searchParams.set('displayName', stats.displayName || stats.username || '')
  
  // TODO: Add earnedBadges array when badge metadata is available
  // url.searchParams.set('earnedBadges', JSON.stringify(stats.badges || []))
  
  return url.toString()
}

function buildBadgeCollectionFrameHtml(params: {
  imageUrl: string
  stats: any
  origin: string
  defaultFrameImage: string
}): string {
  const { imageUrl, stats, origin, defaultFrameImage } = params

  const buttons = [
    { label: '🏅 My Badges', action: 'link', target: `${origin}/badges` },
    { label: '📊 Stats', action: 'link', target: `${origin}/profile` },
    { label: '🏆 Leaderboard', action: 'link', target: `${origin}/leaderboard` },
  ]

  const metaTags = [
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="fc:frame:image:aspect_ratio" content="1:1" />`,
    `<meta property="og:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="og:title" content="Gmeowbased - Badge Collection" />`,
    `<meta property="og:description" content="${stats.badgeCount} badges earned" />`,
  ]

  buttons.forEach((btn, i) => {
    metaTags.push(`<meta property="fc:frame:button:${i + 1}" content="${btn.label}" />`)
    metaTags.push(`<meta property="fc:frame:button:${i + 1}:action" content="${btn.action}" />`)
    metaTags.push(`<meta property="fc:frame:button:${i + 1}:target" content="${btn.target}" />`)
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Gmeowbased - Badge Collection</title>
  ${metaTags.join('\n  ')}
</head>
<body>
  <h1>🏅 Badge Collection</h1>
  <p><strong>Badges:</strong> ${stats.badgeCount}</p>
  <p><strong>User:</strong> ${stats.username || shortenAddress(stats.address)}</p>
  <p><a href="${origin}">Play Gmeowbased</a></p>
</body>
</html>`
}

function buildErrorFrame(origin: string, imageUrl: string, message: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Error</title>
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${imageUrl}" />
  <meta property="og:image" content="${imageUrl}" />
</head>
<body>
  <h1>Error</h1>
  <p>${message}</p>
</body>
</html>`
  
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}
