import 'server-only'

import { ObjectId } from 'mongodb'
import { getDatabase } from '../db/client'
import type { AdminDocument } from './types'

export type ActivityAction = 'created' | 'updated' | 'submitted_for_review' | 'approved' | 'changes_requested' | 'published' | 'unpublished' | 'scheduled' | 'unscheduled' | 'archived' | 'restored' | 'backup_exported' | 'backup_restored' | 'login_failed'

export interface ActivityLogDocument {
  _id: ObjectId
  actorId: ObjectId | null
  actorName: string
  action: ActivityAction
  entityType: 'blog' | 'backup' | 'system'
  entityId: string | null
  entityTitle: string | null
  metadata: Record<string, string | number | boolean | null>
  createdAt: Date
}

export async function recordActivity(input: Omit<ActivityLogDocument, '_id' | 'createdAt'>) {
  try {
    await (await getDatabase()).collection<ActivityLogDocument>('activity_logs').insertOne({ ...input, _id: new ObjectId(), createdAt: new Date() })
  } catch {
    // Audit logging must never make the content operation fail.
  }
}

export function activityFor(actor: AdminDocument, input: Omit<ActivityLogDocument, '_id' | 'createdAt' | 'actorId' | 'actorName'>) {
  return recordActivity({ ...input, actorId: actor._id, actorName: actor.username })
}

export async function listActivity(limit = 100) {
  const docs = await (await getDatabase()).collection<ActivityLogDocument>('activity_logs').find({}).sort({ createdAt: -1 }).limit(Math.min(Math.max(limit, 1), 200)).toArray()
  return docs.map((doc) => ({ id: doc._id.toHexString(), actorName: doc.actorName, action: doc.action, entityType: doc.entityType, entityId: doc.entityId, entityTitle: doc.entityTitle, metadata: doc.metadata, createdAt: doc.createdAt.toISOString() }))
}
