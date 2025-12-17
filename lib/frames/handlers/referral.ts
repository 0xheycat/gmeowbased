/**
 * Referral Frame Handler
 * Referral code sharing and rewards tracking
 */

import type { FrameHandlerContext } from '../types'
import { tracePush, buildHtmlResponse, formatPoints, shortenAddress } from '../utils'
import { fetchUserStats } from '../hybrid-data'

export async function handleReferralFrame(ctx: FrameHandlerContext): Promise<Response> {
  const { params, traces, origin, defaultFrameImage, asJson } = ctx

  const fidParam = params.fid
  const userParam = params.user
  const codeParam = params.code
  
  const fid = typeof fidParam === 'number' ? fidParam : typeof fidParam === 'string' ? parseInt(fidParam) : 0
  const userAddress = typeof userParam === 'string' ? userParam.toLowerCase() : ''
  const referralCode = typeof codeParam === 'string' ? codeParam : null

  tracePush(traces, 'referral-start', { fid, address: userAddress, code: referralCode })

  if (!userAddress && !fid && !referralCode) {
    return buildErrorFrame(origin, defaultFrameImage, 'No user or code specified')
  }

  try {
    // Fetch user stats for referral count
    const result = await fetchUserStats({ 
      address: userAddress || '0x0', 
      fid, 
      traces 
    })
    const stats = result.data

    tracePush(traces, 'referral-fetched', {
      source: result.source,
      cached: result.cached,
      referralCount: stats.referralCodes,
    })

    if (asJson) {
      return new Response(JSON.stringify({ 
        stats, 
        referralCount: stats.referralCodes,
        traces: result.traces 
      }, null, 2), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    // Build referral frame
    const imageUrl = buildReferralImageUrl(origin, stats, referralCode)
    const frameHtml = buildReferralFrameHtml({
      imageUrl,
      stats,
      referralCode,
      origin,
      defaultFrameImage,
    })

    tracePush(traces, 'referral-complete')
    return buildHtmlResponse(frameHtml)

  } catch (error: any) {
    tracePush(traces, 'referral-error', error.message)
    return buildErrorFrame(origin, defaultFrameImage, 'Failed to load referral data')
  }
}

function buildReferralImageUrl(origin: string, stats: any, code: string | null): string {
  const url = new URL(`${origin}/api/frame/image/referral`)
  url.searchParams.set('username', stats.username || shortenAddress(stats.address))
  url.searchParams.set('code', code || 'GMBASE')
  url.searchParams.set('count', String(stats.referralCodes || 0))
  url.searchParams.set('rewards', String(stats.referralRewards || (stats.referralCodes || 0) * 50))
  return url.toString()
}

function buildReferralFrameHtml(params: {
  imageUrl: string
  stats: any
  referralCode: string | null
  origin: string
  defaultFrameImage: string
}): string {
  const { imageUrl, stats, referralCode, origin, defaultFrameImage } = params

  const shareUrl = referralCode 
    ? `${origin}?ref=${referralCode}`
    : `${origin}`

  const buttons = [
    { label: '🔗 Get My Code', action: 'link', target: `${origin}/Dashboard` },
    { label: '🎁 Rewards', action: 'post', target: `${origin}/api/frame?type=referral&user=${stats.address}` },
    { label: '📊 Dashboard', action: 'link', target: `${origin}/Dashboard` },
  ]

  const metaTags = [
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="fc:frame:image:aspect_ratio" content="1:1" />`,
    `<meta property="og:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="og:title" content="Gmeowbased - Referral Program" />`,
    `<meta property="og:description" content="${stats.referralCodes} referrals | Earn 50 XP per referral" />`,
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
  <title>Referral - Gmeowbased</title>
  ${metaTags.join('\n  ')}
</head>
<body>
  <h1>🔗 Referral Program</h1>
  <p><strong>User:</strong> ${stats.username || shortenAddress(stats.address)}</p>
  <p><strong>Referrals:</strong> ${stats.referralCodes}</p>
  ${referralCode ? `<p><strong>Code:</strong> ${referralCode}</p>` : ''}
  <h2>💰 Rewards:</h2>
  <ul>
    <li>🎁 50 XP per referral</li>
    <li>🏆 Bonus badges for milestones</li>
    <li>⭐ Special guild perks</li>
  </ul>
  <p><strong>Share:</strong> <a href="${shareUrl}">${shareUrl}</a></p>
  <p><a href="${origin}/dashboard">Get Your Referral Code</a></p>
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
