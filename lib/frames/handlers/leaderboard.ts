/**
 * Leaderboard Frame Handler
 * Displays top players using hybrid Subsquid + Supabase data
 */

import type { FrameHandlerContext } from '../types'
import { tracePush, toBooleanFlag, getChainDisplayName, sanitizeNumber, buildHtmlResponse, formatPoints, shortenAddress } from '../utils'
import { fetchLeaderboard } from '../hybrid-data'
import { getChainIconUrl } from '@/lib/utils/chain-icons'

export async function handleLeaderboardFrame(ctx: FrameHandlerContext): Promise<Response> {
  const { params, traces, origin, defaultFrameImage, asJson } = ctx

  // Parse parameters
  const rawChain = typeof params.chain === 'string' ? params.chain.trim() : ''
  const rawMode = typeof params.mode === 'string' ? params.mode.trim() : ''
  const rawSeason = typeof params.season === 'string' ? params.season.trim() : ''
  const limitParam = params.limit ?? params.top ?? params.size
  
  const normalizedChain = rawChain ? rawChain.toLowerCase() : ''
  const isGlobal = toBooleanFlag(params.global) || 
                   ['all', 'global', 'combined'].includes(normalizedChain) || 
                   rawMode.toLowerCase() === 'global'
  
  // Base-only for now (multi-chain support can be added later)
  const chainKey = 'base'
  const chainDisplay = isGlobal ? 'All Chains' : getChainDisplayName(chainKey)
  const chainIcon = isGlobal ? null : getChainIconUrl(chainKey)
  
  const limit = sanitizeNumber(limitParam, 3, 10)
  const period = rawSeason === 'current' || rawSeason === 'weekly' ? 'weekly' :
                 rawSeason === 'monthly' ? 'monthly' : 'all_time'

  tracePush(traces, 'leaderboard-start', { 
    chain: chainKey, 
    global: isGlobal, 
    period, 
    limit 
  })

  // Fetch hybrid leaderboard data (Subsquid + Supabase)
  try {
    const result = await fetchLeaderboard({ limit, offset: 0, period, chain: chainKey, traces })
    const topEntries = result.data

    tracePush(traces, 'leaderboard-fetched', {
      source: result.source,
      cached: result.cached,
      count: topEntries.length,
    })

    // Build frame response
    if (asJson) {
      return new Response(JSON.stringify({ 
        entries: topEntries, 
        chain: chainDisplay, 
        period,
        traces: result.traces 
      }, null, 2), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    // Build HTML frame
    const imageUrl = buildLeaderboardImageUrl(origin, { topEntries, chainDisplay, period })
    const frameHtml = buildLeaderboardFrameHtml({ 
      imageUrl, 
      topEntries, 
      chainDisplay, 
      chainIcon, 
      origin, 
      defaultFrameImage,
      period,
    })

    tracePush(traces, 'leaderboard-complete', { 
      totalTime: traces[traces.length - 1].ts - traces[0].ts 
    })

    return buildHtmlResponse(frameHtml)

  } catch (error: any) {
    tracePush(traces, 'leaderboard-error', error.message)
    
    // Fallback error frame
    const errorHtml = buildErrorFrameHtml(origin, defaultFrameImage, 'Failed to load leaderboard')
    return buildHtmlResponse(errorHtml, { 'cache-control': 'no-cache' })
  }
}

// -------------------- Image URL Builder --------------------

function buildLeaderboardImageUrl(
  origin: string, 
  params: { 
    topEntries: any[]
    chainDisplay: string
    period: string
  }
): string {
  const url = new URL(`${origin}/api/frame/image/leaderboard`)
  url.searchParams.set('season', params.period)
  
  // Pass top 3 with proper parameter names
  if (params.topEntries[0]) {
    url.searchParams.set('top1', params.topEntries[0].displayName || params.topEntries[0].username || shortenAddress(params.topEntries[0].address))
    url.searchParams.set('top1Points', String(params.topEntries[0].totalScore || 0))
  }
  if (params.topEntries[1]) {
    url.searchParams.set('top2', params.topEntries[1].displayName || params.topEntries[1].username || shortenAddress(params.topEntries[1].address))
  }
  if (params.topEntries[2]) {
    url.searchParams.set('top3', params.topEntries[2].displayName || params.topEntries[2].username || shortenAddress(params.topEntries[2].address))
  }
  
  url.searchParams.set('total', String(params.topEntries.length))
  
  return url.toString()
}

// -------------------- HTML Frame Builder --------------------

function buildLeaderboardFrameHtml(params: {
  imageUrl: string
  topEntries: any[]
  chainDisplay: string
  chainIcon: string | null
  origin: string
  defaultFrameImage: string
  period: string
}): string {
  const { imageUrl, topEntries, chainDisplay, chainIcon, origin, defaultFrameImage, period } = params

  const buttons = [
    {
      label: '🔄 Refresh',
      action: 'post',
      target: `${origin}/api/frame?type=leaderboards&season=${period}`,
    },
    {
      label: '📊 Your Rank',
      action: 'post',
      target: `${origin}/api/frame?type=points`,
    },
    {
      label: '🏆 Compete',
      action: 'link',
      target: `${origin}/leaderboard`,
    },
  ]

  const metaTags = [
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="fc:frame:image:aspect_ratio" content="1:1" />`,
    `<meta property="og:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="og:title" content="Gmeowbased Leaderboard - ${chainDisplay}" />`,
    `<meta property="og:description" content="Top ${topEntries.length} players competing for glory!" />`,
  ]

  // Add buttons
  buttons.forEach((btn, i) => {
    const btnIndex = i + 1
    metaTags.push(`<meta property="fc:frame:button:${btnIndex}" content="${btn.label}" />`)
    metaTags.push(`<meta property="fc:frame:button:${btnIndex}:action" content="${btn.action}" />`)
    if (btn.target) {
      metaTags.push(`<meta property="fc:frame:button:${btnIndex}:target" content="${btn.target}" />`)
    }
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Gmeowbased Leaderboard - ${chainDisplay}</title>
  ${metaTags.join('\n  ')}
</head>
<body>
  <h1>🏆 Leaderboard: ${chainDisplay}</h1>
  <p>Period: ${period === 'weekly' ? 'Weekly' : period === 'monthly' ? 'Monthly' : 'All Time'}</p>
  <ol>
    ${topEntries.map(entry => `
      <li>
        <strong>#${entry.rank} ${entry.displayName || entry.username || shortenAddress(entry.address)}</strong>
        - ${formatPoints(entry.totalScore)} pts
        ${entry.gmStreak > 0 ? `(🔥 ${entry.gmStreak} streak)` : ''}
      </li>
    `).join('')}
  </ol>
  <p><a href="${origin}/leaderboard">View Full Leaderboard</a></p>
</body>
</html>`
}

// -------------------- Error Frame --------------------

function buildErrorFrameHtml(origin: string, defaultImage: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Error - Gmeowbased</title>
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${defaultImage}" />
  <meta property="fc:frame:image:aspect_ratio" content="1:1" />
  <meta property="fc:frame:button:1" content="🔄 Retry" />
  <meta property="fc:frame:button:1:action" content="post" />
  <meta property="fc:frame:button:1:target" content="${origin}/api/frame?type=leaderboards" />
</head>
<body>
  <h1>⚠️ Error</h1>
  <p>${message}</p>
</body>
</html>`
}
