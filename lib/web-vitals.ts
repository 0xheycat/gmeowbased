/**
 * Web Vitals Tracking
 * 
 * Tracks Core Web Vitals metrics:
 * - LCP (Largest Contentful Paint): Loading performance
 * - FID (First Input Delay): Interactivity
 * - CLS (Cumulative Layout Shift): Visual stability
 * - FCP (First Contentful Paint): Initial render
 * - TTFB (Time to First Byte): Server response
 * - INP (Interaction to Next Paint): Responsiveness
 */

import type { Metric } from 'web-vitals'

interface WebVitalsMetric extends Metric {
  label: 'web-vital'
}

// Thresholds for Core Web Vitals (Google's recommended values)
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
} as const

type MetricName = keyof typeof THRESHOLDS

/**
 * Get metric rating (good, needs-improvement, poor)
 */
function getMetricRating(name: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name]
  if (!threshold) return 'good'
  
  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

/**
 * Send metric to analytics
 */
function sendToAnalytics(metric: Metric) {
  const webVitalMetric: WebVitalsMetric = { ...metric, label: 'web-vital' }
  const { name, value, id, navigationType } = webVitalMetric
  const rating = getMetricRating(name as MetricName, value)

  // Send to analytics services
  try {
    // Posthog
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('web_vitals', {
        metric_name: name,
        metric_value: Math.round(value),
        metric_rating: rating,
        metric_id: id,
        navigation_type: navigationType,
      })
    }

    // Google Analytics (gtag)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', name, {
        event_category: 'Web Vitals',
        event_label: id,
        value: Math.round(value),
        metric_rating: rating,
        non_interaction: true,
      })
    }

    // Custom endpoint (optional)
    if (process.env.NEXT_PUBLIC_VITALS_ENDPOINT) {
      navigator.sendBeacon?.(
        process.env.NEXT_PUBLIC_VITALS_ENDPOINT,
        JSON.stringify({
          name,
          value,
          rating,
          id,
          navigationType,
          timestamp: Date.now(),
        })
      )
    }
  } catch (error) {
    console.error('[Web Vitals] Error sending metric:', error)
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this in _app.tsx or layout.tsx
 */
export async function initWebVitals() {
  if (typeof window === 'undefined') return

  try {
    const { onLCP, onCLS, onFCP, onTTFB, onINP } = await import('web-vitals')

    onLCP(sendToAnalytics)
    onCLS(sendToAnalytics)
    onFCP(sendToAnalytics)
    onTTFB(sendToAnalytics)
    onINP(sendToAnalytics) // INP replaces FID in web-vitals v3+
  } catch (error) {
    console.error('[Web Vitals] Failed to initialize:', error)
  }
}

/**
 * Report Web Vitals to Next.js (for use in _app.tsx)
 * 
 * Usage:
 * ```tsx
 * export function reportWebVitals(metric: NextWebVitalsMetric) {
 *   reportWebVitalsToAnalytics(metric)
 * }
 * ```
 */
export function reportWebVitalsToAnalytics(metric: Metric) {
  sendToAnalytics({ ...metric, label: 'web-vital' } as any)
}

// TypeScript augmentation for global analytics
declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void
    }
    gtag?: (
      command: string,
      eventName: string,
      params?: Record<string, unknown>
    ) => void
  }
}
