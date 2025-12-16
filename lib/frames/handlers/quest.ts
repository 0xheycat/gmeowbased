/**
 * Quest Frame Handler
 * Quest information and completion tracking (Supabase-focused)
 */

import type { FrameHandlerContext } from '../types'
import { tracePush, buildHtmlResponse, formatPoints, sanitizeNumber } from '../utils'

export async function handleQuestFrame(ctx: FrameHandlerContext): Promise<Response> {
  const { params, traces, origin, defaultFrameImage, asJson } = ctx

  const questIdParam = params.questId || params.id
  const questId = sanitizeNumber(questIdParam, 1, 10000)

  tracePush(traces, 'quest-start', { questId })

  if (!questId || questId < 1) {
    return buildErrorFrame(origin, defaultFrameImage, 'Invalid quest ID')
  }

  try {
    // Fetch quest from Supabase (quests are off-chain data)
    tracePush(traces, 'quest-supabase-start')
    const { getActiveQuests } = await import('@/lib/supabase/queries/quests')
    const quests = await getActiveQuests({ userFid: undefined })
    const quest = quests.find((q: any) => q.id === questId)
    tracePush(traces, 'quest-supabase-ok', { questId, title: quest?.title })

    if (!quest) {
      return buildErrorFrame(origin, defaultFrameImage, 'Quest not found')
    }

    if (asJson) {
      return new Response(JSON.stringify({ 
        quest, 
        traces 
      }, null, 2), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    // Build quest frame
    const imageUrl = buildQuestImageUrl(origin, quest)
    const frameHtml = buildQuestFrameHtml({
      imageUrl,
      quest,
      origin,
      defaultFrameImage,
    })

    tracePush(traces, 'quest-complete')
    return buildHtmlResponse(frameHtml)

  } catch (error: any) {
    tracePush(traces, 'quest-error', error.message)
    return buildErrorFrame(origin, defaultFrameImage, 'Failed to load quest')
  }
}

function buildQuestImageUrl(origin: string, quest: any): string {
  const url = new URL(`${origin}/api/frame/image/quest`)
  url.searchParams.set('id', String(quest.id))
  url.searchParams.set('title', quest.title || 'Quest')
  url.searchParams.set('reward', String(quest.reward || 0))
  url.searchParams.set('difficulty', quest.difficulty || 'intermediate')
  url.searchParams.set('completed', String(quest.completed || false))
  return url.toString()
}

function buildQuestFrameHtml(params: {
  imageUrl: string
  quest: any
  origin: string
  defaultFrameImage: string
}): string {
  const { imageUrl, quest, origin, defaultFrameImage } = params

  const buttons = [
    { label: '✅ Complete', action: 'link', target: `${origin}/Quest?quest=${quest.id}` },
    { label: '📜 All Quests', action: 'link', target: `${origin}/Quest` },
    { label: '🏆 Progress', action: 'link', target: `${origin}/Dashboard` },
  ]

  const metaTags = [
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="fc:frame:image:aspect_ratio" content="1:1" />`,
    `<meta property="og:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="og:title" content="${quest.title} - Gmeowbased Quest" />`,
    `<meta property="og:description" content="Reward: ${formatPoints(quest.reward || 0)} XP" />`,
  ]

  buttons.forEach((btn, i) => {
    const idx = i + 1
    metaTags.push(`<meta property="fc:frame:button:${idx}" content="${btn.label}" />`)
    metaTags.push(`<meta property="fc:frame:button:${idx}:action" content="${btn.action}" />`)
    if (btn.target) {
      metaTags.push(`<meta property="fc:frame:button:${idx}:target" content="${btn.target}" />`)
    }
  })

  const difficultyMap: Record<string, string> = {
    easy: '⭐',
    beginner: '⭐',
    medium: '⭐⭐',
    intermediate: '⭐⭐',
    hard: '⭐⭐⭐',
    advanced: '⭐⭐⭐',
  }
  const difficultyEmoji = difficultyMap[quest.difficulty || 'medium'] || '⭐⭐'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${quest.title} - Gmeowbased</title>
  ${metaTags.join('\n  ')}
</head>
<body>
  <h1>🎯 ${quest.title}</h1>
  <p><strong>Quest #${quest.id}</strong></p>
  <p><strong>Difficulty:</strong> ${difficultyEmoji}</p>
  <p><strong>Reward:</strong> ${formatPoints(quest.reward || 0)} XP</p>
  <p>${quest.description || 'Complete this quest to earn rewards!'}</p>
  <h2>Requirements:</h2>
  <ul>
    ${(quest.requirements || []).map((req: string) => `<li>${req}</li>`).join('')}
  </ul>
  <p><a href="${origin}/Quest?quest=${quest.id}">Start Quest</a></p>
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
