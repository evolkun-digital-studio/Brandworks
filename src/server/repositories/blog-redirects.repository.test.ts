import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Db } from 'mongodb'

vi.mock('server-only', () => ({}))
vi.mock('../db/client', () => ({ getDatabase: vi.fn() }))

import { getDatabase } from '../db/client'
import { findBlogSlugRedirect, upsertBlogSlugRedirect } from './blog-redirects.repository'

describe('blog slug redirects repository', () => {
  const updateOne = vi.fn()
  const findOne = vi.fn()
  const collection = vi.fn(() => ({ updateOne, findOne }))

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDatabase).mockResolvedValue({ collection } as unknown as Db)
  })

  it('upserts a previous slug without deleting the target record', async () => {
    const input = { fromSlug: 'old-story', toSlug: 'new-story', blogId: {} as never, createdAt: new Date() }
    await upsertBlogSlugRedirect(input)

    expect(updateOne).toHaveBeenCalledWith({ fromSlug: 'old-story' }, { $set: input }, { upsert: true })
  })

  it('looks up redirects by their source slug', async () => {
    findOne.mockResolvedValue(null)
    await findBlogSlugRedirect('old-story')
    expect(findOne).toHaveBeenCalledWith({ fromSlug: 'old-story' })
  })
})
