/**
 * Guild Frame Handler
 * Guild information and member roster using hybrid data
 */

import type { FrameHandlerContext } from '../types'
import { tracePush, buildHtmlResponse, formatPoints, shortenAddress, sanitizeNumber } from '../utils'
import { fetchGuildData } from '../hybrid-data'

export async function handleGuildFrame(ctx: FrameHandlerContext): Promise<Response> {
  const { params, traces, origin, defaultFrameImage, asJson } = ctx

  const guildIdParam = params.id || params.guildId
  const guildId = sanitizeNumber(guildIdParam, 1, 10000)

  tracePush(traces, 'guild-start', { guildId })

  if (!guildId || guildId < 1) {
    return buildErrorFrame(origin, defaultFrameImage, 'Invalid guild ID')
  }

  try {
    // Fetch hybrid guild data
    const result = await fetchGuildData({ guildId, traces })
    const guild = result.data

    tracePush(traces, 'guild-fetched', {
      source: result.source,
      cached: result.cached,
      members: guild.totalMembers,
    })

    if (asJson) {
      return new Response(JSON.stringify({ 
        guild, 
        traces: result.traces 
      }, null, 2), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    // Build guild frame
    const imageUrl = buildGuildImageUrl(origin, guild)
    const frameHtml = buildGuildFrameHtml({
      imageUrl,
      guild,
      origin,
      defaultFrameImage,
    })

    tracePush(traces, 'guild-complete')
    return buildHtmlResponse(frameHtml)

  } catch (error: any) {
    tracePush(traces, 'guild-error', error.message)
    return buildErrorFrame(origin, defaultFrameImage, 'Failed to load guild')
  }
}

function buildGuildImageUrl(origin: string, guild: any): string {
  const url = new URL(`${origin}/api/frame/image/guild`)
  url.searchParams.set('id', String(guild.id))
  url.searchParams.set('name', guild.name)
  url.searchParams.set('members', String(guild.totalMembers))
  url.searchParams.set('points', String(guild.totalPoints))
  url.searchParams.set('level', String(guild.level || 1))
  url.searchParams.set('owner', guild.owner || 'Unknown')
  return url.toString()
}

function buildGuildFrameHtml(params: {
  imageUrl: string
  guild: any
  origin: string
  defaultFrameImage: string
}): string {
  const { imageUrl, guild, origin, defaultFrameImage } = params

  const buttons = [
    { label: '👥 Members', action: 'post', target: `${origin}/api/frame?type=guild&id=${guild.id}&view=members` },
    { label: '📊 Stats', action: 'post', target: `${origin}/api/frame?type=guild&id=${guild.id}&view=stats` },
    { label: '🏰 Visit', action: 'link', target: `${origin}/guild/${guild.id}` },
  ]

  const metaTags = [
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="fc:frame:image:aspect_ratio" content="1:1" />`,
    `<meta property="og:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="og:title" content="${guild.name} - Gmeowbased Guild" />`,
    `<meta property="og:description" content="${guild.totalMembers} members | ${formatPoints(guild.totalPoints)} points" />`,
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
  <title>${guild.name} - Gmeowbased</title>
  ${metaTags.join('\n  ')}
</head>
<body>
  <h1>🏰 ${guild.name}</h1>
  <p><strong>Guild #${guild.id}</strong></p>
  <p><strong>Owner:</strong> ${shortenAddress(guild.owner)}</p>
  <p><strong>Members:</strong> ${guild.totalMembers}</p>
  <p><strong>Total Points:</strong> ${formatPoints(guild.totalPoints)}</p>
  <h2>Top Members:</h2>
  <ul>
    ${guild.membersWithProfiles.slice(0, 5).map((m: any) => `
      <li>${m.username || shortenAddress(m.address)} (${m.role})</li>
    `).join('')}
  </ul>
  <p><a href="${origin}/guild/${guild.id}">View Full Guild</a></p>
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
