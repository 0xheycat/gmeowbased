import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { MaintenanceAuthSchema } from '@/lib/validation/api-schemas'
import { withErrorHandler } from '@/lib/error-handler'

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json()
  
  // Validate input with Zod
  const validation = MaintenanceAuthSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validation.error.issues },
      { status: 400 }
    )
  }
  
  const { password } = validation.data

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