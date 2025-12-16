/**
 * Silent Error Tracking for Production
 * 
 * Replaces console.error/warn with silent tracking in production.
 * Errors are still handled by return values (false, null, etc.)
 * Development: Full logging with context
 * Production: Silent (no console pollution)
 * 
 * @module lib/notifications/error-tracking
 */

type ErrorContext = Record<string, unknown>

/**
 * Track errors silently in production, with logging in development
 * 
 * @param message - Short error identifier (e.g., 'notification_save_failed')
 * @param error - The error object or message
 * @param context - Additional context for debugging (function name, params, etc.)
 */
export const trackError = (
  message: string,
  error: Error | unknown,
  context?: ErrorContext
): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${new Date().toISOString()}] ${message}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    })
  }
  
  // In production: silent (errors handled by return values)
  // Future: Send to external service (Sentry, LogRocket, etc.) if needed
}

/**
 * Track warnings silently in production, with logging in development
 * 
 * @param message - Short warning identifier
 * @param context - Additional context for debugging
 */
export const trackWarning = (
  message: string,
  context?: ErrorContext
): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[${new Date().toISOString()}] ${message}`, context)
  }
}

/**
 * Track info logs in development only (completely silent in production)
 * 
 * @param message - Info message
 * @param context - Additional context
 */
export const trackInfo = (
  message: string,
  context?: ErrorContext
): void => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${new Date().toISOString()}] ${message}`, context)
  }
}
