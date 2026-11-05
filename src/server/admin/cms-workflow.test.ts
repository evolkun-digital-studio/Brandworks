import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import type { AdminBlogDocument } from './blog-types'
import type { AdminDocument } from './types'

const state = vi.hoisted(() => ({ records: new Map<string, AdminBlogDocument>() }))
vi.mock('server-only', () => ({}))
vi.mock('./activity', () => ({ activityFor: vi.fn() }))
vi.mock('../repositories/admin-blog-revisions.repository', () => ({ createAdminBlogRevision: vi.fn(), findAdminBlogRevision: vi.fn(), listAdminBlogRevisions: vi.fn(), compareAdminBlogRevisions: vi.fn() }))
vi.mock('../repositories/blog-redirects.repository', () => ({ upsertBlogSlugRedirect: vi.fn(), findBlogSlugRedirect: vi.fn() }))
vi.mock('../repositories/admin-blog.repository', () => ({
  countAdminScheduledBlogs: vi.fn(), queryAdminBlogs: vi.fn(), restoreAdminBlog: vi.fn(), updateAdminBlogSchedule: vi.fn(), updateAdminBlogReview: vi.fn(),
  findAdminBlog: async (id: string) => { const post = state.records.get(id); return post && !post.deletedAt ? post : null },
  findAdminBlogBySlug: async (slug: string) => [...state.records.values()].find((post) => post.slug === slug) ?? null,
  createAdminBlog: async (input: Omit<AdminBlogDocument, '_id' | 'createdAt' | 'updatedAt'>) => {
    const doc = { ...input, _id: new ObjectId(), createdAt: new Date(), updatedAt: new Date() }
    state.records.set(doc._id.toHexString(), doc)
    return doc
  },
  patchAdminBlog: async (id: string, patch: Partial<AdminBlogDocument>) => {
    const doc = { ...state.records.get(id)!, ...patch, updatedAt: new Date() }
    state.records.set(id, doc)
    return doc
  },
  updateAdminBlogStatus: async (id: string, status: AdminBlogDocument['status'], publishedAt: Date | null) => {
    const doc = { ...state.records.get(id)!, status, publishedAt, scheduledAt: null }
    state.records.set(id, doc)
    return doc
  },
  softDeleteAdminBlog: async (id: string) => { state.records.set(id, { ...state.records.get(id)!, deletedAt: new Date() }) },
}))

import { createBlogForAdmin, updateBlogForAdmin, setBlogStatus, deleteBlog } from './blog'
import { getPublicBlogBySlug, listPublicBlogs } from '../services/public-blog.service'
import { contentPath, type ContentType } from '../../blog/contentType'

const actor: AdminDocument = {
  _id: new ObjectId(), username: 'test-editor', passwordHash: 'unused', role: 'admin', enabled: true,
  isPrimary: false, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: null,
}
const input = (contentType: ContentType) => ({
  contentType, title: `A ${contentType} article`, excerpt: 'A test summary.', content: '## Heading\n\nA complete article.',
  coverImage: 'https://example.test/cover.webp', coverImageAlt: 'Cover photograph', authorName: 'Author',
  category: 'Campaigns', seoTitle: 'SEO title', seoDescription: 'SEO description', publishedAt: '2026-01-01T12:00:00Z',
})
const find = async (slug: string) => [...state.records.values()].find((post) => post.slug === slug) ?? null
const visible = (type: ContentType, cutoff: Date) => [...state.records.values()].filter((p) =>
  (p.contentType ?? 'journal') === type && p.status === 'published' && p.publishedAt && p.publishedAt <= cutoff && !p.deletedAt)
const data = {
  findBlogBySlug: find, findBlogSlugRedirect: vi.fn(),
  listPublicBlogDocuments: async (query: { contentType?: ContentType; publishedAtOrBefore: Date; skip: number; limit: number }) => visible(query.contentType ?? 'journal', query.publishedAtOrBefore).slice(query.skip, query.skip + query.limit),
  countPublicBlogDocuments: async (cutoff: Date, type: ContentType = 'journal') => visible(type, cutoff).length,
}

describe('CMS authoring to public publication workflow', () => {
  beforeEach(() => { state.records.clear(); vi.clearAllMocks() })

  it.each(['journal', 'newsroom'] as const)('creates, publishes, edits, unpublishes and deletes %s content', async (type) => {
    const draft = await createBlogForAdmin(actor, input(type))
    expect(draft).toMatchObject({ contentType: type, status: 'draft', category: 'Campaigns' })
    await expect(getPublicBlogBySlug(draft.slug, find, type)).rejects.toMatchObject({ status: 404 })
    await setBlogStatus(actor, draft.id, 'published')
    const published = await getPublicBlogBySlug(draft.slug, find, type)
    expect(published).toMatchObject({ contentType: type, seoTitle: 'SEO title', seoDescription: 'SEO description', publishedAt: '2026-01-01T12:00:00.000Z' })
    expect(contentPath(published.contentType)).toBe(type === 'journal' ? '/blog' : '/news')
    expect((await listPublicBlogs(new URLSearchParams(), data, type)).items.map((p) => p.id)).toEqual([draft.id])
    expect((await listPublicBlogs(new URLSearchParams(), data, type === 'journal' ? 'newsroom' : 'journal')).total).toBe(0)
    await updateBlogForAdmin(actor, draft.id, { title: 'Edited title', content: 'Edited body', coverImage: 'https://example.test/new.webp', publishedAt: '2026-02-02T00:00:00Z' })
    expect(await getPublicBlogBySlug(draft.slug, find, type)).toMatchObject({ title: 'Edited title', content: 'Edited body', coverImage: 'https://example.test/new.webp', publishedAt: '2026-02-02T00:00:00.000Z' })
    await setBlogStatus(actor, draft.id, 'unpublished')
    expect((await listPublicBlogs(new URLSearchParams(), data, type)).total).toBe(0)
    await expect(getPublicBlogBySlug(draft.slug, find, type)).rejects.toMatchObject({ status: 404 })
    await setBlogStatus(actor, draft.id, 'published')
    await deleteBlog(actor, draft.id)
    await expect(getPublicBlogBySlug(draft.slug, find, type)).rejects.toMatchObject({ status: 404 })
    expect(state.records.get(draft.id)?.deletedAt).toBeInstanceOf(Date)
  })

  it('moves an article between sections only when its type is explicitly changed', async () => {
    const post = await createBlogForAdmin(actor, input('journal'))
    await setBlogStatus(actor, post.id, 'published')
    await updateBlogForAdmin(actor, post.id, { contentType: 'newsroom' })
    await expect(getPublicBlogBySlug(post.slug, find, 'journal')).rejects.toMatchObject({ status: 404 })
    expect((await getPublicBlogBySlug(post.slug, find, 'newsroom')).contentType).toBe('newsroom')
  })

  it('rejects invalid types/dates and prevents sub-admin publication or deletion', async () => {
    const post = await createBlogForAdmin(actor, input('journal'))
    await expect(updateBlogForAdmin(actor, post.id, { contentType: 'other' })).rejects.toMatchObject({ status: 400 })
    await expect(updateBlogForAdmin(actor, post.id, { publishedAt: 'invalid' })).rejects.toMatchObject({ status: 400 })
    await expect(setBlogStatus({ ...actor, role: 'sub_admin' }, post.id, 'published')).rejects.toMatchObject({ status: 403 })
    await expect(deleteBlog({ ...actor, role: 'sub_admin' }, post.id)).rejects.toMatchObject({ status: 403 })
    expect(state.records.get(post.id)?.status).toBe('draft')
    await setBlogStatus(actor, post.id, 'published')
    await expect(updateBlogForAdmin(actor, post.id, { publishedAt: null })).rejects.toMatchObject({ status: 400 })
  })
})
