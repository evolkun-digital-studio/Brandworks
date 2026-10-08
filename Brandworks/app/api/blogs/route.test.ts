import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../../../src/server/services/public-blog.service', () => ({
  listPublicBlogs: vi.fn(),
}))

import { listPublicBlogs } from '../../../src/server/services/public-blog.service'
import { GET } from './route'

describe('GET /api/blogs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns JSON with the existing public cache header and pagination shape', async () => {
    const result = { items: [], page: 1, limit: 9, total: 0, totalPages: 0 }
    vi.mocked(listPublicBlogs).mockResolvedValue(result)

    const response = await GET(new Request('http://localhost/api/blogs?page=1&limit=9'))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(response.headers.get('cache-control')).toBe('public, max-age=60')
    expect(await response.json()).toEqual(result)
    expect(listPublicBlogs).toHaveBeenCalledWith(new URLSearchParams('page=1&limit=9'))
  })
})
