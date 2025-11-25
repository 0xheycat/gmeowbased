/**
 * Badge Frame Route
 * 
 * Displays individual badge showcase frames
 * Route: /api/frame/badge?fid=xxx&badgeId=yyy
 * 
 * CRITICAL: Uses /api/frame/badgeShare/image for OG images (NOT /api/frame/badge/image)
 * Last updated: 2025-11-20 - Fixed all 6 image path references
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { getUserBadges, loadBadgeRegistry } from '@/lib/badges'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/error-handler'
import { buildDynamicFrameImageUrl } from '@/lib/share'

/**
 * Farcaster Frame: Badge Showcase
 * Displays user's badge with tier styling
 * 
 * Route: /api/frame/badge?fid=xxx&badgeId=yyy
 * - If badgeId provided: Shows specific badge
 * - If badgeId omitted: Shows latest badge
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
      // No badges frame - use vNext JSON format matching main route
      const noBadgesImageUrl = buildDynamicFrameImageUrl({ type: 'badge' as any, badgeId: 'none', fid, extra: { state: 'none' } }, getBaseUrl(request))
      
      return new NextResponse(
        `<!DOCTYPE html>
<html>
  <head>
    <meta name="fc:frame" content="${JSON.stringify({
      version: 'next',
      imageUrl: noBadgesImageUrl,
      button: {
        title: 'View Profile',
        action: {
          type: 'launch_frame',
          name: 'Gmeowbased',
          url: `${getBaseUrl(request)}/profile/${fid}`,
          splashImageUrl: `${getBaseUrl(request)}/splash.png`,
          splashBackgroundColor: '#000000'
        }
      }
    }).replace(/"/g, '&quot;')}" />
   
    <meta property="og:image" content="${noBadgesImageUrl}" />
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

    // Get target badge: specific badgeId if provided, otherwise latest
    let targetBadge
    if (badgeIdParam) {
      // Find specific badge by badgeId
      targetBadge = badges.find((b) => b.badgeId === badgeIdParam)
      if (badgeIdParam && !targetBadge) {
        // Badge not found - multi-format for miniapp compatibility
        const notFoundImageUrl = buildDynamicFrameImageUrl({ type: 'badge' as any, badgeId: badgeIdParam, fid, extra: { state: 'notfound' } }, getBaseUrl(request))

        
        return new NextResponse(
          `<!DOCTYPE html>
<html>
  <head>
  <meta name="fc:frame" content='${JSON.stringify({
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
      }
    }
  }).replace(/'/g, "&#39;")}' />
    <meta property="og:image" content="${notFoundImageUrl}" />
    <meta property="og:title" content="Badge Not Found" />
    <meta property="og:description" content="This badge could not be found in the user's collection." />
  </head>
  <body>
    <p>Badge not found in collection.</p>
  </body>
</html>`,
          {
            status: 404,
            headers: { 'Content-Type': 'text/html' },
          }
        )
      }
    } else {
      // Get latest badge with latest patched(most recently assigned)
      targetBadge = badges.sort(
        (a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
      )[0]
    }

    // Safety check: ensure targetBadge exists after logic above
    if (!targetBadge) {
      return new NextResponse('Badge not found', { status: 404 })
    }

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

    // Build frame HTML - vNext JSON format matching main route
    // Using buildDynamicFrameImageUrl (trusted source pattern like working frames)
    const badgeImageUrl = buildDynamicFrameImageUrl({ type: 'badge' as any, badgeId: targetBadge.badgeId, fid }, getBaseUrl(request))
    const launchUrl = `${getBaseUrl(request)}/profile/${fid}/badges`
    const splashImageUrl = `${getBaseUrl(request)}/splash.png`
    
    const frameHtml = `<!DOCTYPE html>
<html>
  <head>
    <!-- Farcaster vNext JSON format (matches Farville working implementation) -->
    <meta name="fc:frame" content="${JSON.stringify({
      version: 'next',
      imageUrl: badgeImageUrl,
      button: {
        title: 'View Badge Collection',
        action: {
          type: 'launch_frame',
          name: 'Gmeowbased',
          url: launchUrl,
          splashImageUrl: splashImageUrl,
          splashBackgroundColor: '#000000'
        }
      }
    }).replace(/"/g, '&quot;')}" />
    
    <!-- OpenGraph metadata -->
    <meta property="og:image" content="${badgeImageUrl}" />
    <meta property="og:title" content="${(targetBadge.metadata as { name?: string })?.name || targetBadge.badgeType} Badge" />
    <meta property="og:description" content="${(targetBadge.metadata as { description?: string })?.description || `${tierConfig.name} tier badge`}" />
    
    <style>
      body {
        margin: 0;
        padding: 20px;
        background: linear-gradient(135deg, ${framePalette.background}, ${framePalette.secondary}20);
        font-family: system-ui, -apple-system, sans-serif;
        color: white;
      }
      .container {
        max-width: 768px;
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
      <h1>${(targetBadge.metadata as { name?: string })?.name || targetBadge.badgeType}</h1>
      <span class="tier">${tierConfig.name}</span>
      ${targetBadge.minted ? '<div class="minted">✓ Minted On-Chain</div>' : ''}
      <p>${(targetBadge.metadata as { description?: string })?.description || ''}</p>
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
