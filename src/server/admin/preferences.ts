import 'server-only'

import { ObjectId } from 'mongodb'
import { getDatabase } from '../db/client'
import type { AdminDocument } from './types'

export interface AdminNotificationPreferences {
  emailOnReview: boolean
  emailOnPublishFailure: boolean
  emailOnScheduledPublish: boolean
}

export const DEFAULT_ADMIN_NOTIFICATION_PREFERENCES: AdminNotificationPreferences = {
  emailOnReview: true, emailOnPublishFailure: true, emailOnScheduledPublish: false,
}

export async function getAdminNotificationPreferences(admin: AdminDocument) {
  const existing = await (await getDatabase()).collection<{ adminId: ObjectId } & AdminNotificationPreferences>('admin_preferences').findOne({ adminId: admin._id })
  return { ...DEFAULT_ADMIN_NOTIFICATION_PREFERENCES, ...(existing ?? {}) }
}

export async function saveAdminNotificationPreferences(admin: AdminDocument, input: Record<string, unknown>) {
  const preferences: AdminNotificationPreferences = {
    emailOnReview: input.emailOnReview === true,
    emailOnPublishFailure: input.emailOnPublishFailure === true,
    emailOnScheduledPublish: input.emailOnScheduledPublish === true,
  }
  await (await getDatabase()).collection('admin_preferences').updateOne({ adminId: admin._id }, { $set: preferences, $setOnInsert: { adminId: admin._id } }, { upsert: true })
  return preferences
}
