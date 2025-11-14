import { NextResponse } from 'next/server'

const COOKIE_NAME = 'm_auth'
const TOKEN = process.env.MAINTENANCE_TOKEN || 'Gmeow'
const PASSWORD = process.env.MAINTENANCE_PASSWORD || '%^UpgR@deM3ow!$#'

export async function POST(req: Request) {
  try {
    const { password } = (await req.json().catch(() => ({}))) as { password?: string }
    if (!password || password !== PASSWORD) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, TOKEN, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24h
    })
    return res
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 })
  }
}