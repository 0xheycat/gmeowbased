/**
 * Audit Logging Utility
 * 
 * BUG #R8 FIX: Environment-Gated Logging
 * Prevents console.log performance issues in production
 * 
 * Pattern: Only log in development/staging, silent in production
 * Created: December 25, 2025
 * Quality Gates: GI-8 (Security)
 */

/**
 * Log audit events (development only)
 * In production, this is a no-op to prevent:
 * 1. Performance degradation (console I/O is slow)
 * 2. Log overflow in production systems
 * 3. Potential sensitive data exposure
 */
export function auditLog(message: string, data?: Record<string, any>): void {
  // Only log in development/staging (not production)
  if (process.env.NODE_ENV !== 'production') {
    console.log(message, data || '')
  }
  
  // TODO: In future, send to proper logging service (Datadog, LogDNA, etc.)
  // Example:
  // if (process.env.NODE_ENV === 'production' && loggingService) {
  //   loggingService.info(message, data)
  // }
}

/**
 * Log warning messages (development only)
 */
export function auditWarn(message: string, data?: Record<string, any>): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(message, data || '')
  }
}

/**
 * Log error messages (always enabled - production needs error tracking)
 */
export function auditError(message: string, error?: any): void {
  // Always log errors (even in production)
  console.error(message, error || '')
  
  // TODO: Send to error tracking service (Sentry, Bugsnag, etc.)
}
