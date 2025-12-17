/**
 * @file lib/utils/performance.ts
 * @description Performance Monitoring & Core Web Vitals Tracking
 * 
 * PHASE: Phase 6.2 - Utils Category Consolidation (December 17, 2025)
 * CONSOLIDATED FROM:
 *   - performance-monitor.ts (Performance API wrappers, custom metrics)
 *   - web-vitals.ts (Core Web Vitals: LCP, FID, CLS, FCP, TTFB, INP)
 * 
 * FEATURES:
 *   - Track component render times and long tasks
 *   - Monitor Core Web Vitals (LCP, FID, CLS, FCP, TTFB, INP)
 *   - Report to analytics (PostHog, Google Analytics)
 *   - Performance marks and measurements
 *   - Resource loading tracking
 *   - React hooks for component-level monitoring
 * 
 * REFERENCE DOCUMENTATION:
 *   - LIB-REFACTOR-PLAN.md (Phase 6.2)
 *   - Web Vitals: https://web.dev/vitals/
 *   - Performance API: https://developer.mozilla.org/en-US/docs/Web/API/Performance
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - Network: Base blockchain
 *   - NO EMOJIS in production code
 *   - NO HARDCODED COLORS
 *   - PostHog analytics integration
 * 
 * TODO:
 *   - [ ] Add custom metric types for DeFi operations
 *   - [ ] Integrate with Vercel Analytics
 *   - [ ] Add performance budgets and alerts
 *   - [ ] Monitor wallet connection times
 * 
 * CRITICAL:
 *   - Browser-only code (check typeof window !== 'undefined')
 *   - Handle missing PerformanceObserver gracefully
 *   - Avoid blocking main thread with measurements
 * 
 * SUGGESTIONS:
 *   - Consider adding Web3-specific metrics (transaction times)
 *   - Add frame rendering performance for animation-heavy UI
 *   - Track NFT image loading times
 * 
 * AVOID:
 *   - Excessive performance measurements (causes overhead)
 *   - Blocking the main thread with measurements
 *   - Sending too many metrics (batch them)
 */

import { useEffect, useRef } from 'react'
import type { Metric } from 'web-vitals'
import { trackError } from '@/lib/notifications/error-tracking'

// Type declarations for global window properties
declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties: Record<string, unknown>) => void
    }
    gtag?: (
      command: string,
      event: string,
      params: Record<string, unknown>
    ) => void
  }
}

// ========================================
// Core Web Vitals Types & Thresholds
// ========================================

interface WebVitalsMetric extends Metric {
  label: 'web-vital'
}

// Thresholds for Core Web Vitals (Google's recommended values)
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },      // Largest Contentful Paint
  FID: { good: 100, poor: 300 },        // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },       // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 },      // First Contentful Paint
  TTFB: { good: 800, poor: 1800 },      // Time to First Byte
  INP: { good: 200, poor: 500 },        // Interaction to Next Paint
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

// ========================================
// Performance Monitor Class
// ========================================

/**
 * Performance marks for custom measurements
 */
export class PerformanceMonitor {
  private static marks = new Map<string, number>()

  /**
   * Start a performance measurement
   */
  static mark(name: string) {
    if (typeof window === 'undefined') return
    
    this.marks.set(name, performance.now())
    performance.mark(name)
  }

  /**
   * End a performance measurement and report
   */
  static measure(name: string, startMark: string, endMark?: string) {
    if (typeof window === 'undefined') return

    try {
      const measureName = `${name}-measure`
      
      if (endMark) {
        performance.measure(measureName, startMark, endMark)
      } else {
        performance.measure(measureName, startMark)
      }

      const measure = performance.getEntriesByName(measureName)[0]
      if (measure) {
        this.reportMetric({
          name,
          value: measure.duration,
          type: 'custom',
        })
      }

      // Clean up
      performance.clearMarks(startMark)
      if (endMark) performance.clearMarks(endMark)
      performance.clearMeasures(measureName)
    } catch (error) {
      console.error('[Performance] Measure error:', error)
    }
  }

  /**
   * Report a custom performance metric
   */
  static reportMetric(metric: {
    name: string
    value: number
    type: 'custom' | 'render' | 'resource'
    metadata?: Record<string, unknown>
  }) {
    const { name, value, type, metadata = {} } = metric

    // Send to analytics
    try {
      if (typeof window !== 'undefined' && window.posthog) {
        window.posthog.capture('performance_metric', {
          metric_name: name,
          metric_value: Math.round(value),
          metric_type: type,
          ...metadata,
        })
      }
    } catch (error) {
      console.error('[Performance] Error reporting metric:', error)
    }
  }

  /**
   * Monitor long tasks (blocking the main thread for >50ms)
   */
  static observeLongTasks() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.reportMetric({
            name: 'long_task',
            value: entry.duration,
            type: 'custom',
            metadata: {
              entry_type: entry.entryType,
              start_time: entry.startTime,
            },
          })
        }
      })

      observer.observe({ entryTypes: ['longtask'] })
    } catch (error) {
      console.error('[Performance] Long task observer error:', error)
    }
  }

  /**
   * Monitor resource loading
   */
  static observeResources() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resource = entry as PerformanceResourceTiming
          
          // Only report slow resources (>1s)
          if (resource.duration > 1000) {
            this.reportMetric({
              name: 'slow_resource',
              value: resource.duration,
              type: 'resource',
              metadata: {
                url: resource.name,
                initiator_type: resource.initiatorType,
                transfer_size: resource.transferSize,
              },
            })
          }
        }
      })

      observer.observe({ entryTypes: ['resource'] })
    } catch (error) {
      console.error('[Performance] Resource observer error:', error)
    }
  }
}

// ========================================
// React Hooks for Performance Monitoring
// ========================================

/**
 * Hook to measure component render time
 * 
 * @example
 * function MyComponent() {
 *   useRenderTime('MyComponent')
 *   return <div>...</div>
 * }
 */
export function useRenderTime(componentName: string) {
  const renderCount = useRef(0)

  useEffect(() => {
    renderCount.current++
    const markName = `${componentName}-render-${renderCount.current}`
    
    PerformanceMonitor.mark(`${markName}-start`)
    
    return () => {
      PerformanceMonitor.mark(`${markName}-end`)
      PerformanceMonitor.measure(
        componentName,
        `${markName}-start`,
        `${markName}-end`
      )
    }
  })
}

/**
 * Hook to measure specific operation time
 * 
 * @example
 * const [startMeasure, endMeasure] = useMeasure('data-fetch')
 * 
 * async function loadData() {
 *   startMeasure()
 *   await fetch('/api/data')
 *   endMeasure()
 * }
 */
export function useMeasure(operationName: string): [() => void, () => void] {
  const startMark = useRef<string | null>(null)

  const start = () => {
    const mark = `${operationName}-${Date.now()}`
    startMark.current = mark
    PerformanceMonitor.mark(mark)
  }

  const end = () => {
    if (startMark.current) {
      const endMark = `${startMark.current}-end`
      PerformanceMonitor.mark(endMark)
      PerformanceMonitor.measure(operationName, startMark.current, endMark)
      startMark.current = null
    }
  }

  return [start, end]
}

// ========================================
// Core Web Vitals Tracking
// ========================================

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
    trackError('web_vitals_send_metric_error', error, { function: 'sendToAnalytics', metric: metric.name })
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this in _app.tsx or layout.tsx
 * 
 * @example
 * // In _app.tsx
 * useEffect(() => {
 *   initWebVitals()
 * }, [])
 */
export async function initWebVitals() {
  if (typeof window === 'undefined') return

  try {
    const { onCLS, onLCP, onFCP, onTTFB, onINP } = await import('web-vitals')

    onCLS(sendToAnalytics)
    // onFID is deprecated in web-vitals v4+ (use onINP instead)
    onLCP(sendToAnalytics)
    onFCP(sendToAnalytics)
    onTTFB(sendToAnalytics)
    onINP(sendToAnalytics)

    // Also start monitoring long tasks and resources
    PerformanceMonitor.observeLongTasks()
    PerformanceMonitor.observeResources()
  } catch (error) {
    trackError('web_vitals_init_error', error, { function: 'initWebVitals' })
  }
}

/**
 * Report current Web Vitals (for SPA navigation)
 * Call this on route changes
 */
export async function reportWebVitals() {
  if (typeof window === 'undefined') return

  try {
    const { onCLS, onLCP, onFCP, onTTFB, onINP } = await import('web-vitals')

    onCLS(sendToAnalytics, { reportAllChanges: true })
    // onFID is deprecated in web-vitals v4+ (use onINP instead)
    onLCP(sendToAnalytics, { reportAllChanges: true })
    onFCP(sendToAnalytics, { reportAllChanges: true })
    onTTFB(sendToAnalytics, { reportAllChanges: true })
    onINP(sendToAnalytics, { reportAllChanges: true })
  } catch (error) {
    trackError('web_vitals_report_error', error, { function: 'reportWebVitals' })
  }
}

/**
 * Initialize performance monitoring (lightweight version)
 * Starts observing long tasks and resource timing without full Web Vitals
 * 
 * @deprecated Use initWebVitals() instead - it includes this functionality
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return

  PerformanceMonitor.observeLongTasks()
  PerformanceMonitor.observeResources()
}
