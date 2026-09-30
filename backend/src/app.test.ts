import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { once } from 'node:events'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp } from './app.js'
import { allowedOrigins } from './config/env.js'

/**
 * Exercises the assembled Express app over real HTTP (an ephemeral
 * port, Node's own fetch) — the production-facing behavior that lives
 * in how app.ts wires things together rather than in any one module:
 * security headers, CORS, body limits and the shape of every error a
 * client can see. No MongoDB connection is opened, which is itself
 * useful: any route that reaches for the database throws internally,
 * giving a real unexpected error to check the 500 path against.
 */

let server: Server
let baseUrl: string

beforeAll(async () => {
  server = createApp().listen(0)
  await once(server, 'listening')
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  server.close()
  await once(server, 'close')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/health', () => {
  it('reports degraded with a 503 when MongoDB is unreachable', async () => {
    const res = await fetch(`${baseUrl}/api/health`)
    expect(res.status).toBe(503)
    const body = (await res.json()) as Record<string, unknown>
    expect(body.status).toBe('degraded')
    expect(body.mongodb).toBe('disconnected')
  })

  it('identifies the running build without exposing configuration', async () => {
    const res = await fetch(`${baseUrl}/api/health`)
    const body = (await res.json()) as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(
      ['commit', 'environment', 'mongodb', 'server', 'status', 'timestamp', 'uptime'].sort(),
    )
    expect(typeof body.commit).toBe('string')
    expect(typeof body.uptime).toBe('number')
  })
})

describe('security headers', () => {
  it('sends helmet defaults and hides the framework', async () => {
    const res = await fetch(`${baseUrl}/api/health`)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('strict-transport-security')).toContain('max-age=')
    expect(res.headers.get('x-powered-by')).toBeNull()
  })

  it('lets the frontend origin read responses cross-origin', async () => {
    const res = await fetch(`${baseUrl}/api/health`)
    expect(res.headers.get('cross-origin-resource-policy')).toBe('cross-origin')
  })
})

describe('CORS', () => {
  it('allows a configured frontend origin, with credentials', async () => {
    const origin = allowedOrigins[0]
    const res = await fetch(`${baseUrl}/api/health`, { headers: { Origin: origin } })
    expect(res.headers.get('access-control-allow-origin')).toBe(origin)
    expect(res.headers.get('access-control-allow-credentials')).toBe('true')
  })

  it('rejects any other origin with a 403, never a wildcard', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const res = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'https://evil.example' } })
    expect(res.status).toBe(403)
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
    expect(await res.json()).toEqual({ error: 'This origin is not allowed to access the API.' })
    // An expected client error — must not be logged as a server fault.
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

describe('error responses', () => {
  it('returns JSON 404 for an unknown route', async () => {
    const res = await fetch(`${baseUrl}/api/does-not-exist`)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found' })
  })

  it('returns 400 for a malformed JSON body without echoing it back', async () => {
    const res = await fetch(`${baseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"username": "admin", "password": "hunter2"',
    })
    expect(res.status).toBe(400)
    const text = await res.text()
    expect(JSON.parse(text)).toEqual({ error: 'Request body is not valid JSON.' })
    expect(text).not.toContain('hunter2')
  })

  it('returns 413 for a body over the limit', async () => {
    const res = await fetch(`${baseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'a', password: 'x'.repeat(1_100_000) }),
    })
    expect(res.status).toBe(413)
    expect(await res.json()).toEqual({ error: 'Request body is too large.' })
  })

  it('hides the details of an unexpected error from the client and logs them server-side', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    // No database connection in this test process, so the repository
    // layer throws — a genuine unhandled error, not a simulated one.
    const res = await fetch(`${baseUrl}/api/blogs`)
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(JSON.parse(text)).toEqual({ error: 'Something went wrong. Please try again.' })
    expect(text).not.toMatch(/mongo|stack|\.ts|\.js|at /i)

    const logged = errorSpy.mock.calls.flat().join(' ')
    expect(logged).toContain('ERROR')
    expect(logged).toContain('GET /api/blogs')
    expect(logged).toContain('MongoDB is not connected yet')
  })
})
