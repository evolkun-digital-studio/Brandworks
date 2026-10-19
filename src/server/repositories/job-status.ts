import type { Db } from 'mongodb'
import { getDatabase } from '../db/client'

export type PublishDueJobStatus = 'healthy' | 'stale' | 'unknown' | 'failed'

interface PublishDueJobDocument {
  _id: 'publish-due'
  lastRunAt?: Date
  lastSuccessAt?: Date
  lastStatus: 'ok' | 'failed'
  lastPublishedCount: number
  lastError?: string | null
}

export async function recordPublishDueJobRun(
  db: Db,
  input: { status: 'ok' | 'failed'; runAt: Date; publishedCount: number; error?: string },
): Promise<void> {
  await db.collection<PublishDueJobDocument>('job_status').updateOne(
    { _id: 'publish-due' },
    {
      $set: {
        lastRunAt: input.runAt,
        lastStatus: input.status,
        lastPublishedCount: input.publishedCount,
        lastError: input.error ?? null,
        ...(input.status === 'ok' ? { lastSuccessAt: input.runAt } : {}),
      },
    },
    { upsert: true },
  )
}

export async function getPublishDueJobStatus(now = new Date()) {
  const db = await getDatabase()
  const document = await db.collection<PublishDueJobDocument>('job_status').findOne({ _id: 'publish-due' })
  const lastSuccessAt = document?.lastSuccessAt ?? null
  const maxAgeHours = Number(process.env.PUBLISH_DUE_HEALTH_MAX_AGE_HOURS || 36)
  const maxAgeMs = Number.isFinite(maxAgeHours) && maxAgeHours > 0 ? maxAgeHours * 60 * 60 * 1000 : 36 * 60 * 60 * 1000
  const status: PublishDueJobStatus = !document
    ? 'unknown'
    : document.lastStatus === 'failed'
      ? 'failed'
      : !lastSuccessAt || now.getTime() - lastSuccessAt.getTime() > maxAgeMs
        ? 'stale'
        : 'healthy'

  return {
    job: 'publish-due',
    status,
    worker: 'external',
    lastRunAt: document?.lastRunAt?.toISOString() ?? null,
    lastSuccessAt: lastSuccessAt?.toISOString() ?? null,
    lastPublishedCount: document?.lastPublishedCount ?? null,
    lastError: document?.lastError ?? null,
  }
}

