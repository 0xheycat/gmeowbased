/**
 * Performance Monitoring Utilities
 * 
 * Track component render times, long tasks, and resource loading
 */

import { useEffect, useRef } from 'react'

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
    } catch {
      console.warn('[Performance] Long task observer not supported')
    }
  }

  /**
   * Monitor resource loading (CSS, JS, images)
   */
  static observeResourceTiming() {
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
                size: resource.transferSize,
                protocol: resource.nextHopProtocol,
              },
            })
          }
        }
      })

      observer.observe({ entryTypes: ['resource'] })
    } catch {
      console.warn('[Performance] Resource timing observer not supported')
    }
  }
}

/**
 * React hook to measure component render time
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   useRenderTime('MyComponent')
 *   return <div>...</div>
 * }
 * ```
 */
export function useRenderTime(componentName: string) {
  const startTimeRef = useRef<number>(0)

  // Measure render start (before render)
  startTimeRef.current = performance.now()

  // Measure render end (after render)
  useEffect(() => {
    const renderTime = performance.now() - startTimeRef.current

    // Only report slow renders (>16ms = below 60fps)
    if (renderTime > 16) {
      PerformanceMonitor.reportMetric({
        name: 'component_render',
        value: renderTime,
        type: 'render',
        metadata: {
          component: componentName,
        },
      })
    }
  })
}

/**
 * React hook to measure component mount time
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   useMountTime('MyComponent')
 *   return <div>...</div>
 * }
 * ```
 */
export function useMountTime(componentName: string) {
  useEffect(() => {
    const markName = `${componentName}-mount`
    PerformanceMonitor.mark(markName)

    return () => {
      PerformanceMonitor.measure(componentName, markName)
    }
  }, [componentName])
}

/**
 * Initialize performance monitoring
 * Call this in _app.tsx or layout.tsx
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return

  PerformanceMonitor.observeLongTasks()
  PerformanceMonitor.observeResourceTiming()
}
