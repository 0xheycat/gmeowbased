import { NextResponse } from 'next/server'
import { getTipMentionSummary } from '@/lib/tips-scoreboard'

export const runtime = 'nodejs'

export async function GET() {
  const summary = getTipMentionSummary()
  return NextResponse.json({ ok: true, summary })
}
