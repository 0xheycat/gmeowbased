/**
 * Request ID Generation
 * 
 * Generates unique request IDs for API debugging and tracing
 * Pattern: GitHub, Stripe, Vercel
 * Format: req_<timestamp>_<random>
 */

import { randomUUID } from 'crypto'

/**
 * Generate unique request ID
 * Format: req_1234567890_abc123
 */
export function generateRequestId(): string {
  const timestamp = Date.now()
  const random = randomUUID().split('-')[0]
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
