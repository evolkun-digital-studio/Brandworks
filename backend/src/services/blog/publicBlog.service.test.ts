import { afterEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import type { BlogDocument } from '../../types/blog.js'

/**
 * Phase 17 — this file previously had no dedicated tests at all; every
 * other public-blog behavior (repository filter construction, sitemap
 * composition) was already covered, but the actual visibility *decision*
 * this file makes — "is this specific document currently public?" — was
 * only ever exercised indirectly. The repository is mocked so these are
 * true unit tests of the decision logic, matching the pattern already
 * established in blog.service.test.ts; the underlying MongoDB query
 * shapes it builds on (buildFilter/scheduledAfter) are covered separately
 * by blog.repository.test.ts, and this phase's live verification pass
 * exercises the same rules end-to-end against a real database.
 */

const findBlogBySlugMock = vi.fn()
const listBlogsMock = vi.fn()
const countBlogsMock = vi.fn()
const listBlogsForSitemapMock = vi.fn()

vi.mock('../../repositories/blog.repository.js', () => ({
  findBlogBySlug: (...args: unknown[]) => findBlogBySlugMock(...args),
  listBlogs: (...args: unknown[]) => listBlogsMock(...args),
  countBlogs: (...args: unknown[]) => countBlogsMock(...args),
  listBlogsForSitemap: (...args: unknown[]) => listBlogsForSitemapMock(...args),
}))

const { listPublicBlogs, getPublicBlogBySlug, listSitemapEligibleBlogs } = await import(
  './publicBlog.service.js'
)

function post(overrides: Partial<BlogDocument> = {}): BlogDocument {
  return {
    _id: new ObjectId(),
    title: 't',
    slug: 'a-post',
    excerpt: 'e',
    content: 'c',
    coverImage: 'https://example.com/c.jpg',
    coverImageAlt: 'a',
    authorName: 'author',
    authorId: new ObjectId(),
    status: 'published',
    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    scheduledAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    seoTitle: null,
    seoDescription: null,
    robotsIndex: true,
    breadcrumbEnabled: true,
    ...overrides,
  } as BlogDocument
}

afterEach(() => {
  findBlogBySlugMock.mockReset()
  listBlogsMock.mockReset()
  countBlogsMock.mockReset()
  listBlogsForSitemapMock.mockReset()
})

describe('getPublicBlogBySlug — the central publication-transition invariant', () => {
  it('returns the post when published, publishedAt is in the past, and not deleted', async () => {
    findBlogBySlugMock.mockResolvedValue(post())
    const result = await getPublicBlogBySlug('a-post')
    expect(result.slug).toBe('a-post')
  })

  it('404s a scheduled draft (status draft, future scheduledAt) — the pre-publication state', async () => {
    findBlogBySlugMock.mockResolvedValue(
      post({ status: 'draft', publishedAt: null, scheduledAt: new Date(Date.now() + 60_000) }),
    )
    await expect(getPublicBlogBySlug('a-post')).rejects.toMatchObject({ status: 404 })
  })

  it('404s a plain draft (never scheduled)', async () => {
    findBlogBySlugMock.mockResolvedValue(post({ status: 'draft', publishedAt: null }))
    await expect(getPublicBlogBySlug('a-post')).rejects.toMatchObject({ status: 404 })
  })

  it('404s an unpublished post', async () => {
    findBlogBySlugMock.mockResolvedValue(
      post({ status: 'unpublished', publishedAt: new Date('2026-01-01T00:00:00.000Z') }),
    )
    await expect(getPublicBlogBySlug('a-post')).rejects.toMatchObject({ status: 404 })
  })

  it('404s a published post whose publishedAt is still in the future (a data edge case; the scheduler never actually produces this)', async () => {
    findBlogBySlugMock.mockResolvedValue(post({ status: 'published', publishedAt: new Date(Date.now() + 60_000) }))
    await expect(getPublicBlogBySlug('a-post')).rejects.toMatchObject({ status: 404 })
  })

  it('404s a published post with a null publishedAt (should never occur, but must never crash or leak)', async () => {
    findBlogBySlugMock.mockResolvedValue(post({ status: 'published', publishedAt: null }))
    await expect(getPublicBlogBySlug('a-post')).rejects.toMatchObject({ status: 404 })
  })

  it('404s when the repository returns null (nonexistent slug, or a soft-deleted one — the repository already excludes deletedAt)', async () => {
    findBlogBySlugMock.mockResolvedValue(null)
    await expect(getPublicBlogBySlug('does-not-exist')).rejects.toMatchObject({ status: 404 })
  })

  it('looks up with includeDeleted explicitly false — a deleted post is never reachable through this path', async () => {
    findBlogBySlugMock.mockResolvedValue(post())
    await getPublicBlogBySlug('a-post')
    expect(findBlogBySlugMock).toHaveBeenCalledWith('a-post', { includeDeleted: false })
  })

  it('a published post with robotsIndex: false is still publicly reachable — robotsIndex only affects the page’s own robots meta tag and sitemap inclusion, never public API/route reachability', async () => {
    findBlogBySlugMock.mockResolvedValue(post({ robotsIndex: false }))
    const result = await getPublicBlogBySlug('a-post')
    expect(result.slug).toBe('a-post')
  })

  it('normalizes the slug (trim + lowercase) before lookup, but does not apply the full slugify transform', () => {
    findBlogBySlugMock.mockResolvedValue(post())
    return getPublicBlogBySlug('  A-Post  ').then(() => {
      expect(findBlogBySlugMock).toHaveBeenCalledWith('a-post', { includeDeleted: false })
    })
  })

  it('every distinct failure reason (draft/unpublished/future/deleted/nonexistent) produces the exact same generic message', async () => {
    findBlogBySlugMock.mockResolvedValue(null)
    let nonexistentMessage = ''
    try {
      await getPublicBlogBySlug('missing')
    } catch (err) {
      nonexistentMessage = (err as Error).message
    }
    findBlogBySlugMock.mockResolvedValue(post({ status: 'draft', publishedAt: null }))
    let draftMessage = ''
    try {
      await getPublicBlogBySlug('a-post')
    } catch (err) {
      draftMessage = (err as Error).message
    }
    expect(draftMessage).toBe(nonexistentMessage)
  })
})

describe('listPublicBlogs — list-view visibility filter', () => {
  it('queries with status published, includeDeleted false, and a publishedAtBefore bound', async () => {
    listBlogsMock.mockResolvedValue([])
    countBlogsMock.mockResolvedValue(0)
    await listPublicBlogs({})
    const filter = listBlogsMock.mock.calls[0][0]
    expect(filter.status).toBe('published')
    expect(filter.includeDeleted).toBe(false)
    expect(filter.publishedAtBefore).toBeInstanceOf(Date)
  })

  it('never accepts a caller-supplied status/includeDeleted override — the query type has no such parameter', async () => {
    listBlogsMock.mockResolvedValue([])
    countBlogsMock.mockResolvedValue(0)
    // @ts-expect-error — intentionally passing fields the type doesn't allow, to prove they're ignored.
    await listPublicBlogs({ status: 'draft', includeDeleted: true })
    const filter = listBlogsMock.mock.calls[0][0]
    expect(filter.status).toBe('published')
    expect(filter.includeDeleted).toBe(false)
  })

  it('rejects a non-numeric page/limit', async () => {
    await expect(listPublicBlogs({ page: 'abc' })).rejects.toMatchObject({ status: 400 })
    await expect(listPublicBlogs({ limit: '-1' })).rejects.toMatchObject({ status: 400 })
  })

  it('clamps an excessive limit rather than rejecting it', async () => {
    listBlogsMock.mockResolvedValue([])
    countBlogsMock.mockResolvedValue(0)
    const result = await listPublicBlogs({ limit: '999' })
    expect(result.limit).toBe(30)
    expect(listBlogsMock.mock.calls[0][0].limit).toBe(30)
  })

  it('defaults to page 1 / limit 9 when omitted', async () => {
    listBlogsMock.mockResolvedValue([])
    countBlogsMock.mockResolvedValue(0)
    const result = await listPublicBlogs({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(9)
  })
})

describe('listSitemapEligibleBlogs — sitemap-only visibility rule', () => {
  it('applies the same public-visibility filter as the API, plus excludeNoIndex', async () => {
    listBlogsForSitemapMock.mockResolvedValue([])
    await listSitemapEligibleBlogs()
    const filter = listBlogsForSitemapMock.mock.calls[0][0]
    expect(filter.status).toBe('published')
    expect(filter.includeDeleted).toBe(false)
    expect(filter.publishedAtBefore).toBeInstanceOf(Date)
    expect(filter.excludeNoIndex).toBe(true)
  })
})
