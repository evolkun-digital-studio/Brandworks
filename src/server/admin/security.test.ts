import jwt from 'jsonwebtoken'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('argon2', () => ({ default: { verify: vi.fn(), hash: vi.fn() } }))
vi.mock('../repositories/admin.repository', () => ({}))

import { MIN_JWT_SECRET_LENGTH, requireJwtSecret } from '../config/env'
import { signAdminToken, verifyAdminToken } from './auth'
import { isCrossSiteWrite } from './http'

const SECRET = 'test-only-jwt-secret-for-unit-tests'

const request = (method: string, headers: Record<string, string> = {}) => ({
  method,
  headers: new Headers(headers),
  nextUrl: new URL('https://brandworks.me/api/admin/blogs'),
})

describe('admin CSRF guard', () => {
  it('lets reads through regardless of origin', () => {
    expect(isCrossSiteWrite(request('GET', { 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' }))).toBe(false)
  })

  it('accepts writes from the site itself', () => {
    expect(isCrossSiteWrite(request('POST', { 'sec-fetch-site': 'same-origin', origin: 'https://brandworks.me' }))).toBe(false)
  })

  it('rejects cross-site and same-site (sibling subdomain) writes', () => {
    expect(isCrossSiteWrite(request('POST', { 'sec-fetch-site': 'cross-site' }))).toBe(true)
    expect(isCrossSiteWrite(request('DELETE', { 'sec-fetch-site': 'same-site' }))).toBe(true)
  })

  it('trusts the browser\'s same-origin label even when the app sees an internal URL behind the proxy', () => {
    const behindProxy = { ...request('POST', { 'sec-fetch-site': 'same-origin', origin: 'https://brandworks.me' }), nextUrl: new URL('http://127.0.0.1:3010/api/admin/blogs') }
    expect(isCrossSiteWrite(behindProxy)).toBe(false)
  })

  it('accepts an Origin matching the proxied host when Sec-Fetch-Site is absent', () => {
    const proxied = {
      ...request('POST', { origin: 'https://brandworks.me', 'x-forwarded-host': 'brandworks.me', 'x-forwarded-proto': 'https' }),
      nextUrl: new URL('http://127.0.0.1:3010/api/admin/blogs'),
    }
    expect(isCrossSiteWrite(proxied)).toBe(false)
  })

  it('rejects a foreign Origin when Sec-Fetch-Site is absent', () => {
    expect(isCrossSiteWrite(request('PATCH', { origin: 'https://evil.example' }))).toBe(true)
  })

  it('leaves non-browser clients (no Origin, no Sec-Fetch-Site) to the normal auth check', () => {
    expect(isCrossSiteWrite(request('POST'))).toBe(false)
  })
})

describe('admin JWT', () => {
  beforeEach(() => { process.env.JWT_SECRET = SECRET })

  it('round-trips a token it signed', () => {
    expect(verifyAdminToken(signAdminToken('64b000000000000000000001'))).toEqual({ sub: '64b000000000000000000001' })
  })

  it('rejects a token signed with a different algorithm, even with the right secret', () => {
    const forged = jwt.sign({ sub: 'x' }, SECRET, { algorithm: 'HS512' })
    expect(verifyAdminToken(forged)).toBeNull()
  })

  it('rejects an unsigned (alg: none) token', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const body = Buffer.from(JSON.stringify({ sub: 'x' })).toString('base64url')
    expect(verifyAdminToken(`${header}.${body}.`)).toBeNull()
  })
})

describe('JWT_SECRET policy', () => {
  const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv

  it('requires a long secret in production without echoing it', () => {
    const short = 'short-secret'
    let message = ''
    try { requireJwtSecret(env({ NODE_ENV: 'production', JWT_SECRET: short })) } catch (error) { message = (error as Error).message }
    expect(message).toContain(String(MIN_JWT_SECRET_LENGTH))
    expect(message).not.toContain(short)
  })

  it('accepts a long secret in production and any secret in development', () => {
    expect(requireJwtSecret(env({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(MIN_JWT_SECRET_LENGTH) }))).toHaveLength(MIN_JWT_SECRET_LENGTH)
    expect(requireJwtSecret(env({ NODE_ENV: 'development', JWT_SECRET: 'dev' }))).toBe('dev')
  })
})
