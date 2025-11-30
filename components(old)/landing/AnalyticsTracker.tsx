/**
 * Analytics Tracker Component
 * 
 * Client-side wrapper to track page views and user interactions
 * Uses lib/analytics.ts for event tracking
 * 
 * Events tracked:
 * - Page views (landing_page_view)
 * - CTA clicks (cta_click)
 * - Share button clicks (share_button_click)
 * - Section visibility (section_visible)
 */

'use client'

import { useEffect, useRef } from 'react'

// ========================================
// TYPES
// ========================================

type AnalyticsEvent = 
  | 'landing_page_view'
  | 'cta_click'
  | 'share_button_click'
  | 'section_visible'
  | 'leaderboard_view'
  | 'viral_metrics_view'

type EventProperties = {
  referrer?: string
  section?: string
  label?: string
  method?: string
  timestamp?: number
  [key: string]: any
}

// ========================================
// ANALYTICS UTILITY
// ========================================

/**
 * Track analytics event
 * Falls back gracefully if analytics not available
 */
function trackEvent(event: AnalyticsEvent, properties: EventProperties = {}) {
  try {
    // Add timestamp
    const enrichedProperties = {
      ...properties,
      timestamp: Date.now(),
      page: 'landing',
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event, enrichedProperties)
    }

    // Send to Vercel Analytics (if available)
    if (typeof window !== 'undefined' && 'va' in window) {
      // @ts-ignore - Vercel Analytics global
      window.va('event', { name: event, data: enrichedProperties })
    }

    // Send to custom analytics endpoint (if configured)
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, properties: enrichedProperties }),
        keepalive: true, // Ensure event is sent even if page unloads
      }).catch((error) => {
        console.error('[Analytics] Failed to send event:', error)
      })
    }
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error)
  }
}

// ========================================
// PAGE VIEW TRACKER
// ========================================

export function PageViewTracker() {
  const hasTracked = useRef(false)

  useEffect(() => {
    // Track only once per mount
    if (hasTracked.current) return
    hasTracked.current = true

    trackEvent('landing_page_view', {
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    })
  }, [])

  return null // This component renders nothing
}

// ========================================
// CTA TRACKER (HOC)
// ========================================

interface CTATrackerProps {
  section: string
  label: string
  href?: string
  onClick?: () => void
  className?: string
  children: React.ReactNode
}

export function CTATracker({
  section,
  label,
  href,
  onClick,
  className,
  children,
}: CTATrackerProps) {
  const handleClick = () => {
    trackEvent('cta_click', {
      section,
      label,
      href,
    })

    if (onClick) {
      onClick()
    }
  }

  if (href) {
    return (
      <a
        href={href}
        className={className}
        onClick={handleClick}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      className={className}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}

// ========================================
// SECTION VISIBILITY TRACKER
// ========================================

interface SectionTrackerProps {
  sectionName: string
  children: React.ReactNode
  className?: string
  threshold?: number // 0-1, how much of section must be visible
}

export function SectionTracker({
  sectionName,
  children,
  className,
  threshold = 0.5,
}: SectionTrackerProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const hasTracked = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !sectionRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Track when section becomes visible (once)
          if (entry.isIntersecting && !hasTracked.current) {
            hasTracked.current = true
            trackEvent('section_visible', {
              section: sectionName,
              intersectionRatio: entry.intersectionRatio,
            })
          }
        })
      },
      {
        threshold,
        rootMargin: '0px',
      }
    )

    observer.observe(sectionRef.current)

    return () => {
      observer.disconnect()
    }
  }, [sectionName, threshold])

  return (
    <section ref={sectionRef} className={className}>
      {children}
    </section>
  )
}

// ========================================
// SHARE TRACKER
// ========================================

export function trackShareClick(method: string, source: string = 'landing') {
  trackEvent('share_button_click', {
    method,
    source,
  })
}

// ========================================
// LEADERBOARD TRACKER
// ========================================

export function trackLeaderboardView() {
  trackEvent('leaderboard_view', {
    source: 'landing',
  })
}

// ========================================
// VIRAL METRICS TRACKER
// ========================================

export function trackViralMetricsView() {
  trackEvent('viral_metrics_view', {
    source: 'landing',
  })
}

// ========================================
// ANALYTICS PROVIDER (Main Wrapper)
// ========================================

interface AnalyticsProviderProps {
  children: React.ReactNode
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  return (
    <>
      <PageViewTracker />
      {children}
    </>
  )
}

// ========================================
// EXPORTS
// ========================================

export { trackEvent }
