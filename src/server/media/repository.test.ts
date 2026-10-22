import { ObjectId } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Db } from 'mongodb'

vi.mock('server-only', () => ({}))
vi.mock('../db/client', () => ({ getDatabase: vi.fn() }))

import { getDatabase } from '../db/client'
import { findMediaAssetByPublicId } from './repository'

/**
 * A media asset's public URL is /api/media/<fileId> (the stored file's id),
 * which is not the asset record's own _id. Serving must resolve either one,
 * or every uploaded image 404s.
 */
describe('findMediaAssetByPublicId', () => {
  const findOne = vi.fn()
  const collection = vi.fn(() => ({ findOne }))

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDatabase).mockResolvedValue({ collection } as unknown as Db)
  })

  it('matches the stored file id used in public URLs, or the record id', async () => {
    const id = '6ad9e18eb2e313e46e71e304'
    findOne.mockResolvedValue({ _id: new ObjectId('6ad9e191b2e313e46e71e330') })

    await findMediaAssetByPublicId(id)

    expect(collection).toHaveBeenCalledWith('media_assets')
    expect(findOne).toHaveBeenCalledWith({ $or: [{ fileId: new ObjectId(id) }, { _id: new ObjectId(id) }] })
  })

  it('still serves soft-deleted assets, so existing references keep working', async () => {
    findOne.mockResolvedValue(null)
    await findMediaAssetByPublicId('6ad9e18eb2e313e46e71e304')
    const filter = findOne.mock.calls[0][0] as Record<string, unknown>
    expect(filter).not.toHaveProperty('deletedAt')
  })

  it('rejects ids that are not 24 hex characters without touching the database', async () => {
    expect(await findMediaAssetByPublicId('not-an-id')).toBeNull()
    expect(findOne).not.toHaveBeenCalled()
  })
})
