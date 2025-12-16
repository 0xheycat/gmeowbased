/**
 * Verify Frame Handler
 * Quest verification status display
 */

import type { FrameHandlerContext } from '../types'
import { tracePush, buildHtmlResponse } from '../utils'

export async function handleVerifyFrame(ctx: FrameHandlerContext): Promise<Response> {
  const { params, traces, origin, defaultFrameImage, asJson } = ctx

  const fidParam = params.fid
  const questIdParam = params.questId
  const verifiedParam = params.verified
  
  const fid = typeof fidParam === 'number' ? fidParam : typeof fidParam === 'string' ? parseInt(fidParam) : 0
  const questId = questIdParam ? String(questIdParam) : null
  const verified = verifiedParam === 'true' || verifiedParam === true

  tracePush(traces, 'verify-start', { fid, questId, verified })

  try {
    if (asJson) {
      return new Response(JSON.stringify({ 
        fid,
        questId,
        verified,
        traces 
      }, null, 2), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    // Build verify image URL
    const imageUrl = buildVerifyImageUrl(origin, { fid, questId, verified })
    const frameHtml = buildVerifyFrameHtml({
      imageUrl,
      origin,
      defaultFrameImage,
      fid,
      questId,
      verified,
    })

    tracePush(traces, 'verify-complete')
    return buildHtmlResponse(frameHtml)

  } catch (error: any) {
    tracePush(traces, 'verify-error', error.message)
    return buildErrorFrame(origin, defaultFrameImage, 'Failed to verify quest')
  }
}

function buildVerifyImageUrl(origin: string, params: { fid: number, questId: string | null, verified: boolean, questName?: string, username?: string }): string {
  const url = new URL(`${origin}/api/frame/image/verify`)
  url.searchParams.set('status', params.verified ? 'Verified' : 'Pending')
  if (params.fid) url.searchParams.set('fid', String(params.fid))
  if (params.questId) url.searchParams.set('questId', params.questId)
  if (params.questName) url.searchParams.set('questName', params.questName)
  if (params.username) url.searchParams.set('username', params.username)
  return url.toString()
}

function buildVerifyFrameHtml(params: {
  imageUrl: string
  origin: string
  defaultFrameImage: string
  fid: number
  questId: string | null
  verified: boolean
}): string {
  const { imageUrl, origin, defaultFrameImage, verified, questId } = params

  const title = verified ? 'Quest Verified!' : 'Verification Pending'
  const description = verified ? 
    `Quest ${questId} completed successfully` : 
    `Checking verification status for quest ${questId}`

  const buttons = verified ? [
    { label: '🎉 Claim Reward', action: 'link', target: `${origin}/quest/${questId}` },
    { label: '📊 My Progress', action: 'link', target: `${origin}/quests` },
    { label: '🏆 Leaderboard', action: 'link', target: `${origin}/leaderboard` },
  ] : [
    { label: '🔄 Retry Verify', action: 'post', target: `${origin}/api/frame?type=verify&questId=${questId}` },
    { label: '📖 Quest Details', action: 'link', target: `${origin}/quest/${questId}` },
  ]

  const metaTags = [
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="fc:frame:image:aspect_ratio" content="1:1" />`,
    `<meta property="og:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="og:title" content="Gmeowbased - ${title}" />`,
    `<meta property="og:description" content="${description}" />`,
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
  <title>Gmeowbased - ${title}</title>
  ${metaTags.join('\n  ')}
</head>
<body>
  <h1>${verified ? '✅' : '⏳'} ${title}</h1>
  <p>${description}</p>
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
