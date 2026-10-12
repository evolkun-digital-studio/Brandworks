import type { Db } from 'mongodb'

/** Mirrors backend/src/repositories/*: idempotent, non-destructive index creation. */
export async function ensureDatabaseIndexes(db: Db): Promise<void> {
  await db.collection('admins').createIndex({ username: 1 }, { unique: true })
  await db.collection('blogs').createIndex({ slug: 1 }, { unique: true })
  await db.collection('blogs').createIndex({ status: 1, publishedAt: -1 })
}
