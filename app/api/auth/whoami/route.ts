/**
 * Check current authenticated FID
 * GET /api/auth/whoami
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const cookieStore = await cookies()
    
    // Try to get FID from various possible cookie names
    const possibleFidCookies = [
      'fid',
      'user_fid',
      'auth_fid',
      'fc_fid',
    ]
    
    let fid: string | null = null
    for (const cookieName of possibleFidCookies) {
      const cookie = cookieStore.get(cookieName)
      if (cookie?.value) {
        fid = cookie.value
        break
      }
    }
    
    // Get all cookies for debugging
    const allCookies = Array.from(cookieStore.getAll()).map(c => ({
      name: c.name,
      value: c.value.substring(0, 20) + (c.value.length > 20 ? '...' : ''),
    }))
    
    return NextResponse.json({
      authenticated: !!fid,
      fid: fid ? parseInt(fid) : null,
      cookiesFound: allCookies.length,
      debug: {
        checkedCookies: possibleFidCookies,
        allCookies: allCookies,
      },
    })
  } catch (error) {
    console.error('[WhoAmI API] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
