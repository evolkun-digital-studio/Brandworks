import { ObjectId, type Db } from 'mongodb'
import { legacyEditorialRecords } from './public-blog-migration'
import type { AdminBlogDocument } from '../admin/blog-types'

/** Insert-only by the existing globally unique slug, including archived records. */
export async function migrateEditorialContent(db: Db, dryRun = false) {
  const admin = await db.collection('admins').findOne({ role: 'admin', enabled: true }, { sort: { isPrimary: -1 } })
  if (!admin) throw new Error('An existing enabled admin is required to own migrated records.')
  const collection = db.collection<AdminBlogDocument>('blogs')
  const results: Array<{ slug: string; contentType: string; status: string }> = []
  for (const record of legacyEditorialRecords()) {
    const existing = await collection.findOne({ slug: record.slug })
    const contentType = record.contentType ?? 'journal'
    if (existing) {
      results.push({ slug: record.slug, contentType, status: (existing.contentType ?? 'journal') === contentType ? 'existing' : 'type-conflict-preserved' })
      continue
    }
    if (dryRun) {
      results.push({ slug: record.slug, contentType, status: 'would-insert' })
      continue
    }
    const { id: _legacyId, publishedAt, updatedAt, ...fields } = record
    void _legacyId // The CMS assigns an ObjectId rather than storing the static source's ID.
    const document: AdminBlogDocument = {
      ...fields, contentType, _id: new ObjectId(), authorId: admin._id,
      status: 'published', reviewStatus: 'approved', reviewNote: null, reviewedBy: null, reviewedAt: null,
      publishedAt: new Date(publishedAt), createdAt: new Date(publishedAt), updatedAt: new Date(updatedAt),
      deletedAt: null, scheduledAt: null,
    }
    // $setOnInsert also protects a record created concurrently with the migration.
    try {
      const result = await collection.updateOne({ slug: record.slug }, { $setOnInsert: document }, { upsert: true })
      results.push({ slug: record.slug, contentType, status: result.upsertedCount ? 'inserted' : 'existing' })
    } catch (error) {
      if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 11000)) throw error
      results.push({ slug: record.slug, contentType, status: 'existing' })
    }
  }
  return results
}

/** Optional repair for untouched imports from before the original photo URLs were recovered. */
export async function repairMigratedEditorialImages(db: Db) {
  const originals = legacyEditorialRecords(false)
  const repaired = legacyEditorialRecords()
  let updated = 0
  for (const [index, source] of originals.entries()) {
    const target = repaired[index]
    if (source.coverImage === target.coverImage && source.content === target.content) continue
    const result = await db.collection<AdminBlogDocument>('blogs').updateOne({
      slug: source.slug, contentType: source.contentType, status: 'published', deletedAt: null,
      title: source.title, excerpt: source.excerpt, authorName: source.authorName,
      coverImage: source.coverImage, content: source.content,
      createdAt: new Date(source.publishedAt), updatedAt: new Date(source.updatedAt),
    }, { $set: { coverImage: target.coverImage, content: target.content } })
    updated += result.modifiedCount
  }
  return updated
}
