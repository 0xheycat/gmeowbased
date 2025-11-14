import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { authenticator } from 'otplib'
import type { NextRequest } from 'next/server'

const ADMIN_SESSION_COOKIE = 'gmeow_admin_session'
const ADMIN_SCOPE = 'gmeow.admin'
const DEFAULT_SESSION_TTL_HOURS = 12
const REMEMBER_SESSION_TTL_DAYS = 7

authenticator.options = {
  window: 1,
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`)
  }
  return value
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET
  if (!secret) {
    throw new Error('Admin JWT secret not configured. Set ADMIN_JWT_SECRET in the environment.')
  }
  return new TextEncoder().encode(secret)
}

export function isAdminSecurityEnabled(): boolean {
  return Boolean(process.env.ADMIN_JWT_SECRET && process.env.ADMIN_ACCESS_CODE)
}

export function isTotpRequired(): boolean {
  return Boolean(process.env.ADMIN_TOTP_SECRET)
}

export function validateAccessCode(input: string | undefined | null): boolean {
  if (!process.env.ADMIN_ACCESS_CODE) return false
  return (input ?? '').trim() === process.env.ADMIN_ACCESS_CODE.trim()
}

export function validateTotp(code: string | undefined | null): boolean {
  const secret = process.env.ADMIN_TOTP_SECRET
  if (!secret) return true
  const sanitized = (code ?? '').replace(/\s+/g, '')
  if (sanitized.length < 6) return false
  try {
    return authenticator.check(sanitized, secret)
  } catch {
    return false
  }
}

type SessionOptions = {
  remember?: boolean
  subject?: string
}

type SessionIssueResult = {
  token: string
  maxAge: number
}

export async function issueAdminSession({ remember = false, subject = 'admin' }: SessionOptions = {}): Promise<SessionIssueResult> {
  const now = new Date()
  const expMs = remember
    ? now.getTime() + REMEMBER_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
    : now.getTime() + DEFAULT_SESSION_TTL_HOURS * 60 * 60 * 1000

  const payload: JWTPayload = {
    scope: ADMIN_SCOPE,
    sub: subject,
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(expMs / 1000)
    .sign(getJwtSecret())

  const maxAgeSeconds = Math.round((expMs - now.getTime()) / 1000)
  return { token, maxAge: maxAgeSeconds }
}

type SessionVerification = {
  valid: boolean
  reason?: string
  payload?: JWTPayload
}

export async function verifyAdminSessionToken(token: string | null | undefined): Promise<SessionVerification> {
  if (!token) return { valid: false, reason: 'missing_token' }
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] })
    if (payload.scope !== ADMIN_SCOPE) {
      return { valid: false, reason: 'invalid_scope' }
    }
    return { valid: true, payload }
  } catch (error) {
    return { valid: false, reason: (error as Error)?.message ?? 'invalid_token' }
  }
}

export function adminSessionCookieName(): string {
  return ADMIN_SESSION_COOKIE
}

type CookieOptions = {
  token: string
  maxAge: number
}

export function buildAdminSessionCookie({ token, maxAge }: CookieOptions) {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict' as const,
      path: '/',
      maxAge,
    },
  }
}

export function buildAdminSessionClearCookie() {
  return {
    name: ADMIN_SESSION_COOKIE,
    value: '',
    options: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 0,
    },
  }
}

type AdminRequestValidation = {
  ok: boolean
  reason?: string
  payload?: JWTPayload
}

export async function validateAdminRequest(req: NextRequest): Promise<AdminRequestValidation> {
  if (!isAdminSecurityEnabled()) {
    return { ok: false, reason: 'admin_security_disabled' }
  }
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? null
  const verification = await verifyAdminSessionToken(token)
  return {
    ok: verification.valid,
    reason: verification.reason,
    payload: verification.payload,
  }
}

export function requireAdminEnv() {
  getRequiredEnv('ADMIN_ACCESS_CODE')
  getRequiredEnv('ADMIN_JWT_SECRET')
}