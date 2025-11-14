import { NextResponse } from 'next/server'

// Demo in-memory store; swap to DB/KV in prod
const claims = new Map<string, { at: number; metaHash: string | null }>()

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { chain, questId, address, metaHash } = body || {}
    if (!chain || questId == null || !address) {
      return NextResponse.json({ ok: false, reason: 'Missing fields' }, { status: 400 })
    }
    const key = `${chain}:${questId}:${String(address).toLowerCase()}`
    const metaHashNormalized = typeof metaHash === 'string' && metaHash.trim().length ? metaHash.trim() : null
    const prior = claims.get(key)
    if (prior) {
      if (metaHashNormalized && prior.metaHash && prior.metaHash !== metaHashNormalized) {
        return NextResponse.json({ ok: false, reason: 'Claim metadata mismatch' }, { status: 409 })
      }
      return NextResponse.json({ ok: false, reason: 'Already claimed' }, { status: 409 })
    }
    claims.set(key, { at: Date.now(), metaHash: metaHashNormalized })
    // Place to enqueue fulfillment/job
    return NextResponse.json({ ok: true, metaHash: metaHashNormalized })
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e?.message || 'Bad request' }, { status: 400 })
  }
}