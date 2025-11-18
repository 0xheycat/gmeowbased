import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { getUserBadges, loadBadgeRegistry } from '@/lib/badges'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/error-handler'

/**
 * Farcaster Frame: Badge Showcase
 * Displays user's latest badge with tier styling
 * Route: /api/frame/badge?fid=xxx
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return new NextResponse('Rate limit exceeded', { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const fidParam = searchParams.get('fid')

    if (!fidParam) {
      return new NextResponse('Missing fid parameter', { status: 400 })
    }

    const fid = parseInt(fidParam)
    
    // Zod validation
    const fidValidation = FIDSchema.safeParse(fid)
    if (!fidValidation.success) {
      return new NextResponse('Invalid fid parameter', { status: 400 })
    }

    // Fetch user badges
    const badges = await getUserBadges(fid)
    const badgeRegistry = loadBadgeRegistry()

    if (badges.length === 0) {
      // No badges frame - use JSON format per Farcaster spec
      const noBadgesEmbed = {
        version: '1',
        imageUrl: `${getBaseUrl(request)}/api/frame/badge/image?fid=${fid}&state=none`,
        button: {
          title: 'View Profile',
          action: {
            type: 'link',
            url: `${getBaseUrl(request)}/profile/${fid}`
          }
        }
      }
      return new NextResponse(
        `<!DOCTYPE html>
<html>
  <head>
    <meta name="fc:frame" content='${JSON.stringify(noBadgesEmbed).replace(/'/g, "&#39;")}' />
    <meta property="og:image" content="${getBaseUrl(request)}/api/frame/badge/image?fid=${fid}&state=none" />
    <meta property="og:title" content="No Badges Yet" />
    <meta property="og:description" content="This user hasn't earned any badges yet." />
  </head>
  <body>
    <p>No badges earned yet.</p>
  </body>
</html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }
      )
    }

    // Get latest badge (most recently assigned)
    const latestBadge = badges.sort(
      (a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    )[0]

    const badgeDefinition = badgeRegistry.badges.find(
      (b) => b.badgeType === latestBadge.badgeType
    )

    const tierConfig = badgeRegistry.tiers[latestBadge.tier]
    const badgeMetadata = badgeDefinition?.metadata as { frame?: { palette?: Record<string, string> } } | undefined
    const framePalette = badgeMetadata?.frame?.palette || {
      primary: tierConfig.color,
      secondary: tierConfig.color,
      background: '#000000',
      accent: '#FFFFFF',
    }

    // Build frame HTML - JSON format per Farcaster spec
    const badgeEmbed = {
      version: '1',
      imageUrl: `${getBaseUrl(request)}/api/frame/badge/image?fid=${fid}&badgeId=${latestBadge.badgeId}`,
      button: {
        title: 'View Badge Inventory',
        action: {
          type: 'link',
          url: `${getBaseUrl(request)}/profile/${fid}/badges`
        }
      }
    }
    const frameHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta name="fc:frame" content='${JSON.stringify(badgeEmbed).replace(/'/g, "&#39;")}' />
    <meta property="og:image" content="${getBaseUrl(request)}/api/frame/badge/image?fid=${fid}&badgeId=${latestBadge.badgeId}" />
    <meta property="og:title" content="${(latestBadge.metadata as { name?: string })?.name || latestBadge.badgeType} Badge" />
    <meta property="og:description" content="${(latestBadge.metadata as { description?: string })?.description || `${tierConfig.name} tier badge`}" />
    
    <style>
      body {
        margin: 0;
        padding: 20px;
        background: linear-gradient(135deg, ${framePalette.background}, ${framePalette.secondary}20);
        font-family: system-ui, -apple-system, sans-serif;
        color: white;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 30px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 20px;
        border: 2px solid ${framePalette.primary};
        box-shadow: 0 0 40px ${framePalette.primary}40;
      }
      h1 {
        color: ${framePalette.primary};
        margin-bottom: 10px;
      }
      .tier {
        display: inline-block;
        padding: 4px 12px;
        background: ${framePalette.primary}40;
        border: 1px solid ${framePalette.primary};
        border-radius: 6px;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        color: ${framePalette.primary};
      }
      .minted {
        margin-top: 10px;
        color: #7CFF7A;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>${(latestBadge.metadata as { name?: string })?.name || latestBadge.badgeType}</h1>
      <span class="tier">${tierConfig.name}</span>
      ${latestBadge.minted ? '<div class="minted">✓ Minted On-Chain</div>' : ''}
      <p>${(latestBadge.metadata as { description?: string })?.description || ''}</p>
      <p><a href="${getBaseUrl(request)}/profile/${fid}/badges" style="color: ${framePalette.accent}">View Full Collection →</a></p>
    </div>
  </body>
</html>`

    return new NextResponse(frameHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
})

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'gmeowhq.art'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}
