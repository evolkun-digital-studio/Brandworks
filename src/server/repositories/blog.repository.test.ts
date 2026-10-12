import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Db } from 'mongodb'

vi.mock('server-only', () => ({}))
vi.mock('../db/client', () => ({ getDatabase: vi.fn() }))

import { getDatabase } from '../db/client'
import { countPublicBlogDocuments, findBlogBySlug, listPublicBlogDocuments } from './blog.repository'

describe('public blog repository', () => {
  const toArray = vi.fn()
  const sort = vi.fn()
  const skip = vi.fn()
  const limit = vi.fn()
  const find = vi.fn()
  const countDocuments = vi.fn()
  const findOne = vi.fn()
  const collection = vi.fn()
  const db = { collection } as unknown as Db

  beforeEach(() => {
    vi.clearAllMocks()
    collection.mockReturnValue({ find, countDocuments, findOne })
    find.mockReturnValue({ sort, skip, limit, toArray })
    sort.mockReturnThis()
    skip.mockReturnThis()
    limit.mockReturnThis()
    vi.mocked(getDatabase).mockResolvedValue(db)
  })

  it('filters visibility, orders newest publication first, and paginates in MongoDB', async () => {
    const cutoff = new Date('2025-03-01T00:00:00.000Z')
    toArray.mockResolvedValue([])

    await listPublicBlogDocuments({ publishedAtOrBefore: cutoff, skip: 18, limit: 9 })

    expect(collection).toHaveBeenCalledWith('blogs')
    expect(find).toHaveBeenCalledWith({
      status: 'published',
      publishedAt: { $lte: cutoff },
      deletedAt: null,
    })
    expect(sort).toHaveBeenCalledWith({ publishedAt: -1 })
    expect(skip).toHaveBeenCalledWith(18)
    expect(limit).toHaveBeenCalledWith(9)
  })

  it('uses the same public-visibility filter for totals', async () => {
    countDocuments.mockResolvedValue(4)
    const cutoff = new Date('2025-03-01T00:00:00.000Z')

    await expect(countPublicBlogDocuments(cutoff)).resolves.toBe(4)

    expect(countDocuments).toHaveBeenCalledWith({
      status: 'published',
      publishedAt: { $lte: cutoff },
      deletedAt: null,
    })
  })

  it('looks up slug only among non-deleted records', async () => {
    findOne.mockResolvedValue(null)

    await findBlogBySlug('story')

    expect(findOne).toHaveBeenCalledWith({ slug: 'story', deletedAt: null })
  })
})
