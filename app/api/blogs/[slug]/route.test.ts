import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../../../../src/server/services/public-blog.service', () => ({
  getPublicBlogBySlug: vi.fn(),
}))

import { getPublicBlogBySlug } from '../../../../src/server/services/public-blog.service'
import { notFound } from '../../../../src/server/http/errors'
import { GET } from './route'

describe('GET /api/blogs/[slug]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns `{ blog }` and the public cache header', async () => {
    const blog = { id: '1', slug: 'an-article' }
    vi.mocked(getPublicBlogBySlug).mockResolvedValue(blog as never)

    const response = await GET(
      new Request('http://localhost/api/blogs/an-article'),
      { params: Promise.resolve({ slug: 'an-article' }) },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('public, max-age=60')
    expect(await response.json()).toEqual({ blog })
  })

  it('maps hidden and absent article errors to the existing JSON 404 contract', async () => {
    vi.mocked(getPublicBlogBySlug).mockRejectedValue(notFound('Blog post not found.'))

    const response = await GET(
      new Request('http://localhost/api/blogs/hidden'),
      { params: Promise.resolve({ slug: 'hidden' }) },
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Blog post not found.' })
  })
})
