'use client'

// @edit-start 2025-02-14 — Community event stream hook
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { CommunityEventSummary, CommunityEventType } from '@/lib/community-event-types'

const DEFAULT_POLL_MS = Number(process.env.NEXT_PUBLIC_AGENT_EVENTS_POLL_MS ?? 7000)
const DEFAULT_INITIAL_LIMIT = Number(process.env.NEXT_PUBLIC_AGENT_EVENTS_INITIAL_LIMIT ?? 40)
const DEFAULT_DELTA_LIMIT = Number(process.env.NEXT_PUBLIC_AGENT_EVENTS_DELTA_LIMIT ?? 12)

export type UseCommunityEventStreamOptions = {
  types?: CommunityEventType[]
  pollMs?: number
  initialLimit?: number
  deltaLimit?: number
}

export type UseCommunityEventStreamResult = {
  events: CommunityEventSummary[]
  status: 'idle' | 'loading' | 'success' | 'error'
  error: string | null
  isInitialLoading: boolean
  refresh: () => Promise<void>
  lastUpdated: string | null
}

function dedupeEvents(events: CommunityEventSummary[]): CommunityEventSummary[] {
  const map = new Map<string, CommunityEventSummary>()
  for (const event of events) {
    map.set(event.id, event)
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

async function fetchEventsFromApi(params: URLSearchParams): Promise<{
  ok: boolean
  events: CommunityEventSummary[]
  fetchedAt: string | null
  nextCursor: string | null
  error?: string | null
}> {
  const response = await fetch(`/api/agent/events?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await response.text()
    return { ok: false, events: [], fetchedAt: null, nextCursor: null, error: message || response.statusText }
  }

  const payload = await response.json()
  if (!payload?.ok || !Array.isArray(payload?.events)) {
    return {
      ok: false,
      events: [],
      fetchedAt: payload?.fetchedAt ?? null,
      nextCursor: payload?.nextCursor ?? null,
      error: payload?.error ?? 'invalid-response',
    }
  }

  return {
    ok: true,
    events: payload.events as CommunityEventSummary[],
    fetchedAt: payload.fetchedAt ?? null,
    nextCursor: payload.nextCursor ?? null,
  }
}

export function useCommunityEventStream(options: UseCommunityEventStreamOptions = {}): UseCommunityEventStreamResult {
  const pollMs = Number.isFinite(options.pollMs) && (options.pollMs as number) > 0 ? (options.pollMs as number) : DEFAULT_POLL_MS
  const initialLimit = Number.isFinite(options.initialLimit) && (options.initialLimit as number) > 0
    ? Math.floor(options.initialLimit as number)
    : DEFAULT_INITIAL_LIMIT
  const deltaLimit = Number.isFinite(options.deltaLimit) && (options.deltaLimit as number) > 0
    ? Math.floor(options.deltaLimit as number)
    : DEFAULT_DELTA_LIMIT

  const [events, setEvents] = useState<CommunityEventSummary[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const cursorRef = useRef<string | null>(null)
  const initializedRef = useRef(false)
  const activeRequestRef = useRef<Promise<void> | null>(null)

  const refresh = useCallback(async () => {
    if (activeRequestRef.current) {
      await activeRequestRef.current
      return
    }

    if (status === 'idle') {
      setStatus('loading')
    }

    const fetchPromise = (async () => {
      try {
        const params = new URLSearchParams()
        const isDeltaMode = initializedRef.current && cursorRef.current
        const limit = isDeltaMode ? deltaLimit : initialLimit
        params.set('limit', String(limit))
        if (isDeltaMode && cursorRef.current) {
          params.set('since', cursorRef.current)
        }
        if (options.types?.length) {
          params.set('types', options.types.join(','))
        }

        const result = await fetchEventsFromApi(params)
        if (!result.ok) {
          setError(result.error ?? 'Failed to fetch events')
          setStatus((prev) => (prev === 'loading' ? 'error' : prev))
          return
        }

        setError(null)
        setStatus('success')
        setLastUpdated(result.fetchedAt ?? new Date().toISOString())

        if (result.events.length) {
          setEvents((prev) => {
            const merged = dedupeEvents([...result.events, ...(isDeltaMode ? prev : [])])
            return merged
          })
          cursorRef.current = result.events[0]?.cursor ?? result.nextCursor ?? cursorRef.current
        } else if (!initializedRef.current) {
          setEvents([])
          cursorRef.current = result.nextCursor ?? cursorRef.current
        }

        initializedRef.current = true
      } catch (err) {
        const message = (err as Error)?.message ?? 'Failed to load events'
        setError(message)
        setStatus((prev) => (prev === 'loading' ? 'error' : prev))
      }
    })()

    activeRequestRef.current = fetchPromise
    await fetchPromise
    activeRequestRef.current = null
  }, [cursorRef, deltaLimit, initialLimit, options.types, status])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (pollMs <= 0) return
    const id = setInterval(() => {
      refresh().catch(() => {
        /* errors handled internally */
      })
    }, pollMs)
    return () => clearInterval(id)
  }, [pollMs, refresh])

  const isInitialLoading = useMemo(() => status === 'loading' && !initializedRef.current, [status])

  return {
    events,
    status,
    error,
    isInitialLoading,
    refresh,
    lastUpdated,
  }
}
// @edit-end
