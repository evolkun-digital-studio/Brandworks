import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('argon2', () => ({ default: { verify: vi.fn(), hash: vi.fn() } }))
vi.mock('../repositories/admin.repository', () => ({}))
const loginAdmin = vi.fn()
vi.mock('./auth', async (importOriginal) => ({ ...(await importOriginal<typeof import('./auth')>()), loginAdmin: (...args: unknown[]) => loginAdmin(...args) }))

import { MIN_JWT_SECRET_LENGTH, requireJwtSecret } from '../config/env'
import { signAdminToken, verifyAdminToken } from './auth'
import { checkLoginRateLimit, isCrossSiteWrite, withAdmin } from './http'
import { POST as login } from '../../../app/api/admin/auth/login/route'
import { POST as logout } from '../../../app/api/admin/auth/logout/route'

const SECRET = 'test-only-jwt-secret-for-unit-tests'
const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv

const guardRequest = (method: string, headers: Record<string, string> = {}, url = 'https://brandworks.me/api/admin/blogs') => ({
  method,
  headers: new Headers(headers),
  nextUrl: new URL(url),
})

beforeEach(() => {
  vi.stubEnv('PUBLIC_ORIGIN', 'https://brandworks.me')
  vi.stubEnv('JWT_SECRET', SECRET)
  loginAdmin.mockReset()
})
afterEach(() => vi.unstubAllEnvs())

describe('admin CSRF guard', () => {
  it('lets reads through regardless of origin', () => {
    expect(isCrossSiteWrite(guardRequest('GET', { 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' }))).toBe(false)
  })

  it('accepts writes the browser labels same-origin, even when the app sees an internal URL behind the proxy', () => {
    expect(isCrossSiteWrite(guardRequest('POST', { 'sec-fetch-site': 'same-origin', origin: 'https://brandworks.me' }))).toBe(false)
    expect(isCrossSiteWrite(guardRequest('POST', { 'sec-fetch-site': 'same-origin' }, 'http://127.0.0.1:3000/api/admin/blogs'))).toBe(false)
  })

  it('rejects cross-site and same-site (sibling subdomain) writes', () => {
    expect(isCrossSiteWrite(guardRequest('POST', { 'sec-fetch-site': 'cross-site' }))).toBe(true)
    expect(isCrossSiteWrite(guardRequest('DELETE', { 'sec-fetch-site': 'same-site', origin: 'https://shop.brandworks.me' }))).toBe(true)
  })

  it('without Sec-Fetch-Site, accepts only an Origin equal to PUBLIC_ORIGIN or the addressed URL', () => {
    expect(isCrossSiteWrite(guardRequest('POST', { origin: 'https://brandworks.me' }, 'http://127.0.0.1:3000/x'))).toBe(false)
    expect(isCrossSiteWrite(guardRequest('POST', { origin: 'http://localhost:3000' }, 'http://localhost:3000/x'))).toBe(false)
    expect(isCrossSiteWrite(guardRequest('PATCH', { origin: 'https://evil.example' }))).toBe(true)
  })

  it('does not trust an Origin "confirmed" by forged X-Forwarded-Host / X-Forwarded-Proto headers', () => {
    const forged = guardRequest('POST', {
      origin: 'https://evil.example',
      'x-forwarded-host': 'evil.example',
      'x-forwarded-proto': 'https',
    }, 'http://127.0.0.1:3000/api/admin/blogs')
    expect(isCrossSiteWrite(forged)).toBe(true)
  })

  it('leaves non-browser clients (no Origin, no Sec-Fetch-Site) to the normal session check', () => {
    expect(isCrossSiteWrite(guardRequest('POST'))).toBe(false)
  })

  it('withAdmin rejects a cross-site write before looking at the session', async () => {
    const handler = vi.fn()
    const request = new NextRequest('https://brandworks.me/api/admin/blogs', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'cross-site', cookie: `admin_session=${signAdminToken('64b000000000000000000001')}` },
    })
    const response = await withAdmin(request, handler)
    expect(response.status).toBe(403)
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('login and logout routes', () => {
  const loginRequest = (headers: Record<string, string>) => new NextRequest('https://brandworks.me/api/admin/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ username: 'admin', password: 'irrelevant1' }),
  })

  it('rejects a cross-site login attempt without trying the credentials', async () => {
    const response = await login(loginRequest({ 'sec-fetch-site': 'cross-site', 'x-forwarded-for': '198.51.100.20' }))
    expect(response.status).toBe(403)
    expect(loginAdmin).not.toHaveBeenCalled()
  })

  it('rejects a cross-site logout and sets no cookie', async () => {
    const response = await logout(new NextRequest('https://brandworks.me/api/admin/auth/logout', { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } }))
    expect(response.status).toBe(403)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('still logs out a same-origin request', async () => {
    const response = await logout(new NextRequest('https://brandworks.me/api/admin/auth/logout', { method: 'POST', headers: { 'sec-fetch-site': 'same-origin' } }))
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('admin_session=;')
  })
})

describe('login rate limit cannot be dodged with forged forwarding headers', () => {
  const attempt = (headers: Record<string, string>, now: number) => checkLoginRateLimit({ headers: new Headers(headers) }, now)

  it('behind one trusted appending proxy, a fresh fake first X-Forwarded-For entry does not reset the limit', () => {
    vi.stubEnv('TRUSTED_PROXY_HOPS', '1')
    const now = 1_000_000
    for (let i = 0; i < 10; i++) expect(attempt({ 'x-forwarded-for': `10.0.0.${i}, 203.0.113.50` }, now + i)).toBeNull()
    const blocked = attempt({ 'x-forwarded-for': '10.0.0.99, 203.0.113.50', 'x-real-ip': '10.0.0.100' }, now + 20)
    expect(blocked?.status).toBe(429)
    // A different real client is unaffected.
    expect(attempt({ 'x-forwarded-for': '10.0.0.99, 203.0.113.51' }, now + 21)).toBeNull()
  })

  it('with no trusted proxy configured, forwarding headers cannot create fresh buckets at all', () => {
    vi.stubEnv('TRUSTED_PROXY_HOPS', '')
    const now = 50_000_000
    for (let i = 0; i < 10; i++) expect(attempt({ 'x-forwarded-for': `192.0.2.${i}`, 'x-real-ip': `192.0.2.${i}` }, now + i)).toBeNull()
    expect(attempt({ 'x-forwarded-for': '192.0.2.200', 'x-real-ip': '192.0.2.201' }, now + 20)?.status).toBe(429)
  })
})

describe('admin JWT', () => {
  it('round-trips a token it signed', () => {
    expect(verifyAdminToken(signAdminToken('64b000000000000000000001'))).toEqual({ sub: '64b000000000000000000001' })
  })

  it('signs with HS256', () => {
    expect(jwt.decode(signAdminToken('x'), { complete: true })?.header.alg).toBe('HS256')
  })

  it('rejects a token signed with a different algorithm, even with the right secret', () => {
    expect(verifyAdminToken(jwt.sign({ sub: 'x' }, SECRET, { algorithm: 'HS512' }))).toBeNull()
  })

  it('rejects an unsigned (alg: none) token', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const body = Buffer.from(JSON.stringify({ sub: 'x' })).toString('base64url')
    expect(verifyAdminToken(`${header}.${body}.`)).toBeNull()
  })

  it('rejects a token signed with another secret', () => {
    expect(verifyAdminToken(jwt.sign({ sub: 'x' }, 'some-other-secret', { algorithm: 'HS256' }))).toBeNull()
  })
})

describe('JWT_SECRET policy', () => {
  it('requires a long secret in production without echoing it', () => {
    const short = 'short-secret'
    let message = ''
    try { requireJwtSecret(env({ NODE_ENV: 'production', JWT_SECRET: short })) } catch (error) { message = (error as Error).message }
    expect(message).toContain(String(MIN_JWT_SECRET_LENGTH))
    expect(message).not.toContain(short)
  })

  it('rejects a missing or whitespace-only secret everywhere', () => {
    expect(() => requireJwtSecret(env({ NODE_ENV: 'development' }))).toThrow(/required/)
    expect(() => requireJwtSecret(env({ NODE_ENV: 'production', JWT_SECRET: '   ' }))).toThrow(/required/)
  })

  it('accepts a long secret in production and any non-empty secret in development', () => {
    expect(requireJwtSecret(env({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(MIN_JWT_SECRET_LENGTH) }))).toHaveLength(MIN_JWT_SECRET_LENGTH)
    expect(requireJwtSecret(env({ NODE_ENV: 'development', JWT_SECRET: 'dev' }))).toBe('dev')
  })
})
