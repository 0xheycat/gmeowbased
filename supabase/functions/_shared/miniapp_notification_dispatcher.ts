/* eslint-disable no-console */
// Shared Miniapp Notification dispatcher logic used by multiple Edge Functions.

// @ts-ignore - npm specifier is resolved at deploy time in Supabase Edge
import { createClient } from "npm:@supabase/supabase-js@2.33.1"
// @ts-ignore - npm specifier is resolved at deploy time in Supabase Edge
import { Configuration, NeynarAPIClient } from "npm:@neynar/nodejs-sdk@3.84.0"

declare const Deno: {
  env: { get(key: string): string | undefined }
}

type MiniappHandler = (req: Request) => Response | Promise<Response>

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CRON_SECRET =
  Deno.env.get('MINIAPP_NOTIFICATION_DISPATCH_SECRET') ??
  Deno.env.get('CRON_SECRET') ??
  ''
const NEYNAR_API_KEY = Deno.env.get('NEYNAR_API_KEY') ?? ''
const MAX_BATCH_SIZE = 50
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 400

const AUTHORIZED_SECRETS = [SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET].filter(
  (value): value is string => Boolean(value && value.trim()),
)

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

if (!NEYNAR_API_KEY) {
  console.error('Missing NEYNAR_API_KEY environment variable')
}

if (!AUTHORIZED_SECRETS.length) {
  console.error('Missing request authentication secret for miniapp dispatch function')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const neynarClient = new NeynarAPIClient(new Configuration({ apiKey: NEYNAR_API_KEY }))

type NotificationPayload = {
  title?: string
  body?: string
  target_url?: string
  uuid?: string
  data?: Record<string, unknown>
}

type DispatchFilter = {
  status?: string
  fid?: number
}

type DispatchRequest = {
  ids?: string[]
  filter?: DispatchFilter
  notification: NotificationPayload
}

type TokenRow = {
  id: string
  fid: number
  token: string
  notification_url: string
  status: string
}

type DispatchResult = {
  id: string
  fid: number
  status: 'sent' | 'failed'
  error?: string
  attemptCount: number
}

function chunkArray<T>(input: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < input.length; i += size) {
    chunks.push(input.slice(i, i + size))
  }
  return chunks
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function executeDispatch(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    let incomingToken = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!incomingToken) {
      const alternateHeaders = ['x-cron-secret', 'x-api-key', 'apikey']
      for (const header of alternateHeaders) {
        const headerValue = req.headers.get(header)
        if (headerValue) {
          incomingToken = headerValue.trim()
          break
        }
      }
    }

    if (!incomingToken || !AUTHORIZED_SECRETS.includes(incomingToken)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let payload: DispatchRequest
    try {
      payload = (await req.json()) as DispatchRequest
    } catch (error) {
      console.error('Invalid JSON payload', error)
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!payload?.notification) {
      return new Response(JSON.stringify({ error: 'Missing notification payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let query = supabase.from('miniapp_notification_tokens').select('*')

    if (payload.ids?.length) {
      query = query.in('id', payload.ids)
    } else {
      if (payload.filter?.status) query = query.eq('status', payload.filter.status)
      if (payload.filter?.fid) query = query.eq('fid', payload.filter.fid)
    }

    const { data: tokens, error: tokenError } = await query
    if (tokenError) {
      console.error('Token query failed', tokenError)
      return new Response(JSON.stringify({ error: 'Database query failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const tokenRows = (tokens ?? []) as TokenRow[]
    if (!tokenRows.length) {
      return new Response(JSON.stringify({ ok: true, count: 0, results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const tokensByFid = new Map<number, TokenRow[]>()
    for (const row of tokenRows) {
      const fid = Number(row.fid)
      if (!Number.isFinite(fid) || fid <= 0) continue
      if (!tokensByFid.has(fid)) tokensByFid.set(fid, [])
      tokensByFid.get(fid)!.push(row)
    }

    const uniqueFids = Array.from(tokensByFid.keys())
    const fidChunks = chunkArray(uniqueFids, MAX_BATCH_SIZE)

    const results: DispatchResult[] = []

    for (const chunk of fidChunks) {
      let attempt = 0
      let sent = false
      let lastError: unknown = null

      while (attempt < MAX_RETRIES && !sent) {
        attempt += 1
        try {
          const uuid = payload.notification.uuid ?? crypto.randomUUID()
          await neynarClient.publishFrameNotifications({
            target_fids: chunk,
            notification: {
              title: payload.notification.title ?? 'Gmeow notification',
              body: payload.notification.body ?? '',
              target_url: payload.notification.target_url,
              uuid,
            },
          })
          sent = true
          for (const fid of chunk) {
            const rows = tokensByFid.get(fid) ?? []
            for (const row of rows) {
              results.push({ id: row.id, fid, status: 'sent', attemptCount: attempt })
            }
          }
        } catch (error) {
          lastError = error
          console.error('Neynar dispatch failed (attempt %d)', attempt, error)
          if (attempt < MAX_RETRIES) await delay(RETRY_DELAY_MS * attempt)
        }
      }

      if (!sent) {
        for (const fid of chunk) {
          const rows = tokensByFid.get(fid) ?? []
          for (const row of rows) {
            results.push({
              id: row.id,
              fid,
              status: 'failed',
              error: lastError ? String(lastError) : 'Unknown error',
              attemptCount: MAX_RETRIES,
            })
          }
        }
      }
    }

    const targetedIds = tokenRows.map((row) => row.id)
    const eventMetadata = {
      last_event: payload.notification.title ?? 'notification',
      last_event_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      last_gm_context: payload.notification.data ?? null,
    }

    const { error: updateError } = await supabase
      .from('miniapp_notification_tokens')
      .update(eventMetadata)
      .in('id', targetedIds)

    if (updateError) {
      console.error('Failed to update token metadata', updateError)
    }

    try {
      await supabase.from('miniapp_notification_dispatches').insert({
        notification_title: payload.notification.title ?? null,
        notification_body: payload.notification.body ?? null,
        target_count: targetedIds.length,
        payload,
        results,
      })
    } catch (error) {
      console.warn('Dispatch log insert failed (table may be missing)', error)
    }

    return new Response(
      JSON.stringify({ ok: true, count: results.length, results }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Unhandled error', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const handleMiniappNotificationRequest: MiniappHandler = executeDispatch
