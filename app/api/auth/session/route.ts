import { NextRequest, NextResponse } from 'next/server'
import { createSessionWithCookie, clearSessionCookie, getSession } from '@/lib/auth/session'
import { getFarcasterFid } from '@/lib/auth/farcaster'
import { fetchUserByFid } from '@/lib/neynar'
import { getSupabaseServerClient } from '@/lib/supabase-server'

/**
 * Session Management API
 * 
 * POST /api/auth/session - Create session from Farcaster auth
 * GET /api/auth/session - Get current session
 * DELETE /api/auth/session - Logout (destroy session)
 * 
 * Source: New implementation with old foundation patterns
 * MCP Verified: January 12, 2025
 * Quality Gates: GI-7, GI-8, GI-11
 */

/**
 * Create new session
 * POST /api/auth/session
 */
export async function POST(request: NextRequest) {
  try {
    // Get FID from Farcaster context or headers
    const fid = await getFarcasterFid(request)

    if (!fid) {
      return NextResponse.json(
        { error: 'No Farcaster identity found' },
        { status: 401 }
      )
    }

    // Fetch user data from Neynar
    const user = await fetchUserByFid(fid)

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      )
    }

    // Ensure user profile exists in database
    const supabase = getSupabaseServerClient()
    if (supabase) {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('fid')
        .eq('fid', fid)
        .single()

      // Create profile if doesn't exist (will be handled by profile auto-creation)
      if (!existingProfile) {
        // Profile will be created by /api/auth/profile endpoint
        console.log(`Profile doesn't exist for FID ${fid}, will be created on first profile fetch`)
      }
    }

    // Create session
    const response = NextResponse.json({
      success: true,
      user: {
        fid,
        username: user.username,
        displayName: user.displayName,
        pfpUrl: user.pfpUrl
      }
    })

    await createSessionWithCookie(response, {
      fid,
      username: user.username,
      address: user.verifications?.[0] // Primary verified address
    })

    return response
  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get current session
 * GET /api/auth/session
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)

    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        fid: session.fid,
        username: session.username,
        address: session.address
      }
    })
  } catch (error) {
    console.error('Session fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Logout (destroy session)
 * DELETE /api/auth/session
 */
export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    clearSessionCookie(response)

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
