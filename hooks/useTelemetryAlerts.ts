import { useEffect, useRef } from 'react'
import type { TelemetryAlert } from '@/lib/telemetry'


type TelemetryAlertTone = 'success' | 'info' | 'warn'

type TelemetryAlertOptions = {
  /**
   * Maximum number of alert identifiers to persist in the session.
   * Prevents unbounded growth if telemetry returns long histories.
   */
  seenCacheLimit?: number
  /**
   * Optional guard to disable notifications (useful for tests).
   */
  enabled?: boolean
}

const DEFAULT_OPTIONS: Required<Omit<TelemetryAlertOptions, 'enabled'>> = {
  seenCacheLimit: 48,
}

function deriveTone(label: string): TelemetryAlertTone {
  const normalized = label.toLowerCase()
  if (normalized.includes('guild')) return 'warn'
  if (normalized.includes('tip') || normalized.includes('badge')) return 'success'
  return 'info'
}

export function useTelemetryAlertNotifications(
  alerts: TelemetryAlert[] | null | undefined,
  options: TelemetryAlertOptions = {},
) {
  
  const seenRef = useRef<Set<string>>(new Set())
  const { seenCacheLimit } = { ...DEFAULT_OPTIONS, ...options }
  const enabled = options.enabled ?? true

  useEffect(() => {
    if (!enabled) return
    if (!alerts?.length) return
    const seen = seenRef.current
    const freshAlerts = alerts.filter((alert) => {
      const id = typeof alert?.id === 'string' ? alert.id.trim() : ''
      if (!id) return false
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    if (!freshAlerts.length) return

    for (const alert of freshAlerts) {
      const tone = deriveTone(alert.label)
      // Notification removed
    }

    if (seen.size > seenCacheLimit) {
      const entries = Array.from(seen)
      const trimmed = new Set(entries.slice(entries.length - seenCacheLimit))
      seenRef.current = trimmed
    }
  }, [alerts, enabled, notify, seenCacheLimit])
}
