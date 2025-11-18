import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { withErrorHandler } from '@/lib/error-handler'

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json()
  const { password } = body

  if (password !== process.env.MAINTENANCE_PASSWORD) {
    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    )
  }

  const cookieStore = await cookies()
  cookieStore.set('maintenance_auth', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return NextResponse.json({ success: true })
})