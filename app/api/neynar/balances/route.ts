export const runtime = 'edge'

import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const fid = searchParams.get('fid')
    const networks = (searchParams.get('networks') || 'base').trim()

    if (!fid) return NextResponse.json({ ok: false, reason: 'missing-fid' }, { status: 400 })

    const key = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY
    if (!key) return NextResponse.json({ ok: false, reason: 'server-api-key-missing' }, { status: 500 })

    const url = new URL('https://api.neynar.com/v2/farcaster/user/balance/')
    url.searchParams.set('fid', fid)
    url.searchParams.set('networks', networks)

    const res = await fetch(url.toString(), { method: 'GET', headers: { 'x-api-key': key, Accept: 'application/json' } })
    const text = await res.text()
    let json: any = null
    try { json = JSON.parse(text) } catch { json = { raw: text } }

    if (!res.ok) return NextResponse.json({ ok: false, status: res.status, data: json }, { status: res.status })
    return NextResponse.json({ ok: true, data: json }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: String(e?.message || e) }, { status: 500 })
  }
}