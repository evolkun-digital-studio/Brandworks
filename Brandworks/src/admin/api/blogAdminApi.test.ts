import { afterEach, describe, expect, it, vi } from 'vitest'
import { scheduleBlogPost, unscheduleBlogPost } from './blogAdminApi'

/**
 * Scoped to the two Phase 14 additions only — no other function in
 * this file has tests yet; adding them is out of scope for this
 * phase. Mocks the real global `fetch` (rather than the
 * `adminApiRequest` wrapper) so the actual request shape — method,
 * path, JSON body — is genuinely exercised, not assumed.
 */

function mockFetchOnce(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('scheduleBlogPost', () => {
  it('PATCHes /blogs/:id/schedule with the given ISO timestamp', async () => {
    const fetchMock = mockFetchOnce({ blog: { id: '1', scheduledAt: '2026-10-01T10:00:00.000Z' } })
    await scheduleBlogPost('1', '2026-10-01T10:00:00.000Z')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/blogs/1/schedule')
    expect(init.method).toBe('PATCH')
    expect(init.credentials).toBe('include')
    expect(JSON.parse(init.body)).toEqual({ scheduledAt: '2026-10-01T10:00:00.000Z' })
  })
})

describe('unscheduleBlogPost', () => {
  it('PATCHes /blogs/:id/unschedule with no body', async () => {
    const fetchMock = mockFetchOnce({ blog: { id: '1', scheduledAt: null } })
    await unscheduleBlogPost('1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/blogs/1/unschedule')
    expect(init.method).toBe('PATCH')
    expect(init.body).toBeUndefined()
  })
})
