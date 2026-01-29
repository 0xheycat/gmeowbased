/**
 * NFT Frame Handler
 * NFT collection showcase
 */

import type { FrameHandlerContext } from '../types'
import { tracePush, buildHtmlResponse, shortenAddress } from '../utils'
import { fetchUserStats } from '../hybrid-data'
import { getUserProfile } from '@/lib/supabase/queries/user'
import { getUserNFTStats } from '@/lib/integrations/subsquid-client'

export async function handleNFTFrame(ctx: FrameHandlerContext): Promise<Response> {
  const { params, traces, origin, defaultFrameImage, asJson } = ctx

  const fidParam = params.fid
  const userParam = params.user
  
  const fid = typeof fidParam === 'number' ? fidParam : typeof fidParam === 'string' ? parseInt(fidParam) : 0
  const userAddress = typeof userParam === 'string' ? userParam.toLowerCase() : ''

  tracePush(traces, 'nft-start', { fid, address: userAddress })

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
        console.warn('[nft-frame] Failed to resolve wallet by FID', err)
      }
    }

    // Fetch user stats for basic info
    const result = await fetchUserStats({ address: resolvedAddress || '0x0', fid, traces })
    const stats = result.data
    
    // Fetch NFT data from Subsquid
    tracePush(traces, 'nft-subsquid-start')
    let nftStats;
    try {
      nftStats = await getUserNFTStats({ address: stats.address })
      tracePush(traces, 'nft-subsquid-ok', { count: nftStats.totalNFTs })
    } catch (nftError: any) {
      tracePush(traces, 'nft-subsquid-error', nftError.message)
      // Use fallback empty data
      nftStats = {
        address: stats.address,
        totalNFTs: 0,
        nftIds: [],
        recentMints: [],
        recentTransfers: []
      }
    }
    
    // Calculate NFT metrics (from hybrid-calculator.ts: nftPoints = nftMints.length * 100)
    const nftData = {
      nftCount: nftStats.totalNFTs,
      nftPoints: nftStats.totalNFTs * 100,
      totalValue: '0 ETH', // TODO: Calculate from NFT metadata
      nftIds: nftStats.nftIds,
      username: stats.username || shortenAddress(stats.address)
    }
    
    // Build NFT collection image URL
    const imageUrl = buildNFTImageUrl(origin, nftData)
    
    tracePush(traces, 'nft-fetched', { fid, address: userAddress, nftCount: nftData.nftCount })

    if (asJson) {
      return new Response(JSON.stringify({ 
        fid,
        address: userAddress,
        imageUrl,
        traces 
      }, null, 2), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    // Build NFT frame
    const frameHtml = buildNFTFrameHtml({
      imageUrl,
      origin,
      defaultFrameImage,
      fid,
      userAddress
    })

    tracePush(traces, 'nft-complete')
    return buildHtmlResponse(frameHtml)

  } catch (error: any) {
    tracePush(traces, 'nft-error', error.message)
    return buildErrorFrame(origin, defaultFrameImage, 'Failed to load NFT collection')
  }
}

function buildNFTImageUrl(origin: string, nftData: any): string {
  const url = new URL(`${origin}/api/frame/image/nft`)
  url.searchParams.set('nftCount', String(nftData.nftCount || 0))
  url.searchParams.set('nftPoints', String(nftData.nftPoints || 0))
  url.searchParams.set('totalValue', nftData.totalValue || '0 ETH')
  url.searchParams.set('username', nftData.username || 'Pilot')
  if (nftData.nftIds && nftData.nftIds.length > 0) {
    url.searchParams.set('nftIds', nftData.nftIds.join(','))
  }
  return url.toString()
}

function buildNFTFrameHtml(params: {
  imageUrl: string
  origin: string
  defaultFrameImage: string
  fid: number
  userAddress: string
}): string {
  const { imageUrl, origin, defaultFrameImage, fid, userAddress } = params

  const buttons = [
    { label: '🖼️ View Collection', action: 'link', target: `${origin}/nft/${fid}` },
    { label: '📊 Stats', action: 'link', target: `${origin}/profile/${fid}` },
    { label: '🏆 Leaderboard', action: 'link', target: `${origin}/leaderboard` },
  ]

  const metaTags = [
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="fc:frame:image:aspect_ratio" content="1:1" />`,
    `<meta property="og:image" content="${imageUrl || defaultFrameImage}" />`,
    `<meta property="og:title" content="Gmeowbased - NFT Collection" />`,
    `<meta property="og:description" content="NFT collection for ${shortenAddress(userAddress)}" />`,
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
  <title>Gmeowbased - NFT Collection</title>
  ${metaTags.join('\n  ')}
</head>
<body>
  <h1>🖼️ NFT Collection</h1>
  <p><strong>User:</strong> ${shortenAddress(userAddress)}</p>
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
