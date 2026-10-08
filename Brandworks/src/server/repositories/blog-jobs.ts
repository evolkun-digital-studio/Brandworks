import type { Db, Document } from 'mongodb'

/** Shared atomic transition used by the cron entrypoint and tests. */
export async function publishDueScheduledDocuments(db: Db, now: Date): Promise<number> {
  const result = await db.collection('blogs').updateMany(
    { status: 'draft', scheduledAt: { $type: 'date', $lte: now }, deletedAt: null },
    [{ $set: { status: 'published', publishedAt: '$scheduledAt', scheduledAt: null, updatedAt: now } } satisfies Document],
  )
  return result.modifiedCount
}
