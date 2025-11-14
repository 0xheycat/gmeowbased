'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DashboardTelemetryPayload } from '@/lib/telemetry'
import { readStorageCache, writeStorageCache } from '@/lib/utils'

const CACHE_KEY = 'gmeowDashboardTelemetry_v1'
const CACHE_TTL_MS = 60_000
const AUTO_REFRESH_MS = 60_000

type TelemetryHookOptions = {
  autoRefresh?: boolean
}

type DashboardTelemetryState = {
  data: DashboardTelemetryPayload | null
  loading: boolean
  error: string | null
  stale: boolean
  lastUpdated: number | null
  refresh: () => Promise<void>
}

export function useDashboardTelemetry(options: TelemetryHookOptions = {}): DashboardTelemetryState {
  const { autoRefresh = true } = options
  const mountedRef = useRef(true)
  const cached = typeof window !== 'undefined'
    ? readStorageCache<DashboardTelemetryPayload>(CACHE_KEY, CACHE_TTL_MS)
    : null

  const [data, setData] = useState<DashboardTelemetryPayload | null>(cached)
  const [loading, setLoading] = useState<boolean>(!cached)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchTelemetry = useCallback(async (opts: { silent?: boolean } = {}) => {
    const { silent = false } = opts
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const res = await fetch('/api/dashboard/telemetry', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as DashboardTelemetryPayload
      if (!mountedRef.current) return
      setData(json)
      writeStorageCache(CACHE_KEY, json)
      setError(null)
    } catch (err) {
      if (!mountedRef.current) return
      const message = (err as Error)?.message ?? 'Unable to fetch telemetry'
      setError(message)
    } finally {
      if (!mountedRef.current) return
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const isStale = (() => {
      if (!data?.updatedAt) return true
      const updated = Date.parse(data.updatedAt)
      if (!Number.isFinite(updated)) return true
      return Date.now() - updated > CACHE_TTL_MS
    })()
    if (!data || isStale) {
      void fetchTelemetry({ silent: Boolean(data) })
    } else {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const id = window.setInterval(() => {
      void fetchTelemetry({ silent: true })
    }, AUTO_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [autoRefresh, fetchTelemetry])

  const stale = useMemo(() => {
    if (!data?.updatedAt) return true
    const updated = Date.parse(data.updatedAt)
    if (!Number.isFinite(updated)) return true
    return Date.now() - updated > CACHE_TTL_MS
  }, [data])

  const lastUpdated = useMemo(() => {
    if (!data?.updatedAt) return null
    const parsed = Date.parse(data.updatedAt)
    return Number.isFinite(parsed) ? parsed : null
  }, [data])

  const refresh = useCallback(async () => {
    await fetchTelemetry({ silent: false })
  }, [fetchTelemetry])

  return {
    data,
    loading,
    error,
    stale,
    lastUpdated,
    refresh,
  }
}
