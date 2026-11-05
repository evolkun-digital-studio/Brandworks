import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { errorResponse, forbidden, unauthorized, badRequest } from '../http/errors'
import { getActiveAdmin, verifyAdminToken } from './auth'
import { clientIp } from '../http/clientIp'
import { resolvePublicOrigin } from '../config/env'
import type { AdminDocument } from './types'

const COOKIE = 'admin_session'
const WINDOW_MS = 15 * 60 * 1000
const LIMIT = 10
type LimiterGlobal = typeof globalThis & { __brandworksLoginAttempts?: Map<string, number[]> }
const state = globalThis as LimiterGlobal
const attempts = state.__brandworksLoginAttempts ?? (state.__brandworksLoginAttempts = new Map())

/** Proxy-aware: a spoofed first X-Forwarded-For entry cannot reset the limit. */
function requestIp(request: NextRequest) {
  return clientIp(request)
}

/** Matches the source Express limiter's per-process 10/15-minute policy. */
export function checkLoginRateLimit(request: NextRequest): Response | null {
  const now = Date.now(); const key = requestIp(request)
  const recent = (attempts.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS)
  if (recent.length >= LIMIT) {
    attempts.set(key,recent)
    const retrySeconds = Math.max(1,Math.ceil((WINDOW_MS-(now-recent[0]))/1000))
    return NextResponse.json({error:'Too many login attempts. Please try again later.'},{status:429,headers:{'Retry-After':String(retrySeconds),'RateLimit-Policy':`${LIMIT};w=${Math.ceil(WINDOW_MS/1000)}`,'RateLimit':`limit=${LIMIT}, remaining=0, reset=${retrySeconds}`}})
  }
  recent.push(now); attempts.set(key,recent)
  return null
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown
  try { body = await request.json() } catch { throw badRequest('Invalid JSON body.') }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Invalid request body.')
  return body as Record<string,unknown>
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function configuredOrigin(): string | null {
  try { return resolvePublicOrigin() } catch { return null }
}

/** The origin the browser used, as seen through the reverse proxy. */
function forwardedOrigin(headers: Headers): string | null {
  const host = headers.get('x-forwarded-host')?.split(',')[0]?.trim() || headers.get('host')?.trim()
  if (!host) return null
  const proto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'http'
  return `${proto}://${host}`
}

/**
 * CSRF guard for cookie-authenticated writes. SameSite=Lax already keeps the
 * session cookie off cross-site POSTs, but not off *same-site* ones (another
 * app on a brandworks.me subdomain).
 *
 * Modern browsers label every request with Sec-Fetch-Site, which page scripts
 * cannot forge: only 'same-origin' (or 'none', a typed URL) is accepted.
 * Without that header (older browsers) the Origin must match this site, as
 * configured (PUBLIC_ORIGIN) or as reached through the proxy. Requests with
 * neither header (curl, server jobs) are not browser CSRF and fall through to
 * the normal session check.
 */
export function isCrossSiteWrite(request: Pick<NextRequest, 'method' | 'headers' | 'nextUrl'>): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return false
  const site = request.headers.get('sec-fetch-site')
  if (site) return site !== 'same-origin' && site !== 'none'
  const origin = request.headers.get('origin')
  if (!origin) return false
  return origin !== configuredOrigin()
    && origin !== forwardedOrigin(request.headers)
    && origin !== request.nextUrl.origin
}

export async function withAdmin(
  request: NextRequest,
  handler: (admin: AdminDocument) => Promise<Response>,
): Promise<Response> {
  try {
    if (isCrossSiteWrite(request)) throw forbidden('Cross-site request rejected.')
    const token = request.cookies.get(COOKIE)?.value
    if (!token) throw unauthorized()
    const payload = verifyAdminToken(token)
    if (!payload) throw unauthorized('Session expired. Please log in again.')
    const admin = await getActiveAdmin(payload.sub)
    if (!admin) throw unauthorized('Session expired. Please log in again.')
    return await handler(admin)
  } catch (error) { return errorResponse(error) }
}

export function requireAdminRole(admin: AdminDocument) {
  if (admin.role !== 'admin') throw forbidden('Only admins can perform this action.')
}

export function json(body: unknown, status = 200) {
  return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}})
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:8*60*60})
  return response
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0,expires:new Date(0)})
  return response
}
