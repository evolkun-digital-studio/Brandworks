import 'server-only'

import { ObjectId } from 'mongodb'
import { getDatabase } from '../db/client'
import { badRequest } from '../http/errors'
import type { AdminDocument } from './types'
import { activityFor } from './activity'

export interface BlogBackup {
  version: 1
  exportedAt: string
  blogs: Array<Record<string, unknown>>
  redirects: Array<Record<string, unknown>>
}

function date(value: unknown, name: string, nullable = false) {
  if ((value === null || value === undefined) && nullable) return null
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) throw badRequest(`${name} must be a valid date.`)
  return new Date(value)
}

export async function exportBlogBackup(actor: AdminDocument): Promise<BlogBackup> {
  const db = await getDatabase()
  const [blogs, redirects] = await Promise.all([
    db.collection('blogs').find({}).sort({ updatedAt: -1 }).toArray(),
    db.collection('blog_redirects').find({}).sort({ createdAt: -1 }).toArray(),
  ])
  const serialize = (value: Record<string, unknown>) => ({ ...value, _id: (value._id as ObjectId).toHexString(), authorId: (value.authorId as ObjectId).toHexString(), publishedAt: value.publishedAt instanceof Date ? value.publishedAt.toISOString() : value.publishedAt, scheduledAt: value.scheduledAt instanceof Date ? value.scheduledAt.toISOString() : value.scheduledAt, createdAt: (value.createdAt as Date).toISOString(), updatedAt: (value.updatedAt as Date).toISOString(), deletedAt: value.deletedAt instanceof Date ? value.deletedAt.toISOString() : value.deletedAt, reviewedBy: value.reviewedBy instanceof ObjectId ? value.reviewedBy.toHexString() : value.reviewedBy, reviewedAt: value.reviewedAt instanceof Date ? value.reviewedAt.toISOString() : value.reviewedAt })
  const backup = { version: 1 as const, exportedAt: new Date().toISOString(), blogs: blogs.map((blog) => serialize(blog)), redirects: redirects.map((redirect) => ({ ...redirect, _id: (redirect._id as ObjectId).toHexString(), blogId: (redirect.blogId as ObjectId).toHexString(), createdAt: (redirect.createdAt as Date).toISOString() })) }
  await activityFor(actor, { action: 'backup_exported', entityType: 'backup', entityId: null, entityTitle: null, metadata: { blogs: backup.blogs.length, redirects: backup.redirects.length } })
  return backup
}

export async function restoreBlogBackup(actor: AdminDocument, input: Record<string, unknown>) {
  if (input.version !== 1 || !Array.isArray(input.blogs) || !Array.isArray(input.redirects)) throw badRequest('Unsupported backup format.')
  if (input.blogs.length > 5000 || input.redirects.length > 5000) throw badRequest('Backup is too large.')
  const db = await getDatabase()
  const blogOperations = input.blogs.map((raw) => {
    if (!raw || typeof raw !== 'object') throw badRequest('Backup contains an invalid blog record.')
    const item = raw as Record<string, unknown>
    if (typeof item._id !== 'string' || !/^[a-f\d]{24}$/i.test(item._id) || typeof item.authorId !== 'string' || !/^[a-f\d]{24}$/i.test(item.authorId)) throw badRequest('Backup contains an invalid blog identity.')
    return {
      replaceOne: {
        filter: { _id: new ObjectId(item._id) },
        replacement: { ...item, _id: new ObjectId(item._id), authorId: new ObjectId(item.authorId), publishedAt: date(item.publishedAt, 'publishedAt', true), scheduledAt: date(item.scheduledAt, 'scheduledAt', true), createdAt: date(item.createdAt, 'createdAt'), updatedAt: date(item.updatedAt, 'updatedAt'), deletedAt: date(item.deletedAt, 'deletedAt', true), reviewedBy: item.reviewedBy ? new ObjectId(String(item.reviewedBy)) : null, reviewedAt: date(item.reviewedAt, 'reviewedAt', true) },
        upsert: true,
      },
    }
  })
  if (blogOperations.length) await db.collection('blogs').bulkWrite(blogOperations)
  const redirectOperations = input.redirects.map((raw) => {
    if (!raw || typeof raw !== 'object') throw badRequest('Backup contains an invalid redirect record.')
    const item = raw as Record<string, unknown>
    if (typeof item.fromSlug !== 'string' || typeof item.toSlug !== 'string' || typeof item.blogId !== 'string' || !/^[a-f\d]{24}$/i.test(item.blogId)) throw badRequest('Backup contains an invalid redirect.')
    return { updateOne: { filter: { fromSlug: item.fromSlug }, update: { $set: { fromSlug: item.fromSlug, toSlug: item.toSlug, blogId: new ObjectId(item.blogId), createdAt: date(item.createdAt, 'createdAt') } }, upsert: true } }
  })
  if (redirectOperations.length) await db.collection('blog_redirects').bulkWrite(redirectOperations)
  await activityFor(actor, { action: 'backup_restored', entityType: 'backup', entityId: null, entityTitle: null, metadata: { blogs: blogOperations.length, redirects: redirectOperations.length } })
  return { blogs: blogOperations.length, redirects: redirectOperations.length }
}
