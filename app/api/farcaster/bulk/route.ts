import { NextRequest } from 'next/server'
import { fetchUsersByAddresses } from '@/lib/neynar'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { addresses } = (await req.json()) as { addresses?: string[] }
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    // Hard cap to avoid abuse; client can send again if needed
    const unique = Array.from(new Set(addresses.map(a => String(a || '').toLowerCase()))).slice(0, 300)

    const result = await fetchUsersByAddresses(unique)
    return new Response(JSON.stringify(result || {}), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (e: any) {
    console.error('/api/farcaster/bulk failed:', e?.message || String(e))
    return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
}