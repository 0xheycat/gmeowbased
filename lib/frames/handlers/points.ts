/**
 * Points Frame Handler
 * User points breakdown and rank progression
 */

import type { FrameHandlerContext } from '../types'
import { tracePush, buildHtmlResponse, formatPoints, shortenAddress } from '../utils'
import { fetchUserStats } from '../hybrid-data'

export async function handlePointsFrame(ctx: FrameHandlerContext): Promise<Response> {
  const { params, traces, origin, defaultFrameImage, asJson } = ctx

  const fidParam = params.fid
  const userParam = params.user
  const fid = typeof fidParam === 'number' ? fidParam : typeof fidParam === 'string' ? parseInt(fidParam) : 0
  const userAddress = typeof userParam === 'string' ? userParam.toLowerCase() : ''

  tracePush(traces, 'points-start', { fid, address: userAddress })

  if (!userAddress && !fid) {
    return buildErrorFrame(origin, defaultFrameImage, 'No user specified')
  }

  try {
    // Fetch hybrid user stats
    const result = await fetchUserStats({ 
      address: userAddress || '0x0', 
      fid, 
      traces 
    })
    const stats = result.data

    // Calculate breakdown
    const breakdown = {
      gmXP: stats.lifetimeGMs * 10, // Example: 10 XP per GM
      questXP: stats.questsCompleted * 50, // Example: 50 XP per quest
      viralXP: stats.viralXP,
      badgeXP: stats.badgeCount * 25,
      guildBonus: stats.guildRole ? 100 : 0,
      referralBonus: stats.referralCodes * 50,
    }

    tracePush(traces, 'points-calculated', { breakdown })

    if (asJson) {
      return new Response(JSON.stringify({ 
        stats, 
        breakdown,
        traces: result.traces 
      }, null, 2), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    // Build points frame
    const imageUrl = buildPointsImageUrl(origin, stats, breakdown)
    const frameHtml = buildPointsFrameHtml({
      imageUrl,
      stats,
      breakdown,
      origin,
      defaultFrameImage,
    })

    tracePush(traces, 'points-complete')
    return buildHtmlResponse(frameHtml)

  } catch (error: any) {
    tracePush(traces, 'points-error', error.message)
    return buildErrorFrame(origin, defaultFrameImage, 'Failed to load points')
  }
}

function buildPointsImageUrl(origin: string, stats: any, breakdown: any): string {
  const url = new URL(`${origin}/api/frame/image/points`)
  url.searchParams.set('totalXP', String(stats.totalXP || 0))
  url.searchParams.set('username', stats.username || stats.displayName || shortenAddress(stats.address))
  url.searchParams.set('gmXP', String(breakdown.gmXP || 0))
  url.searchParams.set('questXP', String(breakdown.questXP || 0))
  url.searchParams.set('viralXP', String(breakdown.viralXP || 0))
  return url.toString()
}

function buildPointsFrameHtml(params: {
  imageUrl: string
  stats: any
  breakdown: any
  origin: string
  defaultFrameImage: string
}): string {
  const { imageUrl, stats, breakdown, origin, defaultFrameImage } = params

  const buttons = [
    { label: '📊 Dashboard', action: 'link', target: `${origin}/Dashboard` },
    { label: '🎯 Quests', action: 'link', target: `${origin}/Quest` },
    { label: '🏆 Compete', action: 'link', target: `${origin}/leaderboard` },
  ]

  const metaTags = [
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="fc:frame:image:aspect_ratio" content="1:1" />`,
    `<meta property="og:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="og:title" content="Gmeowbased - Points Breakdown" />`,
    `<meta property="og:description" content="${formatPoints(stats.totalXP)} total XP" />`,
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
  <title>Points - Gmeowbased</title>
  ${metaTags.join('\n  ')}
</head>
<body>
  <h1>📊 Points Breakdown</h1>
  <p><strong>Total XP:</strong> ${formatPoints(stats.totalXP)}</p>
  <h2>Sources:</h2>
  <ul>
    <li>☀️ GM Streak: ${formatPoints(breakdown.gmXP)}</li>
    <li>🎯 Quests: ${formatPoints(breakdown.questXP)}</li>
    <li>🌟 Viral: ${formatPoints(breakdown.viralXP)}</li>
    <li>🎖️ Badges: ${formatPoints(breakdown.badgeXP)}</li>
    <li>🏰 Guild: ${formatPoints(breakdown.guildBonus)}</li>
    <li>🔗 Referrals: ${formatPoints(breakdown.referralBonus)}</li>
  </ul>
  <p><a href="${origin}/dashboard">View Full Dashboard</a></p>
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
