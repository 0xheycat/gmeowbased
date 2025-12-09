// app/api/frame/identify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { FIDSchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/error-handler'
import { generateRequestId } from '@/lib/request-id'

export const runtime = 'nodejs'
export const revalidate = 0

type IdentifyResponse = {
  ok: boolean
  identity?: {
    username: string | null
    displayName: string | null
    fid: number | null
    walletAddress: string | null
    custodyAddress: string | null
    powerBadge: boolean
  }
  error?: string
}

/**
 * Miniapp identity resolution endpoint
 * Called by components/intro/gmeowintro.tsx to identify the current user
 * 
 * In miniapp context, identity comes from:
 * 1. @farcaster/miniapp-sdk context
 * 2. Farcaster headers (x-farcaster-fid, etc)
 * 3. Session cookies
 */
export const GET = withErrorHandler(async (req: NextRequest): Promise<NextResponse<IdentifyResponse>> => {
  const requestId = generateRequestId()
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return NextResponse.json(
      { ok: false, error: 'Rate limit exceeded' },
      { status: 429, headers: { 'X-Request-ID': requestId } }
    )
  }

  // Check for Farcaster context headers (sent by miniapp iframe)
  const farcasterFid = req.headers.get('x-farcaster-fid')
    const farcasterUser = req.headers.get('x-farcaster-username')
    
    // Check URL params (fallback)
    const { searchParams } = new URL(req.url)
    const fidParam = searchParams.get('fid')
    const usernameParam = searchParams.get('username')
    
    const fid = farcasterFid ? Number(farcasterFid) : fidParam ? Number(fidParam) : null
    const username = farcasterUser || usernameParam
    
    // If we have FID, fetch full profile from Neynar
    if (fid && Number.isFinite(fid) && fid > 0) {
      // Validate FID
      const fidValidation = FIDSchema.safeParse(fid)
      if (!fidValidation.success) {
        return NextResponse.json({
          ok: false,
          error: 'Invalid FID format'
        }, { status: 400, headers: { 'X-Request-ID': requestId } })
      }
      
      try {
        const neynarApiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY || ''
        if (neynarApiKey) {
          const neynarUrl = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`
          const neynarRes = await fetch(neynarUrl, {
            headers: {
              'accept': 'application/json',
              'x-api-key': neynarApiKey,
            },
          })
          
          if (neynarRes.ok) {
            const data = await neynarRes.json()
            const user = data?.users?.[0]
            
            if (user) {
              const verifications = Array.isArray(user.verifications) ? user.verifications : []
              const custodyAddress = user.custody_address || user.custodyAddress || null
              const walletAddress = verifications.length > 0 ? verifications[0] : custodyAddress
              
              return NextResponse.json({
                ok: true,
                identity: {
                  username: user.username || null,
                  displayName: user.display_name || user.displayName || null,
                  fid: user.fid || fid,
                  walletAddress,
                  custodyAddress,
                  powerBadge: user.power_badge || user.powerBadge || false,
                },
              }, {
                headers: {
                  'access-control-allow-origin': '*',
                  'access-control-allow-methods': 'GET, OPTIONS',
                  'cache-control': 'public, max-age=60',
                  'X-Request-ID': requestId,
                },
              })
            }
          }
        }
      } catch (error) {
        console.warn('[identify] Neynar fetch failed:', error)
        // Continue to fallback below
      }
    }
    
    // Fallback: return minimal identity if we have username or fid
    if (username || (fid && Number.isFinite(fid))) {
      return NextResponse.json({
        ok: true,
        identity: {
          username: username || null,
          displayName: null,
          fid: fid && Number.isFinite(fid) && fid > 0 ? fid : null,
          walletAddress: null,
          custodyAddress: null,
          powerBadge: false,
        },
      }, {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, OPTIONS',
          'cache-control': 'public, max-age=30',
          'X-Request-ID': requestId,
        },
      })
    }
    
    // No identity available
    return NextResponse.json({
      ok: false,
      error: 'No identity context available',
    }, {
      status: 200, // Still 200, just no identity
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, OPTIONS',
        'cache-control': 'no-store',
        'X-Request-ID': requestId,
      },
    })
})

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Authorization, X-Requested-With, X-Farcaster-Fid, X-Farcaster-Username',
      'access-control-max-age': '86400',
    },
  })
}
