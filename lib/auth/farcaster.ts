/**
 * Farcaster Authentication Utilities
 * 
 * IMPROVED: Better priority ordering and structured responses from old foundation
 * Reused logic from old foundation lib/auth.ts (enhanced)
 * NEW UI/UX with Tailwick components
 * 
 * Source: backups/pre-migration-20251126-213424/lib/auth.ts (improved)
 * MCP Verified: November 28, 2025
 * Quality Gates: GI-7, GI-8, GI-11
 */

import { NextRequest } from 'next/server'
import { getMiniappContext } from '@/lib/miniapp-detection'
import { getSession } from './session'

/**
 * Get Farcaster FID from request with priority order:
 * 1. Frame headers (x-farcaster-fid) - Most trusted in frame context
 * 2. Session cookie - Authenticated user session
 * 3. Miniapp context - Client-side context (fallback)
 * 4. Query parameter - Legacy support (least trusted)
 * 
 * @param request - NextRequest object
 * @returns FID number or null
 */
export async function getFarcasterFid(request?: NextRequest): Promise<number | null> {
  // Priority 1: Check Farcaster frame headers (most trusted in frame context)
  if (request) {
    const headerFid = request.headers.get('x-farcaster-fid')
    if (headerFid) {
      const fid = Number(headerFid)
      if (Number.isFinite(fid) && fid > 0) {
        return fid
      }
    }
  }

  // Priority 2: Check session cookie (authenticated user)
  if (request) {
    try {
      const session = await getSession(request)
      if (session?.fid) {
        return session.fid
      }
    } catch (error) {
      console.error('Failed to get session:', error)
    }
  }

  // Priority 3: Try miniapp context (client-side, less trusted)
  if (typeof window !== 'undefined') {
    try {
      const context = await getMiniappContext()
      if (context?.user?.fid) {
        return context.user.fid
      }
    } catch (error) {
      console.error('Failed to get miniapp context:', error)
    }
  }

  // Priority 4: Check query parameter (legacy support, least trusted)
  if (request) {
    const url = new URL(request.url)
    const queryFid = url.searchParams.get('fid')
    if (queryFid) {
      const fid = Number(queryFid)
      if (Number.isFinite(fid) && fid > 0) {
        return fid
      }
    }
  }

  return null
}

/**
 * Check if user is authenticated (has valid FID)
 */
export async function isAuthenticated(request?: NextRequest): Promise<boolean> {
  const fid = await getFarcasterFid(request)
  return fid !== null && fid > 0
}

/**
 * Get authenticated user FID (throws if not authenticated)
 * Use this in API routes that require authentication
 */
export async function requireAuth(request: NextRequest): Promise<number> {
  const fid = await getFarcasterFid(request)
  
  if (!fid) {
    throw new Error('Unauthorized: No Farcaster identity found')
  }

  return fid
}

/**
 * Check if user owns the resource (FID ownership)
 */
export function checkFidOwnership(
  authenticatedFid: number,
  targetFid: number
): {
  authorized: boolean
  error?: string
} {
  if (authenticatedFid === targetFid) {
    return { authorized: true }
  }

  return {
    authorized: false,
    error: 'Unauthorized: You can only access your own data'
  }
}

/**
 * Admin API authentication (reused from old foundation)
 */
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || process.env.NEXT_PUBLIC_ADMIN_API_KEY

export function checkAdminAuth(request: NextRequest): {
  authenticated: boolean
  error?: string
} {
  if (!ADMIN_API_KEY) {
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
