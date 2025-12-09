import { NextRequest } from 'next/server'
import { rateLimit, getClientIp, apiLimiter } from '@/lib/rate-limit'
import { FIDSchema, AddressSchema } from '@/lib/validation/api-schemas'
import type { TipBroadcast } from '@/lib/tips-types'
import { subscribeToTips } from '@/lib/tips-broker'
import { generateRequestId } from '@/lib/request-id'

export const runtime = 'nodejs'

const encoder = new TextEncoder()

function formatEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

// Note: Streaming SSE response doesn't use withErrorHandler due to Response type
export async function GET(req: NextRequest) {
  const requestId = generateRequestId()
  const ip = getClientIp(req)
  const { success } = await rateLimit(ip, apiLimiter)
  
  if (!success) {
    return new Response('Rate limit exceeded', { status: 429, headers: { 'X-Request-ID': requestId } })
  }

  const { searchParams } = new URL(req.url)
  const addressRaw = searchParams.get('address') || ''
  const fidParam = searchParams.get('fid')

  // Validate query parameters
  if (!addressRaw && !fidParam) {
    return new Response('missing address or fid', { status: 400, headers: { 'X-Request-ID': requestId } })
  }

  let address: string | undefined
  let fid: number | undefined

  if (addressRaw) {
    const addressValidation = AddressSchema.safeParse(addressRaw.toLowerCase())
    if (!addressValidation.success) {
      return new Response('invalid address format', { status: 400, headers: { 'X-Request-ID': requestId } })
    }
    address = addressValidation.data
  }

  if (fidParam) {
    const fidValidation = FIDSchema.safeParse(Number(fidParam))
    if (!fidValidation.success) {
      return new Response('invalid fid format', { status: 400, headers: { 'X-Request-ID': requestId } })
    }
    fid = fidValidation.data
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
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Request-ID': requestId,
    },
  })
}
