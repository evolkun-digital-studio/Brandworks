import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { errorResponse, forbidden, unauthorized, badRequest } from '../http/errors'
import { getActiveAdmin, verifyAdminToken } from './auth'
import { rateLimitKey } from '../http/clientIp'
import { resolvePublicOrigin } from '../config/env'
import type { AdminDocument } from './types'

const COOKIE = 'admin_session'
const WINDOW_MS = 15 * 60 * 1000
const LIMIT = 10
type LimiterGlobal = typeof globalThis & { __brandworksLoginAttempts?: Map<string, number[]> }
const state = globalThis as LimiterGlobal
const attempts = state.__brandworksLoginAttempts ?? (state.__brandworksLoginAttempts = new Map())

/** Drop buckets with no attempt inside the window once the map grows, so it cannot grow without bound. */
const SWEEP_AT = 1000
function sweep(now: number) {
  if (attempts.size < SWEEP_AT) return
  for (const [key, times] of attempts) if (!times.some((t) => now - t < WINDOW_MS)) attempts.delete(key)
}

/**
 * Matches the source Express limiter's per-process 10/15-minute policy.
 * Keyed by the proxy-aware client address (src/server/http/clientIp.ts): a
 * forged X-Forwarded-For or X-Real-IP header cannot reset or dodge the limit.
 */
export function checkLoginRateLimit(request: Pick<Request, 'headers'>, now = Date.now()): Response | null {
  sweep(now)
  const key = rateLimitKey(request)
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

/**
 * CSRF guard for cookie-authenticated writes. SameSite=Lax keeps the session
 * cookie off cross-site POSTs, but not off same-site ones (another app on a
 * brandworks.me subdomain), so writes also have to prove they came from this
 * origin.
 *
 * Browsers label requests with Sec-Fetch-Site, which page scripts cannot
 * forge: only 'same-origin' (or 'none', user-initiated) is accepted. Without
 * it (older browsers) the Origin must equal PUBLIC_ORIGIN or the URL the app
 * was addressed by. Origins rebuilt from X-Forwarded-Host/-Proto are NOT
 * accepted: those are request headers anyone can send. Requests carrying
 * neither header are not browser CSRF (curl, jobs) and fall through to the
 * normal session check.
 */
export function isCrossSiteWrite(request: Pick<Request, 'method' | 'headers'> & { nextUrl: Pick<URL, 'origin'> }): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return false
  const site = request.headers.get('sec-fetch-site')
  if (site) return site !== 'same-origin' && site !== 'none'
  const origin = request.headers.get('origin')
  if (!origin) return false
  return origin !== configuredOrigin() && origin !== request.nextUrl.origin
}

export function crossSiteRejected(): Response {
  return errorResponse(forbidden('Cross-site request rejected.'))
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
