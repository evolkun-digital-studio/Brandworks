import 'server-only'

import { ObjectId, type Filter } from 'mongodb'
import { getDatabase } from '../db/client'
import type { AdminBlogDocument, AdminBlogStatus } from '../admin/blog-types'

const blogs = async () => (await getDatabase()).collection<AdminBlogDocument>('blogs')
export async function findAdminBlog(id: string, includeDeleted = false) {
  if (!/^[a-f\d]{24}$/i.test(id)) return null
  return (await blogs()).findOne({ _id: new ObjectId(id), ...(includeDeleted ? {} : { deletedAt: null }) })
}
export async function findAdminBlogBySlug(slug: string) { return (await blogs()).findOne({ slug }) }
export async function createAdminBlog(doc: Omit<AdminBlogDocument, '_id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date(); const created: AdminBlogDocument = { ...doc, _id: new ObjectId(), createdAt: now, updatedAt: now }
  await (await blogs()).insertOne(created); return created
}
export async function patchAdminBlog(id: string, patch: Record<string, unknown>) {
  if (!/^[a-f\d]{24}$/i.test(id)) return null
  return (await blogs()).findOneAndUpdate({ _id: new ObjectId(id), deletedAt: null }, { $set: { ...patch, updatedAt: new Date() } }, { returnDocument: 'after' })
}
export async function updateAdminBlogStatus(id: string, status: AdminBlogStatus, publishedAt: Date | null) {
  if (!/^[a-f\d]{24}$/i.test(id)) return null
  return (await blogs()).findOneAndUpdate({ _id: new ObjectId(id), deletedAt: null }, { $set: { status, publishedAt, scheduledAt: null, updatedAt: new Date() } }, { returnDocument: 'after' })
}
export async function updateAdminBlogSchedule(id: string, scheduledAt: Date | null, setDraft = false) {
  if (!/^[a-f\d]{24}$/i.test(id)) return null
  return (await blogs()).findOneAndUpdate({ _id: new ObjectId(id), deletedAt: null }, { $set: { scheduledAt, ...(setDraft ? { status: 'draft' } : {}), updatedAt: new Date() } }, { returnDocument: 'after' })
}
export async function softDeleteAdminBlog(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) return null
  return (await blogs()).findOneAndUpdate({ _id: new ObjectId(id), deletedAt: null }, { $set: { deletedAt: new Date(), updatedAt: new Date() } }, { returnDocument: 'after' })
}
export async function restoreAdminBlog(id: string, clearSchedule: boolean) {
  if (!/^[a-f\d]{24}$/i.test(id)) return null
  return (await blogs()).findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { deletedAt: null, ...(clearSchedule ? { scheduledAt: null } : {}), updatedAt: new Date() } }, { returnDocument: 'after' })
}
export async function queryAdminBlogs(options: {status?:AdminBlogStatus;includeDeleted:boolean;search?:string;scheduled?:boolean;page:number;limit:number}) {
  const filter: Filter<AdminBlogDocument> = options.scheduled
    ? { status: 'draft', deletedAt: null, scheduledAt: { $type: 'date', $gt: new Date() } }
    : { ...(options.status ? { status: options.status } : {}), ...(options.includeDeleted ? {} : { deletedAt: null }) }
  if (options.search) filter.title = { $regex: options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
  const col = await blogs(); const [items,total] = await Promise.all([
    col.find(filter).sort(options.scheduled ? { scheduledAt: 1 } : { createdAt: -1 }).skip((options.page-1)*options.limit).limit(options.limit).toArray(),
    col.countDocuments(filter),
  ])
  return { items, page: options.page, limit: options.limit, total, totalPages: options.limit ? Math.ceil(total/options.limit) : 0 }
}
export async function countAdminScheduledBlogs() {
  return (await blogs()).countDocuments({ status: 'draft', deletedAt: null, scheduledAt: { $type: 'date', $gt: new Date() } })
}
