import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../repositories/blog.repository', () => ({
  countPublicBlogDocuments: vi.fn(),
  findBlogBySlug: vi.fn(),
  listPublicBlogDocuments: vi.fn(),
}))

import { countPublicBlogDocuments, findBlogBySlug, listPublicBlogDocuments } from '../repositories/blog.repository'
import { getPublicBlogBySlug, getPublicBlogPage, listPublicBlogs } from './public-blog.service'
import type { BlogDocument } from '../types/blog'
import { ObjectId } from 'mongodb'

const publishedAt = new Date('2025-01-01T00:00:00.000Z')

function document(overrides: Partial<BlogDocument> = {}): BlogDocument {
  return {
    _id: new ObjectId('64b000000000000000000001'),
    title: 'Published article',
    slug: 'published-article',
    excerpt: 'Excerpt',
    content: 'Content',
    coverImage: 'https://cdn.example.test/cover.jpg',
    coverImageAlt: 'Cover',
    authorName: 'Editor',
    status: 'published',
    publishedAt,
    updatedAt: publishedAt,
    deletedAt: null,
    seoTitle: null,
    seoDescription: null,
    ...overrides,
  }
}

describe('public blog service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the established pagination and list-item response shape', async () => {
    vi.mocked(listPublicBlogDocuments).mockResolvedValue([document()])
    vi.mocked(countPublicBlogDocuments).mockResolvedValue(1)

    const result = await listPublicBlogs(new URLSearchParams())

    expect(result).toEqual({
      items: [{
        id: '64b000000000000000000001',
        title: 'Published article',
        slug: 'published-article',
        excerpt: 'Excerpt',
        coverImage: 'https://cdn.example.test/cover.jpg',
        coverImageAlt: 'Cover',
        authorName: 'Editor',
        publishedAt: publishedAt.toISOString(),
      }],
      page: 1,
      limit: 9,
      total: 1,
      totalPages: 1,
    })
    expect(listPublicBlogDocuments).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, limit: 9 }))
  })

  it('passes the publication cutoff, page offset, and requested ordering inputs to data access', async () => {
    vi.mocked(listPublicBlogDocuments).mockResolvedValue([])
    vi.mocked(countPublicBlogDocuments).mockResolvedValue(0)

    await listPublicBlogs(new URLSearchParams('page=3&limit=12'))

    const query = vi.mocked(listPublicBlogDocuments).mock.calls[0][0]
    expect(query).toMatchObject({ skip: 24, limit: 12 })
    expect(query.publishedAtOrBefore).toBeInstanceOf(Date)
    expect(vi.mocked(listPublicBlogDocuments).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(countPublicBlogDocuments).mock.invocationCallOrder[0])
  })

  it('normalizes a slug by trimming and lowercasing and maps the public detail shape', async () => {
    vi.mocked(findBlogBySlug).mockResolvedValue(document())

    const result = await getPublicBlogBySlug('  PUBLISHED-ARTICLE  ')

    expect(findBlogBySlug).toHaveBeenCalledWith('published-article')
    expect(result).toMatchObject({
      id: '64b000000000000000000001',
      slug: 'published-article',
      coverImageTitle: null,
      tags: [],
      robotsIndex: true,
      breadcrumbEnabled: true,
    })
    expect(result).not.toHaveProperty('status')
    expect(result).not.toHaveProperty('deletedAt')
    expect(result).not.toHaveProperty('authorId')
  })

  it.each([
    ['missing', null],
    ['draft', document({ status: 'draft' })],
    ['unpublished', document({ status: 'unpublished' })],
    ['deleted', document({ deletedAt: new Date() })],
    ['future scheduled', document({ status: 'draft', publishedAt: new Date(Date.now() + 60_000) })],
    ['published without publication date', document({ publishedAt: null })],
  ])('returns the same public 404 for %s articles', async (_label, article) => {
    vi.mocked(findBlogBySlug).mockResolvedValue(article as BlogDocument | null)

    await expect(getPublicBlogBySlug('not-public')).rejects.toMatchObject({
      status: 404,
      message: 'Blog post not found.',
    })
  })

  it('does not expose the legacy fallback when a matching CMS slug exists but is not public', async () => {
    vi.mocked(findBlogBySlug).mockResolvedValue(document({ status: 'draft' }))

    await expect(getPublicBlogPage('published-article')).rejects.toMatchObject({ status: 404 })
  })

  it('keeps the legacy page resolver available when no CMS record exists', async () => {
    vi.mocked(findBlogBySlug).mockResolvedValue(null)

    const result = await getPublicBlogPage('why-brand-photography-changes-perceived-value')

    expect(result.source).toBe('legacy')
    expect(result.blog.slug).toBe('why-brand-photography-changes-perceived-value')
  })
})
