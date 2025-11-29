import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { NextRequest } from 'next/server'

// Session configuration
const USER_SESSION_COOKIE = 'gmeow_user_session'
const USER_SCOPE = 'gmeow.user'
const DEFAULT_SESSION_TTL_DAYS = 30 // User sessions last longer
const EXTENDED_SESSION_TTL_DAYS = 90 // "Remember me" sessions

// Types
export interface UserSessionPayload extends JWTPayload {
  scope: string
  sub: string // FID as string
  fid: number
  username?: string
  address?: `0x${string}`
}

export interface SessionIssueOptions {
  fid: number
  username?: string
  address?: `0x${string}`
  remember?: boolean
}

export interface SessionIssueResult {
  token: string
  maxAge: number
}

export interface SessionVerification {
  valid: boolean
  reason?: string
  payload?: UserSessionPayload
}

export interface UserRequestValidation {
  authenticated: boolean
  reason?: string
  fid?: number
  username?: string
  address?: `0x${string}`
  payload?: UserSessionPayload
}

// Helper to get JWT secret
function getJwtSecret(): Uint8Array {
  const secret = process.env.USER_JWT_SECRET || process.env.ADMIN_JWT_SECRET
  if (!secret) {
    throw new Error('User JWT secret not configured. Set USER_JWT_SECRET in the environment.')
  }
  return new TextEncoder().encode(secret)
}

// Check if user auth is enabled
export function isUserAuthEnabled(): boolean {
  return Boolean(process.env.USER_JWT_SECRET || process.env.ADMIN_JWT_SECRET)
}

/**
 * Issue a new user session JWT
 * 
 * @param options - Session options (FID, username, address, remember)
 * @returns Token and max age in seconds
 */
export async function issueUserSession({
  fid,
  username,
  address,
  remember = false,
}: SessionIssueOptions): Promise<SessionIssueResult> {
  const now = new Date()
  const expMs = remember
    ? now.getTime() + EXTENDED_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
    : now.getTime() + DEFAULT_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000

  const payload: UserSessionPayload = {
    scope: USER_SCOPE,
    sub: fid.toString(),
    fid,
    username,
    address,
  }

  const token = await new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(expMs / 1000)
    .sign(getJwtSecret())

  const maxAgeSeconds = Math.round((expMs - now.getTime()) / 1000)
  return { token, maxAge: maxAgeSeconds }
}

/**
 * Verify a user session JWT token
 * 
 * @param token - JWT token string
 * @returns Verification result with payload if valid
 */
export async function verifyUserSessionToken(
  token: string | null | undefined
): Promise<SessionVerification> {
  if (!token) return { valid: false, reason: 'missing_token' }
  
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] })
    
    if (payload.scope !== USER_SCOPE) {
      return { valid: false, reason: 'invalid_scope' }
    }
    
    return { valid: true, payload: payload as UserSessionPayload }
  } catch (error) {
    return { valid: false, reason: (error as Error)?.message ?? 'invalid_token' }
  }
}

/**
 * Get user session cookie name
 */
export function userSessionCookieName(): string {
  return USER_SESSION_COOKIE
}

/**
 * Build user session cookie configuration
 * 
 * @param token - JWT token
 * @param maxAge - Max age in seconds
 * @returns Cookie configuration object
 */
export function buildUserSessionCookie({ token, maxAge }: { token: string; maxAge: number }) {
  return {
    name: USER_SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const, // 'lax' for better compatibility with Farcaster frames
      path: '/',
      maxAge,
    },
  }
}

/**
 * Build clear cookie configuration (for sign-out)
 */
export function buildUserSessionClearCookie() {
  return {
    name: USER_SESSION_COOKIE,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0,
    },
  }
}

/**
 * Extract FID from multiple sources with priority order:
 * 1. x-farcaster-fid header (from frame context)
 * 2. fid query parameter (legacy support)
 * 
 * @param request - NextRequest object
 * @returns FID number or null
 */
export function extractFidFromRequest(request: NextRequest): number | null {
  // Priority 1: Farcaster frame header
  const headerFid = request.headers.get('x-farcaster-fid')
  if (headerFid) {
    const fid = Number(headerFid)
    if (Number.isFinite(fid) && fid > 0) {
      return fid
    }
  }

  // Priority 2: Query parameter (legacy)
  const url = new URL(request.url)
  const queryFid = url.searchParams.get('fid')
  if (queryFid) {
    const fid = Number(queryFid)
    if (Number.isFinite(fid) && fid > 0) {
      return fid
    }
  }

  return null
}

/**
 * Validate user request with unified auth checking
 * Priority order:
 * 1. User session JWT (most trusted for authenticated users)
 * 2. Frame headers (x-farcaster-fid)
 * 3. Query parameters (legacy fallback)
 * 
 * @param request - NextRequest object
 * @returns Validation result with FID if authenticated
 */
export async function validateUserRequest(request: NextRequest): Promise<UserRequestValidation> {
  // Priority 1: Check session JWT
  const token = request.cookies.get(USER_SESSION_COOKIE)?.value ?? null
  if (token) {
    const verification = await verifyUserSessionToken(token)
    if (verification.valid && verification.payload) {
      return {
        authenticated: true,
        fid: verification.payload.fid,
        username: verification.payload.username,
        address: verification.payload.address,
        payload: verification.payload,
      }
    }
  }

  // Priority 2 & 3: Check frame headers and query parameters
  const fid = extractFidFromRequest(request)
  if (fid) {
    return {
      authenticated: true,
      fid,
      reason: 'frame_or_query',
    }
  }

  return {
    authenticated: false,
    reason: 'no_auth_found',
  }
}

/**
 * Check if user owns/can access a specific FID's data
 * 
 * @param request - NextRequest object
 * @param targetFid - FID to check access for
 * @returns Authorization result
 */
export async function checkUserAuth(
  request: NextRequest,
  targetFid: number
): Promise<{
  authorized: boolean
  error?: string
}> {
  const validation = await validateUserRequest(request)
  
  if (!validation.authenticated) {
    return {
      authorized: false,
      error: 'Not authenticated',
    }
  }

  if (validation.fid !== targetFid) {
    return {
      authorized: false,
      error: 'Unauthorized access to user data',
    }
  }

  return { authorized: true }
}

/**
 * Get authenticated FID from request (unified resolver)
 * Returns null if not authenticated
 * 
 * @param request - NextRequest object
 * @returns FID number or null
 */
export async function getAuthenticatedFid(request: NextRequest): Promise<number | null> {
  const validation = await validateUserRequest(request)
  return validation.authenticated ? validation.fid ?? null : null
}
