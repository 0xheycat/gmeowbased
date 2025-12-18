/**
 * @file lib/notifications/error-tracking.ts
 * @description Silent error tracking for production with development logging
 * 
 * PHASE: Phase 7.7 - Notifications Module (December 18, 2025)
 * 
 * FEATURES:
 *   - Silent error tracking in production (no console pollution)
 *   - Full logging in development with timestamps and context
 *   - Three severity levels (error, warning, info)
 *   - Structured error context with function names and parameters
 *   - Stack trace preservation for Error objects
 *   - Graceful error handling (return false/null patterns)
 *   - Future-ready for external monitoring services (Sentry, LogRocket)
 * 
 * REFERENCE DOCUMENTATION:
 *   - Error Handling: lib/middleware/error-handler.ts
 *   - Used by: lib/notifications/history.ts, miniapp.ts, viral.ts
 *   - Pattern: Fail gracefully with boolean return values
 * 
 * REQUIREMENTS:
 *   - Website: https://gmeowhq.art
 *   - NO CONSOLE POLLUTION in production
 *   - Development must have full error visibility
 *   - Error context must be JSON-serializable
 * 
 * TODO:
 *   - [ ] Add Sentry integration for production error tracking
 *   - [ ] Implement error rate limiting (prevent spam)
 *   - [ ] Add error categorization (transient vs permanent)
 *   - [ ] Support custom error handlers per module
 *   - [ ] Add error correlation IDs (trace across services)
 *   - [ ] Implement error sampling (reduce volume in high-traffic)
 *   - [ ] Add error alerting (Slack, Discord webhooks)
 *   - [ ] Support error recovery suggestions
 * 
 * CRITICAL:
 *   - Production mode MUST be silent (no console.error/warn/log)
 *   - Error context must be JSON-serializable (no circular references)
 *   - Stack traces only logged in development (security concern)
 *   - Always return boolean/null after tracking (fail gracefully)
 *   - Use trackError for errors, trackWarning for warnings, trackInfo for debug
 *   - NODE_ENV check happens inside functions (not at module load)
 * 
 * SUGGESTIONS:
 *   - Consider implementing error budgets (max errors per hour)
 *   - Add error fingerprinting (deduplicate similar errors)
 *   - Implement error context enrichment (user FID, request ID)
 *   - Add error recovery metrics (success after retry)
 *   - Support structured logging formats (JSON, logfmt)
 *   - Implement error search and filtering dashboard
 *   - Add error trend analysis (detect spikes)
 * 
 * AVOID:
 *   - ❌ DON'T use console.error/warn/log directly (use track functions)
 *   - ❌ DON'T include sensitive data in error context (PII, tokens)
 *   - ❌ DON'T throw errors after tracking (use return false pattern)
 *   - ❌ DON'T log errors synchronously (blocks request handling)
 *   - ❌ DON'T track errors for expected failures (404, validation)
 *   - ❌ DON'T include full request/response bodies (too large)
 *   - ❌ DON'T track errors without context (include function name)
 *   - ❌ DON'T ignore error types (differentiate Error vs unknown)
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
