import 'server-only'

import { ObjectId } from 'mongodb'
import { getDatabase } from '../db/client'
import type { AdminBlogDocument } from '../admin/blog-types'

export interface AdminBlogRevisionDocument {
  _id: ObjectId
  blogId: ObjectId
  editorId: ObjectId
  authorName: string
  snapshot: AdminBlogDocument
  createdAt: Date
}

const revisions = async () => (await getDatabase()).collection<AdminBlogRevisionDocument>('blog_revisions')

export async function createAdminBlogRevision(blog: AdminBlogDocument, editorId: ObjectId) {
  const revision: AdminBlogRevisionDocument = {
    _id: new ObjectId(),
    blogId: blog._id,
    editorId,
    authorName: blog.authorName,
    snapshot: blog,
    createdAt: new Date(),
  }
  await (await revisions()).insertOne(revision)
  return revision
}

export async function listAdminBlogRevisions(blogId: ObjectId) {
  return (await revisions()).find({ blogId }).sort({ createdAt: -1 }).limit(30).toArray()
}

export async function findAdminBlogRevision(blogId: string, revisionId: string) {
  if (!/^[a-f\d]{24}$/i.test(blogId) || !/^[a-f\d]{24}$/i.test(revisionId)) return null
  return (await revisions()).findOne({ blogId: new ObjectId(blogId), _id: new ObjectId(revisionId) })
}

export async function compareAdminBlogRevisions(blogId: string, leftId: string, rightId: string) {
  const [left, right] = await Promise.all([findAdminBlogRevision(blogId, leftId), findAdminBlogRevision(blogId, rightId)])
  if (!left || !right) return null
  const fields = ['title', 'slug', 'excerpt', 'content', 'coverImage', 'coverImageAlt', 'seoTitle', 'seoDescription', 'category', 'tags', 'aiSummary', 'keyTakeaways', 'faq', 'entitySeo', 'canonicalUrl', 'robotsIndex'] as const
  const changedFields = fields.filter((field) => JSON.stringify(left.snapshot[field]) !== JSON.stringify(right.snapshot[field]))
  return { left: { id: left._id.toHexString(), createdAt: left.createdAt.toISOString(), title: left.snapshot.title }, right: { id: right._id.toHexString(), createdAt: right.createdAt.toISOString(), title: right.snapshot.title }, changedFields }
}
