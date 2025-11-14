import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'm_auth'
const ENABLED = process.env.MAINTENANCE_ENABLED === '1'
const TOKEN = process.env.MAINTENANCE_TOKEN || ''
const ADMIN_SESSION_COOKIE = 'gmeow_admin_session'
const ADMIN_SCOPE = 'gmeow.admin'

const ADMIN_API_ALLOW_LIST = [/^\/api\/admin\/auth\/(?:login|logout)(?:\/|$)/]

function isAdminSecurityEnabled() {
  return Boolean(process.env.ADMIN_JWT_SECRET && process.env.ADMIN_ACCESS_CODE)
}

function shouldProtectAdminRoute(pathname: string) {
  if (!pathname) return false
  if (pathname.startsWith('/admin/login')) return false
  const protectedPage = /^\/admin(?:\/|$)/.test(pathname)
  const protectedApi = /^\/api\/admin\//.test(pathname) && !ADMIN_API_ALLOW_LIST.some((re) => re.test(pathname))
  return protectedPage || protectedApi
}

function getJwtSecret() {
  const secret = process.env.ADMIN_JWT_SECRET
  if (!secret) {
    throw new Error('ADMIN_JWT_SECRET missing while admin security is enabled')
  }
  return new TextEncoder().encode(secret)
}

async function verifyAdminToken(token: string | undefined | null) {
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] })
    return payload.scope === ADMIN_SCOPE
  } catch {
    return false
  }
}

async function enforceAdminSecurity(req: NextRequest) {
  if (!isAdminSecurityEnabled()) return null

  const { pathname } = req.nextUrl
  if (!shouldProtectAdminRoute(pathname)) return null

  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value
  const valid = await verifyAdminToken(token)
  if (valid) return null

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'admin_auth_required' }, { status: 401 })
  }

  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = '/admin/login'
  loginUrl.search = `?next=${encodeURIComponent(req.nextUrl.href)}`
  return NextResponse.redirect(loginUrl)
}

export async function middleware(req: NextRequest) {
  const adminEnforcement = await enforceAdminSecurity(req)
  if (adminEnforcement) return adminEnforcement

  if (!ENABLED) return NextResponse.next()

  const { pathname, href } = req.nextUrl

  // Allow the maintenance page, auth API, and common public assets
  const allow = [
    /^\/maintenance(?:\/|$)/,
    /^\/api\/maintenance\/auth(?:\/|$)/,
    /^\/admin\/login(?:\/|$)/,
    /^\/api\/admin\/auth\//,
    /^\/_next\//,
    /^\/favicon\.ico$/,
    /^\/robots\.txt$/,
    /^\/sitemap\.xml$/,
    /^\/images\//,
    /^\/assets\//,
    /^\/public\//,
  ].some((re) => re.test(pathname))

  if (allow) return NextResponse.next()

  const hasToken = req.cookies.get(COOKIE_NAME)?.value === TOKEN
  if (hasToken) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/maintenance'
  url.search = `?next=${encodeURIComponent(href)}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: '/:path*',
}