/**
 * Analytics tracking for Quest Wizard
 * 
 * Tracks user behavior, completion rates, and drop-off points
 */

export type AnalyticsEvent =
  | 'wizard_started'
  | 'wizard_completed'
  | 'wizard_abandoned'
  | 'template_selected'
  | 'template_skipped'
  | 'step_viewed'
  | 'step_completed'
  | 'step_error'
  | 'validation_error'
  | 'quest_created'
  | 'quest_creation_failed'
  | 'draft_restored'
  | 'draft_discarded'
  | 'asset_selected'
  | 'escrow_deposited'
  | 'view_toggled'
  // Phase 5.5-5.7: Viral share tracking
  | 'badge_shared'
  | 'cast_published'
  | 'cast_publish_error'

export type AnalyticsProperties = {
  // Wizard context
  step?: number
  stepName?: string
  totalSteps?: number
  hasDraft?: boolean
  draftAge?: number // seconds since draft created
  
  // Template context
  templateId?: string
  templateName?: string
  templateCategory?: 'social' | 'onchain' | 'hybrid'
  templateDifficulty?: 'easy' | 'medium' | 'hard'
  
  // Quest context
  questType?: string
  questMode?: 'social' | 'onchain'
  rewardMode?: 'token' | 'nft' | 'points' | 'none'
  chainKey?: string
  maxWinners?: number
  hasEligibilityGate?: boolean
  
  // Error context
  errorType?: string
  errorField?: string
  errorMessage?: string
  validationErrors?: number | string // Allow both for flexibility
  
  // Phase 5.5-5.7: Viral share context
  fid?: string
  tier?: string
  badgeName?: string
  shareMethod?: 'warpcast_deeplink' | 'direct_cast' | 'copy_link'
  castHash?: string
  castUrl?: string
  error?: string
  timestamp?: string
  
  // Performance context
  timeOnStep?: number // milliseconds
  totalTime?: number // milliseconds
  
  // User context
  isAuthenticated?: boolean
  hasFid?: boolean
  hasWallet?: boolean
  isMobile?: boolean
  
  // Asset context
  assetType?: 'token' | 'nft'
  assetSymbol?: string
  assetName?: string
  
  // View context
  viewMode?: 'standard' | 'card'
  fromView?: 'standard' | 'card'
  toView?: 'standard' | 'card'
  
  // Additional metadata
  [key: string]: any
}

/**
 * Track an analytics event
 */
export function trackEvent(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
  try {
    // Add global context
    const context = {
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    }
    
    // Combine with properties
    const payload = {
      event,
      properties: {
        ...properties,
        ...context,
      },
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event, properties)
    }
    
    // Send to analytics service (Posthog, Mixpanel, GA4, etc.)
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture(event, properties)
    }
    
    if (typeof window !== 'undefined' && (window as any).mixpanel) {
      (window as any).mixpanel.track(event, properties)
    }
    
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event, properties)
    }
    
    // Store in localStorage for offline analysis
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const key = `analytics_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      localStorage.setItem(key, JSON.stringify(payload))
    }
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error)
  }
}

/**
 * Track wizard started
 */
export function trackWizardStarted(properties?: AnalyticsProperties): void {
  trackEvent('wizard_started', properties)
}

/**
 * Track wizard completed
 */
export function trackWizardCompleted(properties?: AnalyticsProperties): void {
  trackEvent('wizard_completed', properties)
}

/**
 * Track template selected
 */
export function trackTemplateSelected(properties?: AnalyticsProperties): void {
  trackEvent('template_selected', properties)
}

/**
 * Track step viewed
 */
export function trackStepViewed(properties?: AnalyticsProperties): void {
  trackEvent('step_viewed', properties)
}

/**
 * Track step completed
 */
export function trackStepCompleted(properties?: AnalyticsProperties): void {
  trackEvent('step_completed', properties)
}

/**
 * Track validation error
 */
export function trackValidationError(properties?: AnalyticsProperties): void {
  trackEvent('validation_error', properties)
}

/**
 * Track quest created
 */
export function trackQuestCreated(properties?: AnalyticsProperties): void {
  trackEvent('quest_created', properties)
}

/**
 * Track draft restored
 */
export function trackDraftRestored(properties?: AnalyticsProperties): void {
  trackEvent('draft_restored', properties)
}

/**
 * Track draft discarded
 */
export function trackDraftDiscarded(properties?: AnalyticsProperties): void {
  trackEvent('draft_discarded', properties)
}

/**
 * Hook to track wizard session timing
 */
export function useWizardTiming() {
  const startTime = typeof window !== 'undefined' ? Date.now() : 0
  const stepStartTimes: Record<number, number> = {}
  
  const startStep = (stepIndex: number) => {
    stepStartTimes[stepIndex] = Date.now()
  }
  
  const endStep = (stepIndex: number) => {
    const start = stepStartTimes[stepIndex]
    if (start) {
      return Date.now() - start
    }
    return 0
  }
  
  const getTotalTime = () => {
    return Date.now() - startTime
  }
  
  return {
    startStep,
    endStep,
    getTotalTime,
  }
}

/**
 * Batch analytics events for performance
 */
class AnalyticsBatcher {
  private queue: Array<{ event: AnalyticsEvent; properties?: AnalyticsProperties }> = []
  private flushInterval = 5000 // 5 seconds
  private maxBatchSize = 50
  private timer: NodeJS.Timeout | null = null
  
  push(event: AnalyticsEvent, properties?: AnalyticsProperties) {
    this.queue.push({ event, properties })
    
    if (this.queue.length >= this.maxBatchSize) {
      this.flush()
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.flushInterval)
    }
  }
  
  flush() {
    if (this.queue.length === 0) return
    
    const batch = [...this.queue]
    this.queue = []
    
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    
    // Send batch to analytics service
    batch.forEach(({ event, properties }) => {
      trackEvent(event, properties)
    })
  }
}

export const analyticsBatcher = new AnalyticsBatcher()
