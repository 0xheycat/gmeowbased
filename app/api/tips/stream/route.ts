import { NextRequest } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import type { TipBroadcast } from '@/lib/tips-types'
import { subscribeToTips } from '@/lib/tips-broker'

export const runtime = 'nodejs'

const encoder = new TextEncoder()

function formatEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const addressRaw = searchParams.get('address') || ''
  const address = addressRaw ? addressRaw.toLowerCase() : ''
  const fidParam = searchParams.get('fid')
  const fid = fidParam ? Number(fidParam) : undefined

  if (!address && !fid) {
    return new Response('missing address or fid', { status: 400 })
  }

  let closed = false
  let unsubscribe: (() => void) | null = null
  let keepAlive: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(formatEvent('open', { ok: true })))

      const push = (event: TipBroadcast) => {
        if (address && (event.toAddress || '').toLowerCase() !== address) return
        if (fid && event.toFid !== fid) return
        controller.enqueue(encoder.encode(formatEvent('tip', event)))
      }

      unsubscribe = subscribeToTips(push)

      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(formatEvent('ping', { ts: Date.now() })))
      }, 25_000)

      const abortHandler = () => {
        if (closed) return
        closed = true
        if (keepAlive) clearInterval(keepAlive)
        if (unsubscribe) unsubscribe()
        controller.close()
      }

      req.signal.addEventListener('abort', abortHandler)
    },
    cancel() {
      if (closed) return
      closed = true
      if (keepAlive) clearInterval(keepAlive)
      if (unsubscribe) unsubscribe()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
