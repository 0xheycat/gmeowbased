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
  try {
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
  } catch (error) {
    console.error('Admin security check failed:', error)
    // If admin security fails, allow the request to proceed
    return null
  }
}

export async function middleware(req: NextRequest) {
  try {
    // Early return for static assets that somehow pass the matcher
    const pathname = req.nextUrl?.pathname
    if (!pathname || pathname.startsWith('/_next/') || pathname.includes('.')) {
      return NextResponse.next()
    }

    const adminEnforcement = await enforceAdminSecurity(req)
    if (adminEnforcement) return adminEnforcement

    if (!ENABLED) return NextResponse.next()

    const { href } = req.nextUrl

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
      /^\/.well-known\//,
      /^\/api\/manifest(?:\/|$)/,
    ].some((re) => re.test(pathname))

    if (allow) return NextResponse.next()

    const hasToken = req.cookies.get(COOKIE_NAME)?.value === TOKEN
    if (hasToken) return NextResponse.next()

    const url = req.nextUrl.clone()
    url.pathname = '/maintenance'
    url.search = `?next=${encodeURIComponent(href)}`
    return NextResponse.redirect(url)
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, allow the request through to avoid blocking the entire site
    return NextResponse.next()
  }
}

export const config = {
  runtime: 'nodejs',
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * - .well-known (for manifests)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}