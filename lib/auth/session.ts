/**
 * Session Management Utilities
 * 
 * Secure session handling for web browsers
 * Uses httpOnly cookies with signed tokens
 * 
 * IMPROVED: Extended old foundation patterns with better flexibility
 * Source: backups/pre-migration-20251126-213424/lib/auth.ts (improved)
 * MCP Verified: November 28, 2025
 * Quality Gates: GI-7, GI-8, GI-11
 */

import { NextRequest, NextResponse } from 'next/server'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const SESSION_COOKIE_NAME = 'gmeow_session'
const USER_SCOPE = 'gmeow.user'
const DEFAULT_SESSION_TTL_DAYS = 30 // Longer default for better UX
const EXTENDED_SESSION_TTL_DAYS = 90 // "Remember me" sessions

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.USER_JWT_SECRET || process.env.ADMIN_JWT_SECRET
  if (!secret) {
    console.warn('No session secret configured, using default (insecure for production)')
    return new TextEncoder().encode('gmeow-default-secret-change-in-production')
  }
  return new TextEncoder().encode(secret)
}

export interface SessionData {
  fid: number
  username?: string
  address?: string
  scope?: string
  createdAt: number
  expiresAt: number
}

export interface SessionOptions {
  remember?: boolean
}

/**
 * Create a new session token
 * 
 * @param data - Session data (FID, username, address)
 * @param options - Session options (remember)
 * @returns Signed JWT token
 */
export async function createSession(
  data: Omit<SessionData, 'createdAt' | 'expiresAt' | 'scope'>,
  options: SessionOptions = {}
): Promise<string> {
  const now = Date.now()
  const duration = options.remember
    ? EXTENDED_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
    : DEFAULT_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  const expiresAt = now + duration

  const payload: JWTPayload = {
    ...data,
    scope: USER_SCOPE,
    createdAt: now,
    expiresAt,
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now / 1000)
    .setExpirationTime(expiresAt / 1000)
    .sign(getSessionSecret())

  return token
}

/**
 * Verify and decode session token
 * 
 * @param token - JWT token string
 * @returns Session data or null if invalid
 */
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const verified = await jwtVerify(token, getSessionSecret(), { algorithms: ['HS256'] })
    const payload = verified.payload as unknown as SessionData

    // Verify scope
    if (payload.scope && payload.scope !== USER_SCOPE) {
      console.warn('Invalid session scope:', payload.scope)
      return null
    }

    // Check expiration
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return null
    }

    return payload
  } catch (error) {
    console.error('Session verification failed:', error)
    return null
  }
}

/**
 * Get session from request cookies
 */
export async function getSession(request: NextRequest): Promise<SessionData | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  return await verifySession(token)
}

/**
 * Set session cookie in response
 * 
 * @param response - NextResponse object
 * @param token - JWT token
 * @param options - Session options (remember)
 * @returns Updated response with cookie
 */
export function setSessionCookie(
  response: NextResponse,
  token: string,
  options: SessionOptions = {}
): NextResponse {
  const maxAge = options.remember
    ? EXTENDED_SESSION_TTL_DAYS * 24 * 60 * 60
    : DEFAULT_SESSION_TTL_DAYS * 24 * 60 * 60

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge, // In seconds
    path: '/'
  })

  return response
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}

/**
 * Create session and set cookie (convenience function)
 * 
 * @param response - NextResponse object
 * @param data - Session data
 * @param options - Session options
 * @returns Updated response with cookie
 */
export async function createSessionWithCookie(
  response: NextResponse,
  data: Omit<SessionData, 'createdAt' | 'expiresAt' | 'scope'>,
  options: SessionOptions = {}
): Promise<NextResponse> {
  const token = await createSession(data, options)
  return setSessionCookie(response, token, options)
}

/**
 * Refresh session if close to expiration (within 24 hours)
 * 
 * @param request - NextRequest object  
 * @param response - NextResponse object
 * @param options - Session options
 * @returns Updated response with refreshed cookie if needed
 */
export async function refreshSessionIfNeeded(
  request: NextRequest,
  response: NextResponse,
  options: SessionOptions = {}
): Promise<NextResponse> {
  const session = await getSession(request)

  if (!session) {
    return response
  }

  const timeUntilExpiry = session.expiresAt - Date.now()
  const oneDayMs = 24 * 60 * 60 * 1000

  // Refresh if expiring within 24 hours
  if (timeUntilExpiry < oneDayMs) {
    const newToken = await createSession({
      fid: session.fid,
      username: session.username,
      address: session.address
    }, options)
    return setSessionCookie(response, newToken, options)
  }

  return response
}
