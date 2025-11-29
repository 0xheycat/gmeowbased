import { NextRequest, NextResponse } from 'next/server'
import {
  issueUserSession,
  buildUserSessionCookie,
  isUserAuthEnabled,
} from '@/lib/user-auth'

/**
 * POST /api/auth/signin
 * 
 * Create a new user session
 * Body: { fid: number, username?: string, address?: string, remember?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    if (!isUserAuthEnabled()) {
      return NextResponse.json(
        { success: false, error: 'User authentication not enabled' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { fid, username, address, remember = false } = body

    if (!fid || typeof fid !== 'number' || fid <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid FID is required' },
        { status: 400 }
      )
    }

    // Issue session JWT
    const { token, maxAge } = await issueUserSession({
      fid,
      username,
      address,
      remember,
    })

    // Build cookie
    const cookie = buildUserSessionCookie({ token, maxAge })

    const response = NextResponse.json({
      success: true,
      fid,
      username,
      expiresIn: maxAge,
    })

    // Set session cookie
    response.cookies.set(
      cookie.name,
      cookie.value,
      cookie.options
    )

    return response
  } catch (error) {
    console.error('Sign-in error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session',
      },
      { status: 500 }
    )
  }
}
