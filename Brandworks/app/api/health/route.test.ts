import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/server/db/client', () => ({ pingDatabase: vi.fn() }))

import { pingDatabase } from '../../../src/server/db/client'
import { GET } from './route'

describe('GET /api/health', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the existing healthy JSON contract', async () => {
    vi.mocked(pingDatabase).mockResolvedValue(true)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(body).toMatchObject({ status: 'ok', server: 'running', mongodb: 'connected' })
    expect(body.timestamp).toEqual(expect.any(String))
    expect(body).not.toHaveProperty('connectionString')
  })

  it('returns 503 JSON when MongoDB is unavailable', async () => {
    vi.mocked(pingDatabase).mockResolvedValue(false)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toMatchObject({ status: 'degraded', server: 'running', mongodb: 'disconnected' })
  })
})
