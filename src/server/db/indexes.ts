import type { Db } from 'mongodb'

/** Mirrors backend/src/repositories/*: idempotent, non-destructive index creation. */
export async function ensureDatabaseIndexes(db: Db): Promise<void> {
  await db.collection('admins').createIndex({ username: 1 }, { unique: true })
  await db.collection('blogs').createIndex({ slug: 1 }, { unique: true })
  await db.collection('blogs').createIndex({ status: 1, publishedAt: -1 })
  await db.collection('blog_revisions').createIndex({ blogId: 1, createdAt: -1 })
  await db.collection('blog_redirects').createIndex({ fromSlug: 1 }, { unique: true })
  await db.collection('media_assets').createIndex({ deletedAt: 1, createdAt: -1 })
  await db.collection('media_assets').createIndex({ mimeType: 1, createdAt: -1 })
  await db.collection('activity_logs').createIndex({ createdAt: -1 })
  await db.collection('activity_logs').createIndex({ entityType: 1, entityId: 1, createdAt: -1 })
  await db.collection('admin_preferences').createIndex({ adminId: 1 }, { unique: true })
  await db.collection('project_questionnaires').createIndex({ createdAt: -1 })
  await db.collection('project_questionnaires').createIndex({ status: 1, createdAt: -1 })
  await db.collection('project_questionnaires').createIndex({ 'siteScan.id': 1 })
  await db.collection('site_scans').createIndex({ domain: 1, createdAt: -1 })
  await db.collection('site_scans').createIndex({ updatedAt: -1 })
  await db.collection('site_scans').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
}
