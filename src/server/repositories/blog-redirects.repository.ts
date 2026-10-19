import 'server-only'

import type { ObjectId } from 'mongodb'
import { getDatabase } from '../db/client'

export interface BlogSlugRedirectDocument {
  _id: ObjectId
  fromSlug: string
  toSlug: string
  blogId: ObjectId
  createdAt: Date
}

export async function upsertBlogSlugRedirect(input: Omit<BlogSlugRedirectDocument, '_id'>): Promise<void> {
  const db = await getDatabase()
  await db.collection<BlogSlugRedirectDocument>('blog_redirects').updateOne(
    { fromSlug: input.fromSlug },
    { $set: input },
    { upsert: true },
  )
}

export async function findBlogSlugRedirect(fromSlug: string): Promise<BlogSlugRedirectDocument | null> {
  const db = await getDatabase()
  return db.collection<BlogSlugRedirectDocument>('blog_redirects').findOne({ fromSlug })
}

export async function listBlogSlugRedirects(limit = 200): Promise<BlogSlugRedirectDocument[]> {
  const db = await getDatabase()
  return db.collection<BlogSlugRedirectDocument>('blog_redirects').find({}).sort({ createdAt: -1 }).limit(limit).toArray()
}

export async function deleteBlogSlugRedirect(fromSlug: string): Promise<boolean> {
  const db = await getDatabase()
  const result = await db.collection<BlogSlugRedirectDocument>('blog_redirects').deleteOne({ fromSlug })
  return result.deletedCount === 1
}

