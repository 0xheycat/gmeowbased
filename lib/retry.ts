/**
 * Retry Utility with Exponential Backoff
 * 
 * Professional pattern from AWS SDK, Stripe, GitHub APIs
 * Handles transient failures with progressive delays
 * 
 * Features:
 * - Exponential backoff (1s, 2s, 4s)
 * - Max 3 attempts per request
 * - Error logging with attempt tracking
 * - Type-safe with generics
 * 
 * Usage:
 * ```typescript
 * const data = await withRetry(
 *   () => fetch('/api/data').then(r => r.json()),
 *   { maxAttempts: 3, delays: [1000, 2000, 4000] }
 * )
 * ```
 */

export interface RetryOptions {
  /**
   * Maximum number of attempts (including initial try)
   * @default 3
   */
  maxAttempts?: number

  /**
   * Delay in milliseconds before each retry
   * @default [1000, 2000, 4000]
   */
  delays?: number[]

  /**
   * Function to determine if error is retryable
   * @default (err) => true (retry all errors)
   */
  shouldRetry?: (error: Error, attempt: number) => boolean

  /**
   * Callback after each retry attempt
   * @default undefined
   */
  onRetry?: (error: Error, attempt: number, delay: number) => void
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delays: [1000, 2000, 4000],
  shouldRetry: () => true,
  onRetry: () => {},
}

/**
 * Execute function with retry logic and exponential backoff
 * 
 * Pattern: AWS SDK / Stripe API retry behavior
 * - Attempt 1: Immediate
 * - Attempt 2: Wait 1s
 * - Attempt 3: Wait 2s (after attempt 2)
 * - Attempt 4: Wait 4s (after attempt 3)
 * 
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Promise resolving to function result
 * @throws Last error if all attempts fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await fn()
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we should retry
      const isLastAttempt = attempt === config.maxAttempts
      const shouldRetry = config.shouldRetry(lastError, attempt)

      if (isLastAttempt || !shouldRetry) {
        // Log final failure
        console.error('[withRetry] All attempts failed:', {
          attempts: attempt,
          error: lastError.message,
        })
        throw lastError
      }

      // Calculate delay for next attempt
      const delayIndex = attempt - 1 // 0-indexed for delays array
      const delay = config.delays[delayIndex] ?? config.delays[config.delays.length - 1]

      // Log retry attempt
      console.warn('[withRetry] Retrying after error:', {
        attempt,
        nextAttempt: attempt + 1,
        delay: `${delay}ms`,
        error: lastError.message,
      })

      // Call retry callback
      config.onRetry(lastError, attempt, delay)

      // Wait before retry
      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError ?? new Error('Unknown error during retry')
}

/**
 * Sleep utility for delays
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Common retry predicates for specific error types
 */
export const RetryPredicates = {
  /**
   * Retry on network errors only (fetch failures, timeouts)
   */
  networkErrorsOnly: (error: Error): boolean => {
    const networkErrors = [
      'Failed to fetch',
      'NetworkError',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
    ]
    return networkErrors.some((msg) => error.message.includes(msg))
  },

  /**
   * Retry on 5xx server errors, skip 4xx client errors
   */
  serverErrorsOnly: (error: Error): boolean => {
    const match = error.message.match(/status:?\s*(\d{3})/)
    if (!match) return true // Retry if no status code
    const status = parseInt(match[1], 10)
    return status >= 500 && status < 600
  },

  /**
   * Never retry (useful for testing)
   */
  never: (): boolean => false,
}

/**
 * Pre-configured retry strategies
 */
export const RetryStrategies = {
  /**
   * Conservative: 2 retries with 2s, 4s delays
   * Good for user-facing operations
   */
  conservative: {
    maxAttempts: 3,
    delays: [2000, 4000],
  } as RetryOptions,

  /**
   * Aggressive: 4 retries with 500ms, 1s, 2s, 4s delays
   * Good for background tasks
   */
  aggressive: {
    maxAttempts: 5,
    delays: [500, 1000, 2000, 4000],
  } as RetryOptions,

  /**
   * Fast: 2 retries with 500ms, 1s delays
   * Good for real-time operations
   */
  fast: {
    maxAttempts: 3,
    delays: [500, 1000],
  } as RetryOptions,

  /**
   * Standard: 3 retries with 1s, 2s, 4s delays (default)
   * Balanced approach for most use cases
   */
  standard: {
    maxAttempts: 3,
    delays: [1000, 2000, 4000],
  } as RetryOptions,
}
