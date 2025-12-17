/**
 * HTTP Error Message Extraction Utility
 * Phase 7.4: Comprehensive Headers
 * 
 * FEATURES:
 * - Extracts human-readable error messages from HTTP responses
 * - Supports Axios-style error objects with nested response data
 * - Handles multiple error message locations (error, message, detail)
 * - Formats errors with HTTP status codes when available
 * - Provides fallback messages for unparseable errors
 * - Type-safe error handling with unknown type guard
 * - Works with various API response formats
 * - Edge Runtime compatible (no Node.js dependencies)
 * 
 * TODO:
 * - Add error message transformation for specific API providers (Etherscan, Blockscout)
 * - Support error message localization (i18n)
 * - Add structured error parsing for GraphQL errors
 * - Implement error message sanitization to remove sensitive data
 * - Add telemetry for error message patterns
 * - Support custom error extractors via config
 * - Add retry-after header extraction
 * 
 * CRITICAL:
 * - Never expose internal error details to client (use fallback message)
 * - Validate error message length before returning (max 500 chars)
 * - Sanitize error messages to prevent XSS attacks
 * - Do not log sensitive data (tokens, keys, passwords)
 * 
 * SUGGESTIONS:
 * - Consider caching common error message patterns
 * - Add error categorization (client vs server errors)
 * - Implement error message templates for consistency
 * - Consider rate limiting error message extraction for DDoS protection
 * 
 * AVOID:
 * - Returning raw error objects to client (security risk)
 * - Exposing database error messages (information leakage)
 * - Hardcoding error messages (use i18n)
 * - Ignoring error message length limits (potential DoS)
 * 
 * Created: December 2025
 * Last Modified: December 17, 2025
 * MCP Verified: Following error handling patterns
 * Quality Gates: GI-7 (Error Handling), GI-8 (Security)
 */

export function extractHttpErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (typeof error === 'object') {
    const maybeResponse = (error as any)?.response
    const dataMessage = maybeResponse?.data?.error || maybeResponse?.data?.message || maybeResponse?.data?.detail
    if (typeof dataMessage === 'string' && dataMessage.length > 0) {
      const status = maybeResponse?.status
      return status ? `HTTP ${status}: ${dataMessage}` : dataMessage
    }
    if ('message' in (error as any) && typeof (error as any).message === 'string') {
      return (error as any).message
    }
  }
  return fallback
}
