/**
 * OnchainStats Frame Handler
 * Comprehensive on-chain statistics from Subsquid
 */

import type { FrameHandlerContext } from '../types'
import { tracePush, buildHtmlResponse, formatPoints, shortenAddress } from '../utils'
import { fetchUserStats } from '../hybrid-data'
import { getUserProfile } from '@/lib/supabase/queries/user'

export async function handleOnchainStatsFrame(ctx: FrameHandlerContext): Promise<Response> {
  const { params, traces, origin, defaultFrameImage, asJson } = ctx

  const fidParam = params.fid
  const userParam = params.user
  const fid = typeof fidParam === 'number' ? fidParam : typeof fidParam === 'string' ? parseInt(fidParam) : 0
  const userAddress = typeof userParam === 'string' ? userParam.toLowerCase() : ''

  tracePush(traces, 'onchainstats-start', { fid, address: userAddress })

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
        console.warn('[onchainstats-frame] Failed to resolve wallet by FID', err)
      }
    }

    // Fetch comprehensive stats
    const result = await fetchUserStats({ 
      address: resolvedAddress || '0x0', 
      fid, 
      traces 
    })
    const stats = result.data

    // Compile on-chain summary
    const onchainSummary = {
      totalXP: stats.totalXP,
      gmStreak: stats.currentStreak,
      lifetimeGMs: stats.lifetimeGMs,
      badges: stats.badgeCount,
      guilds: stats.guildRole ? 1 : 0,
      referrals: stats.referralCodes,
      // Additional computed stats
      avgGMsPerWeek: stats.lifetimeGMs > 0 ? Math.round(stats.lifetimeGMs / 4) : 0, // Rough estimate
      rank: 'Unknown', // Would need leaderboard position
    }

    tracePush(traces, 'onchainstats-compiled', { onchainSummary })

    if (asJson) {
      return new Response(JSON.stringify({ 
        stats,
        onchainSummary,
        traces: result.traces 
      }, null, 2), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    // Build stats frame
    const imageUrl = buildOnchainStatsImageUrl(origin, stats, onchainSummary)
    const frameHtml = buildOnchainStatsFrameHtml({
      imageUrl,
      stats,
      onchainSummary,
      origin,
      defaultFrameImage,
    })

    tracePush(traces, 'onchainstats-complete')
    return buildHtmlResponse(frameHtml)

  } catch (error: any) {
    tracePush(traces, 'onchainstats-error', error.message)
    return buildErrorFrame(origin, defaultFrameImage, 'Failed to load stats')
  }
}

function buildOnchainStatsImageUrl(origin: string, stats: any, summary: any): string {
  const url = new URL(`${origin}/api/frame/image/onchainstats`)
  url.searchParams.set('username', stats.username || shortenAddress(stats.address))
  url.searchParams.set('xp', String(summary.totalXP))
  url.searchParams.set('streak', String(summary.gmStreak))
  url.searchParams.set('gms', String(summary.lifetimeGMs || 0))
  url.searchParams.set('badges', String(summary.badges))
  url.searchParams.set('guilds', String(summary.guildCount || 0))
  url.searchParams.set('referrals', String(summary.referralCount || 0))
  return url.toString()
}

function buildOnchainStatsFrameHtml(params: {
  imageUrl: string
  stats: any
  onchainSummary: any
  origin: string
  defaultFrameImage: string
}): string {
  const { imageUrl, stats, onchainSummary, origin, defaultFrameImage } = params

  const buttons = [
    { label: '📊 Dashboard', action: 'link', target: `${origin}/Dashboard` },
    { label: '🏆 Leaderboard', action: 'link', target: `${origin}/leaderboard` },
    { label: '🔄 Refresh', action: 'post', target: `${origin}/api/frame?type=onchainstats&user=${stats.address}` },
  ]

  const metaTags = [
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="fc:frame:image:aspect_ratio" content="1:1" />`,
    `<meta property="og:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="og:title" content="Gmeowbased - On-Chain Stats" />`,
    `<meta property="og:description" content="${formatPoints(onchainSummary.totalXP)} XP | ${onchainSummary.gmStreak}🔥 streak" />`,
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
  <title>On-Chain Stats - Gmeowbased</title>
  ${metaTags.join('\n  ')}
</head>
<body>
  <h1>⛓️ On-Chain Statistics</h1>
  <p><strong>User:</strong> ${stats.username || shortenAddress(stats.address)}</p>
  
  <h2>🎯 Performance:</h2>
  <ul>
    <li><strong>Total XP:</strong> ${formatPoints(onchainSummary.totalXP)}</li>
    <li><strong>GM Streak:</strong> 🔥 ${onchainSummary.gmStreak} days</li>
    <li><strong>Lifetime GMs:</strong> ${onchainSummary.lifetimeGMs}</li>
    <li><strong>Avg GMs/Week:</strong> ${onchainSummary.avgGMsPerWeek}</li>
  </ul>
  
  <h2>🏆 Achievements:</h2>
  <ul>
    <li><strong>Badges:</strong> ${onchainSummary.badges}</li>
    <li><strong>Guilds:</strong> ${onchainSummary.guilds}</li>
    <li><strong>Referrals:</strong> ${onchainSummary.referrals}</li>
  </ul>
  
  <p><strong>Data Source:</strong> Subsquid (Real-time blockchain indexing)</p>
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
