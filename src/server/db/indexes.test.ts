import { describe, expect, it, vi } from 'vitest'
import { ensureDatabaseIndexes } from './indexes'
import type { Db } from 'mongodb'

describe('ensureDatabaseIndexes', () => {
  it('creates the CMS indexes without destructive operations', async () => {
    const calls: Array<{ collection: string; keys: unknown; options?: unknown }> = []
    const db = {
      collection(name: string) {
        return {
          createIndex: vi.fn(async (keys: unknown, options?: unknown) => {
            calls.push({ collection: name, keys, options })
            return 'index'
          }),
        }
      },
    } as unknown as Db

    await ensureDatabaseIndexes(db)

    expect(calls).toEqual([
      { collection: 'admins', keys: { username: 1 }, options: { unique: true } },
      { collection: 'blogs', keys: { slug: 1 }, options: { unique: true } },
      { collection: 'blogs', keys: { status: 1, publishedAt: -1 }, options: undefined },
      { collection: 'blog_revisions', keys: { blogId: 1, createdAt: -1 }, options: undefined },
      { collection: 'blog_redirects', keys: { fromSlug: 1 }, options: { unique: true } },
      { collection: 'media_assets', keys: { deletedAt: 1, createdAt: -1 }, options: undefined },
      { collection: 'media_assets', keys: { mimeType: 1, createdAt: -1 }, options: undefined },
      { collection: 'activity_logs', keys: { createdAt: -1 }, options: undefined },
      { collection: 'activity_logs', keys: { entityType: 1, entityId: 1, createdAt: -1 }, options: undefined },
      { collection: 'admin_preferences', keys: { adminId: 1 }, options: { unique: true } },
    ])
  })
})
