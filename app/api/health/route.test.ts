import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/server/db/client', () => ({ pingDatabase: vi.fn() }))
vi.mock('../../../src/server/config/env', () => ({ resolvePublicOrigin: vi.fn(() => 'https://site.example.test') }))

import { pingDatabase } from '../../../src/server/db/client'
import { resolvePublicOrigin } from '../../../src/server/config/env'
import { GET, HEAD } from './route'

describe('GET /api/health', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.useRealTimers())

  it('returns the existing healthy JSON contract', async () => {
    vi.mocked(pingDatabase).mockResolvedValue(true)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(body).toMatchObject({ status: 'ok', server: 'running', mongodb: 'connected', publicOrigin: 'configured' })
    expect(body.timestamp).toEqual(expect.any(String))
    expect(body).not.toHaveProperty('connectionString')
  })

  it('is never cached', async () => {
    vi.mocked(pingDatabase).mockResolvedValue(true)
    expect((await GET()).headers.get('cache-control')).toBe('no-store, max-age=0')
  })

  it('returns 503 JSON when MongoDB is unavailable', async () => {
    vi.mocked(pingDatabase).mockResolvedValue(false)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toMatchObject({ status: 'degraded', server: 'running', mongodb: 'disconnected' })
  })

  it('fails fast with 503 when MongoDB hangs', async () => {
    vi.useFakeTimers()
    vi.mocked(pingDatabase).mockReturnValue(new Promise<boolean>(() => {}))

    const pending = GET()
    await vi.advanceTimersByTimeAsync(3000)
    const response = await pending

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ mongodb: 'disconnected' })
  })

  it('returns 503 when PUBLIC_ORIGIN is missing, since sitemap and robots depend on it', async () => {
    vi.mocked(pingDatabase).mockResolvedValue(true)
    vi.mocked(resolvePublicOrigin).mockImplementationOnce(() => {
      throw new Error('PUBLIC_ORIGIN is required in production.')
    })

    const response = await GET()

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ status: 'degraded', publicOrigin: 'missing-or-invalid' })
  })
})

describe('HEAD /api/health', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mirrors the GET status with an empty body', async () => {
    vi.mocked(pingDatabase).mockResolvedValue(true)
    const ok = await HEAD()
    expect(ok.status).toBe(200)
    expect(await ok.text()).toBe('')

    vi.mocked(pingDatabase).mockResolvedValue(false)
    expect((await HEAD()).status).toBe(503)
  })
})
