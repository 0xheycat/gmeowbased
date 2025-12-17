/**
 * Request ID Generation Middleware
 * Phase 7.4: Comprehensive Headers
 * 
 * FEATURES:
 * - Generates unique request IDs for API debugging and distributed tracing
 * - Follows industry patterns from GitHub, Stripe, and Vercel APIs
 * - Uses Web Crypto API (Edge Runtime compatible)
 * - Supports client-provided request IDs for client-side tracing
 * - Validates request ID format to prevent injection attacks
 * - Adds standardized X-Request-ID headers to responses
 * - Format: req_<timestamp>_<random> (e.g., req_1234567890_abc123)
 * - Enables end-to-end request tracking across microservices
 * - Compatible with logging and APM tools (Sentry, Datadog)
 * 
 * TODO:
 * - Add request ID middleware for automatic injection
 * - Integrate with structured logging system
 * - Support correlation IDs for multi-request flows
 * - Add request ID to error tracking payloads
 * - Implement request ID propagation to external APIs
 * - Add OpenTelemetry trace ID mapping
 * - Support custom request ID formats via config
 * 
 * CRITICAL:
 * - Always validate client-provided request IDs (prevent injection)
 * - Request IDs must be unique (avoid collisions)
 * - Never expose sensitive data in request IDs
 * - Limit request ID length to prevent header overflow
 * 
 * SUGGESTIONS:
 * - Consider using UUIDv7 for better sortability
 * - Add request ID to all API error responses
 * - Include request ID in rate limit headers
 * - Log request ID at the start of each request
 * 
 * AVOID:
 * - Using sequential IDs (security risk, predictable)
 * - Including PII in request IDs
 * - Accepting arbitrarily long request IDs from clients
 * - Forgetting to add request ID to error responses
 * 
 * Created: December 2025
 * Last Modified: December 17, 2025
 * Pattern: GitHub API, Stripe API, Vercel Edge
 * Quality Gates: GI-8 (Security), GI-9 (Observability)
 */

/**
 * Generate unique request ID
 * Format: req_1234567890_abc123
 * Uses Web Crypto API (Edge Runtime compatible)
 */
export function generateRequestId(): string {
  const timestamp = Date.now()
  const random = crypto.randomUUID().split('-')[0]
  return `req_${timestamp}_${random}`
}

/**
 * Extract request ID from headers or generate new one
 * Checks: X-Request-ID, Request-Id headers
 */
export function getOrGenerateRequestId(request: Request): string {
  // Check if client provided request ID
  const clientRequestId = 
    request.headers.get('x-request-id') || 
    request.headers.get('request-id')
  
  if (clientRequestId && isValidRequestId(clientRequestId)) {
    return clientRequestId
  }
  
  // Generate new request ID
  return generateRequestId()
}

// Alias for convenience
export { getOrGenerateRequestId as getRequestId }

/**
 * Validate request ID format
 * Must start with req_ and be 20-50 characters
 */
export function isValidRequestId(id: string): boolean {
  return id.startsWith('req_') && id.length >= 20 && id.length <= 50
}

/**
 * Add request ID to response headers
 * Follows GitHub/Stripe pattern
 */
export function addRequestIdHeaders(
  headers: HeadersInit | undefined,
  requestId: string
): HeadersInit {
  return {
    ...headers,
    'X-Request-Id': requestId,
    'Request-Id': requestId, // Alternative header name
  }
}
