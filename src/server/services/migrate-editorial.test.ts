import { describe, expect, it, vi } from 'vitest'
import { ObjectId, type Db } from 'mongodb'
import { migrateEditorialContent } from './migrate-editorial'
import { legacyEditorialRecords } from './public-blog-migration'

describe('editorial migration', () => {
  it('preserves existing records, imports both sections, and is safe to repeat', async () => {
    const sources = legacyEditorialRecords()
    const existing = { slug: sources[0].slug, status: 'draft', title: 'An editor changed this', deletedAt: new Date() }
    const records = new Map<string, Record<string, unknown>>([[existing.slug, existing]])
    const updateOne = vi.fn(async (filter, update) => {
      if (records.has(filter.slug)) return { upsertedCount: 0 }
      records.set(filter.slug, update.$setOnInsert)
      return { upsertedCount: 1 }
    })
    const db = { collection: (name: string) => name === 'admins'
      ? { findOne: async () => ({ _id: new ObjectId() }) }
      : { findOne: async ({ slug }: { slug: string }) => records.get(slug) ?? null, updateOne }
    } as unknown as Db
    const preview = await migrateEditorialContent(db, true)
    expect(preview.filter((r) => r.status === 'would-insert')).toHaveLength(sources.length - 1)
    expect(updateOne).not.toHaveBeenCalled()
    const first = await migrateEditorialContent(db)
    expect(first.filter((r) => r.status === 'inserted')).toHaveLength(sources.length - 1)
    expect(records.get(existing.slug)).toBe(existing)
    for (const source of sources.slice(1)) {
      expect(records.get(source.slug)).toMatchObject({ title: source.title, content: source.content, coverImage: source.coverImage, contentType: source.contentType, publishedAt: new Date(source.publishedAt) })
    }
    const second = await migrateEditorialContent(db)
    expect(second.every((r) => r.status === 'existing')).toBe(true)
    expect(records.size).toBe(sources.length)
  })
})
