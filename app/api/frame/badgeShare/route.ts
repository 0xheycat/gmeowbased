import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { withErrorHandler } from '@/lib/error-handler'
import { getUserBadges, loadBadgeRegistry } from '@/lib/badges'
import { FIDSchema } from '@/lib/validation/api-schemas'
import {
  buildBadgeShareImageUrl,
  getBadgeExplorerUrl,
  isValidBadgeId,
  isValidFid,
} from '@/lib/frame-badge'

function getBaseUrl(request: NextRequest): string {
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  return `${protocol}://${host}`
}

/**
 * Farcaster Frame: Badge Share
 * 
 * Shareable frame for a specific badge with OG image preview.
 * Route: /api/frame/badgeShare?fid=xxx&badgeId=yyy
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return new NextResponse('Rate limit exceeded', { status: 429 })
  }
    const { searchParams } = new URL(request.url)
    const fidParam = searchParams.get('fid')
    const badgeIdParam = searchParams.get('badgeId')

    // Validate FID
    if (!fidParam) {
      return new NextResponse('Missing fid parameter', { status: 400 })
    }

    const fid = parseInt(fidParam, 10)
    
    // Zod validation
    const fidValidation = FIDSchema.safeParse(fid)
    if (!fidValidation.success || !isValidFid(fid)) {
      return new NextResponse('Invalid fid parameter', { status: 400 })
    }

    // Validate badge ID
    if (!badgeIdParam) {
      return new NextResponse('Missing badgeId parameter', { status: 400 })
    }

    if (!isValidBadgeId(badgeIdParam)) {
      return new NextResponse('Invalid badgeId parameter', { status: 400 })
    }

    // Fetch user badges
    const badges = await getUserBadges(fid)
    const badgeRegistry = loadBadgeRegistry()

    // Find specific badge
    const targetBadge = badges.find((b) => b.badgeId === badgeIdParam)

    if (!targetBadge) {
      // Badge not found frame (vNext JSON format)
      const notFoundImageUrl = `${getBaseUrl(request)}/api/frame/badgeShare/image?fid=${fid}&badgeId=${badgeIdParam}&state=notfound`
      const notFoundEmbed = {
        version: 'next',
        imageUrl: notFoundImageUrl,
        button: {
          title: 'View All Badges',
          action: {
            type: 'launch_frame',
            name: 'Gmeowbased',
            url: `${getBaseUrl(request)}/profile/${fid}/badges`,
            splashImageUrl: `${getBaseUrl(request)}/logo.png`,
            splashBackgroundColor: '#000000'
          },
        },
      }
      
      return new NextResponse(
        `<!DOCTYPE html>
<html>
  <head>
    <meta name="fc:frame" content="${JSON.stringify(notFoundEmbed).replace(/"/g, '&quot;')}" />
    
    <meta property="og:image" content="${notFoundImageUrl}" />
    <meta property="og:title" content="Badge Not Found" />
    <meta property="og:description" content="This badge could not be found in the user's collection." />
  </head>
  <body>
    <p>Badge not found.</p>
  </body>
</html>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      )
    }

    // Get badge definition and tier config
    const badgeDefinition = badgeRegistry.badges.find(
      (b) => b.badgeType === targetBadge.badgeType
    )

    const tierConfig = badgeRegistry.tiers[targetBadge.tier]
    const badgeMetadata = badgeDefinition?.metadata as { frame?: { palette?: Record<string, string> } } | undefined
    const framePalette = badgeMetadata?.frame?.palette || {
      primary: tierConfig.color,
      secondary: tierConfig.color,
      background: '#000000',
      accent: '#FFFFFF',
    }

    const badgeName = (targetBadge.metadata as { name?: string })?.name || targetBadge.badgeType
    const badgeDescription = (targetBadge.metadata as { description?: string })?.description || `${tierConfig.name} tier badge`

    // Get explorer URL if minted
    const explorerUrl = getBadgeExplorerUrl(targetBadge)

    // Build OG image URL
    const ogImageUrl = buildBadgeShareImageUrl(fid, badgeIdParam, getBaseUrl(request))

    // Build Farcaster vNext JSON embed format
    // Reference: https://miniapps.farcaster.xyz/docs/specification
    // vNext requires JSON format in fc:frame meta tag (not legacy property-based tags)
    const frameEmbed = {
      version: 'next',
      imageUrl: ogImageUrl,
      button: {
        title: 'View Collection',
        action: {
          type: 'launch_frame',
          name: 'Gmeowbased',
          url: `${getBaseUrl(request)}/profile/${fid}/badges`,
          splashImageUrl: `${getBaseUrl(request)}/logo.png`,
          splashBackgroundColor: '#000000'
        },
      },
    }

    // Build frame HTML
    const frameHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta name="fc:frame" content="${JSON.stringify(frameEmbed).replace(/"/g, '&quot;')}" />
    
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:title" content="${badgeName} Badge" />
    <meta property="og:description" content="${badgeDescription}" />
    
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
      <h1>${badgeName}</h1>
      <span class="tier">${tierConfig.name}</span>
      ${targetBadge.minted ? '<div class="minted">✓ Minted On-Chain</div>' : ''}
      <p>${badgeDescription}</p>
      <p><a href="${getBaseUrl(request)}/profile/${fid}/badges" style="color: ${framePalette.accent}">View Full Collection →</a></p>
      ${explorerUrl ? `<p><a href="${explorerUrl}" style="color: ${framePalette.primary}" target="_blank">View on Explorer →</a></p>` : ''}
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
