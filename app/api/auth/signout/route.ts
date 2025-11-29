import { NextRequest, NextResponse } from 'next/server'
import { buildUserSessionClearCookie } from '@/lib/user-auth'

/**
 * POST /api/auth/signout
 * 
 * Clear user session (sign out)
 */
export async function POST(request: NextRequest) {
  try {
    const cookie = buildUserSessionClearCookie()

    const response = NextResponse.json({
      success: true,
      message: 'Signed out successfully',
    })

    // Clear session cookie
    response.cookies.set(
      cookie.name,
      cookie.value,
      cookie.options
    )

    return response
  } catch (error) {
    console.error('Sign-out error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sign out',
      },
      { status: 500 }
    )
  }
}
