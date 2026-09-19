import { afterEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import type { BlogDocument } from '../../types/blog.js'
import type { AdminDocument } from '../../types/admin.js'

/**
 * Scoped to the Phase 14/15 scheduling-related business logic in
 * blog.service.ts only — every other function in that file (create,
 * update, list, etc.) predates this and isn't retested here. The
 * repository layer is mocked so these are true unit tests of the
 * *decisions* the service layer makes (does it reject scheduling a
 * published post? does it pass clearScheduledAt at the right moments?)
 * without needing a live database — the underlying MongoDB atomicity
 * itself is covered separately by blog.repository.test.ts's pure
 * buildDueScheduledFilter/buildDueScheduledPublishPipeline tests and
 * this phase's live verification pass (see the Phase 15 report).
 */

const findBlogByIdMock = vi.fn()
const setBlogScheduledAtMock = vi.fn()
const setBlogStatusMock = vi.fn()
const restoreBlogByIdMock = vi.fn()
const listBlogsMock = vi.fn()
const countBlogsMock = vi.fn()

vi.mock('../../repositories/blog.repository.js', () => ({
  findBlogById: (...args: unknown[]) => findBlogByIdMock(...args),
  setBlogScheduledAt: (...args: unknown[]) => setBlogScheduledAtMock(...args),
  setBlogStatus: (...args: unknown[]) => setBlogStatusMock(...args),
  restoreBlogById: (...args: unknown[]) => restoreBlogByIdMock(...args),
  listBlogs: (...args: unknown[]) => listBlogsMock(...args),
  countBlogs: (...args: unknown[]) => countBlogsMock(...args),
  // Unused by the functions under test below, but blog.service.ts
  // imports them at module scope, so they must exist on the mock.
  createBlog: vi.fn(),
  findBlogBySlug: vi.fn(),
  softDeleteBlogById: vi.fn(),
  updateBlogById: vi.fn(),
}))

const {
  scheduleBlogPost,
  unscheduleBlogPost,
  setBlogPostStatus,
  restoreBlogPost,
  listBlogPostsForAdmin,
  countScheduledBlogPosts,
} = await import('./blog.service.js')

const VALID_ID = new ObjectId().toHexString()

function post(overrides: Partial<BlogDocument> = {}): BlogDocument {
  return {
    _id: new ObjectId(VALID_ID),
    title: 't',
    slug: 's',
    excerpt: 'e',
    content: 'c',
    coverImage: 'https://example.com/c.jpg',
    coverImageAlt: 'a',
    authorName: 'author',
    authorId: new ObjectId(),
    status: 'draft',
    publishedAt: null,
    scheduledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    seoTitle: null,
    seoDescription: null,
    robotsIndex: true,
    breadcrumbEnabled: true,
    ...overrides,
  } as BlogDocument
}

const fakeAdmin = { _id: new ObjectId(), role: 'admin' } as AdminDocument

afterEach(() => {
  findBlogByIdMock.mockReset()
  setBlogScheduledAtMock.mockReset()
  setBlogStatusMock.mockReset()
  restoreBlogByIdMock.mockReset()
  listBlogsMock.mockReset()
  countBlogsMock.mockReset()
})

describe('scheduleBlogPost', () => {
  it('rejects scheduling an already-published post', async () => {
    findBlogByIdMock.mockResolvedValue(post({ status: 'published', publishedAt: new Date() }))
    const future = new Date(Date.now() + 60_000).toISOString()
    await expect(scheduleBlogPost(VALID_ID, future)).rejects.toThrow(/already published/i)
    expect(setBlogScheduledAtMock).not.toHaveBeenCalled()
  })

  it('rejects a past scheduledAt', async () => {
    findBlogByIdMock.mockResolvedValue(post())
    const past = new Date(Date.now() - 60_000).toISOString()
    await expect(scheduleBlogPost(VALID_ID, past)).rejects.toThrow(/future/i)
    expect(setBlogScheduledAtMock).not.toHaveBeenCalled()
  })

  it('rejects a missing scheduledAt', async () => {
    findBlogByIdMock.mockResolvedValue(post())
    await expect(scheduleBlogPost(VALID_ID, undefined)).rejects.toThrow(/required/i)
  })

  it('schedules a draft, normalizing status to draft explicitly', async () => {
    findBlogByIdMock.mockResolvedValue(post({ status: 'draft' }))
    const future = new Date(Date.now() + 60_000)
    setBlogScheduledAtMock.mockResolvedValue(post({ status: 'draft', scheduledAt: future }))

    await scheduleBlogPost(VALID_ID, future.toISOString())

    expect(setBlogScheduledAtMock).toHaveBeenCalledWith(VALID_ID, future, 'draft')
  })

  it('schedules an unpublished post — normalized into draft + scheduledAt (Part B)', async () => {
    findBlogByIdMock.mockResolvedValue(post({ status: 'unpublished' }))
    const future = new Date(Date.now() + 60_000)
    setBlogScheduledAtMock.mockResolvedValue(post({ status: 'draft', scheduledAt: future }))

    await scheduleBlogPost(VALID_ID, future.toISOString())

    expect(setBlogScheduledAtMock).toHaveBeenCalledWith(VALID_ID, future, 'draft')
  })

  it('reschedules an already-scheduled post to a new future time — the new value replaces the old one, publishedAt untouched (Part I)', async () => {
    const oldSchedule = new Date(Date.now() + 60_000)
    findBlogByIdMock.mockResolvedValue(post({ status: 'draft', scheduledAt: oldSchedule, publishedAt: null }))
    const newSchedule = new Date(Date.now() + 120_000)
    setBlogScheduledAtMock.mockResolvedValue(post({ status: 'draft', scheduledAt: newSchedule }))

    const result = await scheduleBlogPost(VALID_ID, newSchedule.toISOString())

    expect(setBlogScheduledAtMock).toHaveBeenCalledWith(VALID_ID, newSchedule, 'draft')
    expect(setBlogScheduledAtMock).not.toHaveBeenCalledWith(VALID_ID, oldSchedule, expect.anything())
    expect(result.publishedAt).toBeNull()
  })
})

describe('unscheduleBlogPost', () => {
  it('clears scheduledAt without forcing a status change (Part C)', async () => {
    findBlogByIdMock.mockResolvedValue(post({ status: 'draft', scheduledAt: new Date() }))
    setBlogScheduledAtMock.mockResolvedValue(post({ status: 'draft', scheduledAt: null }))

    await unscheduleBlogPost(VALID_ID)

    expect(setBlogScheduledAtMock).toHaveBeenCalledWith(VALID_ID, null)
  })
})

describe('setBlogPostStatus — manual transitions always clear a pending schedule', () => {
  it('manual publish before the scheduled time: sets publishedAt=now (never published before) and clears scheduledAt (Part D)', async () => {
    findBlogByIdMock.mockResolvedValue(post({ status: 'draft', scheduledAt: new Date(Date.now() + 60_000), publishedAt: null }))
    setBlogStatusMock.mockResolvedValue(post({ status: 'published' }))

    await setBlogPostStatus(VALID_ID, 'published')

    const [, , publishedAtArg, options] = setBlogStatusMock.mock.calls[0]
    expect(publishedAtArg).toBeInstanceOf(Date)
    expect(options).toEqual({ clearScheduledAt: true })
  })

  it('manual publish of a previously-published post never rewrites the historical publishedAt (Part D)', async () => {
    const originalPublishedAt = new Date('2020-01-01T00:00:00.000Z')
    findBlogByIdMock.mockResolvedValue(post({ status: 'unpublished', publishedAt: originalPublishedAt }))
    setBlogStatusMock.mockResolvedValue(post({ status: 'published', publishedAt: originalPublishedAt }))

    await setBlogPostStatus(VALID_ID, 'published')

    const [, , publishedAtArg] = setBlogStatusMock.mock.calls[0]
    expect(publishedAtArg).toBe(originalPublishedAt)
  })

  it('manual unpublish of a scheduled post clears the schedule (Part E)', async () => {
    findBlogByIdMock.mockResolvedValue(post({ status: 'draft', scheduledAt: new Date(Date.now() + 60_000) }))
    setBlogStatusMock.mockResolvedValue(post({ status: 'unpublished' }))

    await setBlogPostStatus(VALID_ID, 'unpublished')

    const [, statusArg, , options] = setBlogStatusMock.mock.calls[0]
    expect(statusArg).toBe('unpublished')
    expect(options).toEqual({ clearScheduledAt: true })
  })
})

describe('restoreBlogPost — Phase 14 Part 7 rule, reverified in Phase 15 (Part H)', () => {
  it('restoring a still-future scheduled+deleted post preserves the schedule', async () => {
    const future = new Date(Date.now() + 60_000)
    findBlogByIdMock.mockResolvedValue(post({ scheduledAt: future, deletedAt: new Date() }))
    restoreBlogByIdMock.mockResolvedValue(post({ scheduledAt: future, deletedAt: null }))

    await restoreBlogPost(fakeAdmin, VALID_ID)

    expect(restoreBlogByIdMock).toHaveBeenCalledWith(VALID_ID, { clearScheduledAt: false })
  })

  it('restoring a past-due scheduled+deleted post clears the schedule rather than letting it auto-publish', async () => {
    const past = new Date(Date.now() - 60_000)
    findBlogByIdMock.mockResolvedValue(post({ scheduledAt: past, deletedAt: new Date() }))
    restoreBlogByIdMock.mockResolvedValue(post({ scheduledAt: null, deletedAt: null }))

    await restoreBlogPost(fakeAdmin, VALID_ID)

    expect(restoreBlogByIdMock).toHaveBeenCalledWith(VALID_ID, { clearScheduledAt: true })
  })

  it('restoring exactly at the scheduledAt boundary (scheduledAt === now) treats it as already due — clears the schedule', async () => {
    const now = new Date()
    findBlogByIdMock.mockResolvedValue(post({ scheduledAt: now, deletedAt: new Date() }))
    restoreBlogByIdMock.mockResolvedValue(post({ scheduledAt: null, deletedAt: null }))

    await restoreBlogPost(fakeAdmin, VALID_ID)

    expect(restoreBlogByIdMock).toHaveBeenCalledWith(VALID_ID, { clearScheduledAt: true })
  })

  it('restoring a post with no schedule at all does not touch scheduledAt', async () => {
    findBlogByIdMock.mockResolvedValue(post({ scheduledAt: null, deletedAt: new Date() }))
    restoreBlogByIdMock.mockResolvedValue(post({ scheduledAt: null, deletedAt: null }))

    await restoreBlogPost(fakeAdmin, VALID_ID)

    expect(restoreBlogByIdMock).toHaveBeenCalledWith(VALID_ID, { clearScheduledAt: false })
  })
})

/**
 * Phase 16 — the "Scheduled" list filter is a distinct dimension from
 * `status`, never a fourth BlogStatus value (see this function's own
 * comment in blog.service.ts). These tests verify the *decision*
 * logic (which filter/sort gets built and handed to listBlogs/
 * countBlogs) with the repository mocked; the underlying MongoDB
 * query semantics themselves are covered by blog.repository.test.ts's
 * pure buildFilter tests, and end-to-end correctness by this phase's
 * live verification pass (see the Phase 16 report).
 */
describe('listBlogPostsForAdmin — scheduled filter', () => {
  it('rejects scheduled and status being specified together', async () => {
    await expect(
      listBlogPostsForAdmin(fakeAdmin, { scheduled: true, status: 'draft' }),
    ).rejects.toThrow(/cannot both be specified/i)
    expect(listBlogsMock).not.toHaveBeenCalled()
  })

  it('scheduled=true builds status=draft + a future scheduledAfter + includeDeleted=false, sorted scheduledAt ascending', async () => {
    listBlogsMock.mockResolvedValue([])
    countBlogsMock.mockResolvedValue(0)

    await listBlogPostsForAdmin(fakeAdmin, { scheduled: true })

    const listArgs = listBlogsMock.mock.calls[0][0]
    expect(listArgs.status).toBe('draft')
    expect(listArgs.scheduledAfter).toBeInstanceOf(Date)
    expect(listArgs.includeDeleted).toBe(false)
    expect(listArgs.sort).toEqual({ scheduledAt: 1 })

    const countArgs = countBlogsMock.mock.calls[0][0]
    expect(countArgs).toEqual({ status: 'draft', scheduledAfter: listArgs.scheduledAfter, includeDeleted: false, search: undefined })
  })

  it('scheduled=true forces includeDeleted=false even if the caller also passed includeDeleted=true', async () => {
    listBlogsMock.mockResolvedValue([])
    countBlogsMock.mockResolvedValue(0)

    await listBlogPostsForAdmin(fakeAdmin, { scheduled: true, includeDeleted: true })

    expect(listBlogsMock.mock.calls[0][0].includeDeleted).toBe(false)
  })

  it('scheduled=true composes with search (Part 9: "Scheduled + SEO")', async () => {
    listBlogsMock.mockResolvedValue([])
    countBlogsMock.mockResolvedValue(0)

    await listBlogPostsForAdmin(fakeAdmin, { scheduled: true, search: 'SEO' })

    expect(listBlogsMock.mock.calls[0][0].search).toBe('SEO')
    expect(countBlogsMock.mock.calls[0][0].search).toBe('SEO')
  })

  it('scheduled=true still paginates via skip/limit like every other view', async () => {
    listBlogsMock.mockResolvedValue([])
    countBlogsMock.mockResolvedValue(25)

    const result = await listBlogPostsForAdmin(fakeAdmin, { scheduled: true, page: 2, limit: 5 })

    expect(listBlogsMock.mock.calls[0][0].skip).toBe(5)
    expect(listBlogsMock.mock.calls[0][0].limit).toBe(5)
    expect(result.total).toBe(25)
    expect(result.totalPages).toBe(5)
  })

  it('an ordinary (non-scheduled) request is unaffected — same filter shape and createdAt-descending sort as before', async () => {
    listBlogsMock.mockResolvedValue([])
    countBlogsMock.mockResolvedValue(0)

    await listBlogPostsForAdmin(fakeAdmin, { status: 'draft' })

    const listArgs = listBlogsMock.mock.calls[0][0]
    expect(listArgs.status).toBe('draft')
    expect(listArgs.scheduledAfter).toBeUndefined()
    expect(listArgs.sort).toEqual({ createdAt: -1 })
  })
})

describe('countScheduledBlogPosts', () => {
  it('counts with the same eligibility rule as the list filter', async () => {
    countBlogsMock.mockResolvedValue(3)

    const result = await countScheduledBlogPosts()

    expect(result).toBe(3)
    const args = countBlogsMock.mock.calls[0][0]
    expect(args.status).toBe('draft')
    expect(args.scheduledAfter).toBeInstanceOf(Date)
    expect(args.includeDeleted).toBe(false)
  })

  it('returns zero when nothing is scheduled', async () => {
    countBlogsMock.mockResolvedValue(0)
    expect(await countScheduledBlogPosts()).toBe(0)
  })
})
