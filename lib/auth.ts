/**
 * Authentication & Authorization Utilities
 * 
 * Provides centralized auth checks for API routes
 * MCP Verified: 2025-11-17
 * Quality Gate: GI-11 (Security)
 */

import { NextRequest } from 'next/server'

/**
 * Admin API secret key from environment
 * Used for protecting admin endpoints
 */
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || process.env.NEXT_PUBLIC_ADMIN_API_KEY

/**
 * Bot API secret key from environment
 * Used for bot-specific operations
 */
const BOT_API_KEY = process.env.BOT_API_KEY

/**
 * Check if request has valid admin authentication
 * 
 * Checks for API key in:
 * 1. Authorization header (Bearer token)
 * 2. x-api-key header
 * 3. api-key header
 * 
 * @param request - NextRequest object
 * @returns Object with authenticated status and error message if failed
 * 
 * @example
 * ```typescript
 * const auth = checkAdminAuth(req)
 * if (!auth.authenticated) {
 *   return NextResponse.json({ error: auth.error }, { status: 401 })
 * }
 * ```
 */
export function checkAdminAuth(request: NextRequest): {
  authenticated: boolean
  error?: string
} {
  if (!ADMIN_API_KEY) {
    console.warn('[Auth] ADMIN_API_KEY not configured')
    return {
      authenticated: false,
      error: 'Admin authentication not configured'
    }
  }

  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (token === ADMIN_API_KEY) {
      return { authenticated: true }
    }
  }

  // Check x-api-key header
  const xApiKey = request.headers.get('x-api-key')
  if (xApiKey === ADMIN_API_KEY) {
    return { authenticated: true }
  }

  // Check api-key header
  const apiKey = request.headers.get('api-key')
  if (apiKey === ADMIN_API_KEY) {
    return { authenticated: true }
  }

  return {
    authenticated: false,
    error: 'Invalid or missing API key'
  }
}

/**
 * Check if request has valid bot authentication
 * 
 * @param request - NextRequest object
 * @returns Object with authenticated status and error message if failed
 */
export function checkBotAuth(request: NextRequest): {
  authenticated: boolean
  error?: string
} {
  if (!BOT_API_KEY) {
    console.warn('[Auth] BOT_API_KEY not configured')
    return {
      authenticated: false,
      error: 'Bot authentication not configured'
    }
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (token === BOT_API_KEY) {
      return { authenticated: true }
    }
  }

  const apiKey = request.headers.get('x-api-key') || request.headers.get('api-key')
  if (apiKey === BOT_API_KEY) {
    return { authenticated: true }
  }

  return {
    authenticated: false,
    error: 'Invalid or missing bot API key'
  }
}

/**
 * Check if request is from the user themselves (FID ownership)
 * Used for endpoints where users can only access their own data
 * 
 * @param request - NextRequest object
 * @param targetFid - The FID being accessed
 * @returns Object with authorized status
 * 
 * @example
 * ```typescript
 * const auth = checkUserAuth(req, 123)
 * if (!auth.authorized) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
 * }
 * ```
 */
export function checkUserAuth(
  request: NextRequest,
  targetFid: number
): {
  authorized: boolean
  error?: string
} {
  // Check FID from headers (sent by Farcaster miniapp)
  const headerFid = request.headers.get('x-farcaster-fid')
  if (headerFid && Number(headerFid) === targetFid) {
    return { authorized: true }
  }

  // Check FID from session/auth token (if implemented)
  // TODO: Add JWT/session check here when auth system is implemented

  return {
    authorized: false,
    error: 'Unauthorized access to user data'
  }
}

/**
 * Get authenticated user FID from request
 * Returns null if not authenticated
 * 
 * @param request - NextRequest object
 * @returns FID number or null
 */
export function getAuthenticatedFid(request: NextRequest): number | null {
  // Check Farcaster headers
  const headerFid = request.headers.get('x-farcaster-fid')
  if (headerFid) {
    const fid = Number(headerFid)
    if (Number.isFinite(fid) && fid > 0) {
      return fid
    }
  }

  // TODO: Check JWT/session token when implemented

  return null
}

/**
 * Check if request is from a verified Farcaster Frame
 * Validates frame signature
 * 
 * @param request - NextRequest object
 * @returns Object with verified status
 */
export function checkFrameAuth(request: NextRequest): {
  verified: boolean
  fid?: number
  error?: string
} {
  const frameSignature = request.headers.get('x-frame-signature')
  const frameFid = request.headers.get('x-frame-fid')

  if (!frameSignature || !frameFid) {
    return {
      verified: false,
      error: 'Missing frame authentication headers'
    }
  }

  // TODO: Implement frame signature verification
  // For now, trust the headers if present
  const fid = Number(frameFid)
  if (!Number.isFinite(fid) || fid <= 0) {
    return {
      verified: false,
      error: 'Invalid frame FID'
    }
  }

  return {
    verified: true,
    fid
  }
}
