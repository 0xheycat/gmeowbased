/**
 * Centralized Error Handler Utility
 * 
 * Provides consistent error handling and logging for API routes
 * MCP Verified: 2025-11-17
 * Quality Gate: GI-7 (Error Handling)
 */

import { NextResponse } from 'next/server'

/**
 * Error types for categorization
 */
export enum ErrorType {
  VALIDATION = 'validation_error',
  AUTHENTICATION = 'authentication_error',
  AUTHORIZATION = 'authorization_error',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit_exceeded',
  DATABASE = 'database_error',
  EXTERNAL_API = 'external_api_error',
  INTERNAL = 'internal_error',
}

/**
 * Error details interface
 */
export interface ErrorDetails {
  type: ErrorType
  message: string
  details?: any
  statusCode?: number
  requestId?: string
}

/**
 * Log error with context
 * 
 * @param error - Error object or message
 * @param context - Additional context (route, user, etc)
 */
export function logError(error: Error | string, context?: Record<string, any>) {
  const timestamp = new Date().toISOString()
  const errorMessage = error instanceof Error ? error.message : error
  const stack = error instanceof Error ? error.stack : undefined

  console.error('[API Error]', {
    timestamp,
    message: errorMessage,
    stack,
    ...context,
  })

  // TODO: Send to external logging service (Sentry, Datadog, etc)
}

/**
 * Create standardized error response
 * 
 * @param errorDetails - Error details object
 * @returns NextResponse with error
 * 
 * @example
 * ```typescript
 * return createErrorResponse({
 *   type: ErrorType.VALIDATION,
 *   message: 'Invalid FID format',
 *   details: validationResult.error.issues,
 *   statusCode: 400
 * })
 * ```
 */
export function createErrorResponse(errorDetails: ErrorDetails): NextResponse {
  const {
    type,
    message,
    details,
    statusCode = 500,
    requestId,
  } = errorDetails

  // Log the error
  logError(message, {
    type,
    statusCode,
    details,
    requestId,
  })

  // User-friendly error messages
  const userMessages: Record<ErrorType, string> = {
    [ErrorType.VALIDATION]: 'Invalid request data',
    [ErrorType.AUTHENTICATION]: 'Authentication required',
    [ErrorType.AUTHORIZATION]: 'You do not have permission to access this resource',
    [ErrorType.NOT_FOUND]: 'Resource not found',
    [ErrorType.RATE_LIMIT]: 'Too many requests, please try again later',
    [ErrorType.DATABASE]: 'Database error occurred',
    [ErrorType.EXTERNAL_API]: 'External service error',
    [ErrorType.INTERNAL]: 'Internal server error',
  }

  const response = {
    error: type,
    message: userMessages[type] || message,
    ...(process.env.NODE_ENV === 'development' && details ? { details } : {}),
    ...(requestId ? { requestId } : {}),
  }

  const nextResponse = NextResponse.json(response, { status: statusCode })
  
  if (requestId) {
    nextResponse.headers.set('X-Request-ID', requestId)
  }

  return nextResponse
}

/**
 * Handle validation errors from Zod
 * 
 * @param zodError - Zod validation error
 * @returns NextResponse with validation error
 */
export function handleValidationError(zodError: any): NextResponse {
  return createErrorResponse({
    type: ErrorType.VALIDATION,
    message: 'Request validation failed',
    details: zodError.flatten ? zodError.flatten() : zodError.issues,
    statusCode: 400,
  })
}

/**
 * Handle authentication errors
 * 
 * @param message - Error message
 * @returns NextResponse with auth error
 */
export function handleAuthError(message = 'Authentication required'): NextResponse {
  return createErrorResponse({
    type: ErrorType.AUTHENTICATION,
    message,
    statusCode: 401,
  })
}

/**
 * Handle authorization errors
 * 
 * @param message - Error message
 * @returns NextResponse with authorization error
 */
export function handleAuthorizationError(message = 'Insufficient permissions'): NextResponse {
  return createErrorResponse({
    type: ErrorType.AUTHORIZATION,
    message,
    statusCode: 403,
  })
}

/**
 * Handle not found errors
 * 
 * @param resource - Name of resource not found
 * @returns NextResponse with not found error
 */
export function handleNotFoundError(resource = 'Resource'): NextResponse {
  return createErrorResponse({
    type: ErrorType.NOT_FOUND,
    message: `${resource} not found`,
    statusCode: 404,
  })
}

/**
 * Handle rate limit errors
 * 
 * @param retryAfter - Seconds until retry allowed
 * @returns NextResponse with rate limit error
 */
export function handleRateLimitError(retryAfter?: number): NextResponse {
  const response = createErrorResponse({
    type: ErrorType.RATE_LIMIT,
    message: 'Rate limit exceeded',
    statusCode: 429,
  })

  if (retryAfter) {
    response.headers.set('Retry-After', String(retryAfter))
  }

  return response
}

/**
 * Handle database errors
 * 
 * @param error - Database error
 * @param operation - Operation being performed
 * @returns NextResponse with database error
 */
export function handleDatabaseError(error: Error, operation?: string): NextResponse {
  return createErrorResponse({
    type: ErrorType.DATABASE,
    message: operation ? `Database error during ${operation}` : 'Database operation failed',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    statusCode: 500,
  })
}

/**
 * Handle external API errors
 * 
 * @param error - API error
 * @param service - Service name (e.g., 'Neynar', 'Upstash')
 * @returns NextResponse with external API error
 */
export function handleExternalApiError(error: Error, service?: string): NextResponse {
  return createErrorResponse({
    type: ErrorType.EXTERNAL_API,
    message: service ? `${service} API error` : 'External service error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    statusCode: 502,
  })
}

/**
 * Handle unexpected internal errors
 * 
 * @param error - Error object
 * @param context - Additional context
 * @returns NextResponse with internal error
 */
export function handleInternalError(error: Error, context?: Record<string, any>): NextResponse {
  return createErrorResponse({
    type: ErrorType.INTERNAL,
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? {
      message: error.message,
      stack: error.stack,
      ...context,
    } : undefined,
    statusCode: 500,
  })
}

/**
 * Wrap async handler with error handling
 * 
 * Supports both simple handlers and handlers with route params.
 * 
 * @param handler - Async request handler
 * @returns Wrapped handler with error handling
 * 
 * @example
 * ```typescript
 * // Simple handler
 * export const GET = withErrorHandler(async (request) => {
 *   return NextResponse.json({ success: true })
 * })
 * 
 * // Handler with params
 * export const GET = withErrorHandler(async (request, { params }) => {
 *   const { id } = params
 *   return NextResponse.json({ id })
 * })
 * ```
 */
export function withErrorHandler<T extends Request = Request, P = any>(
  handler: (request: T, context?: { params: P }) => Promise<NextResponse>
) {
  return async (request: T, context?: { params: P }): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error) {
      if (error instanceof Error) {
        return handleInternalError(error, {
          url: request.url,
          method: request.method,
        })
      }
      return handleInternalError(new Error('Unknown error occurred'))
    }
  }
}
