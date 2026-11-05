import 'server-only'

import type { Filter } from 'mongodb'
import type { ContentType } from '../../blog/contentType'
import { getDatabase } from '../db/client'
import type { BlogDocument } from '../types/blog'
import { publishDueScheduledDocuments } from './blog-jobs'

const BLOGS = 'blogs'

function publicVisibilityFilter(publishedAtOrBefore: Date, contentType: ContentType): Filter<BlogDocument> {
  return {
    ...(contentType === 'newsroom' ? { contentType } : { $or: [{ contentType: 'journal' as const }, { contentType: { $exists: false } }] }),
    status: 'published',
    publishedAt: { $type: 'date', $lte: publishedAtOrBefore },
    deletedAt: null,
  }
}

export async function listPublicBlogDocuments(input: {
  contentType?: ContentType
  publishedAtOrBefore: Date
  skip: number
  limit: number
}): Promise<BlogDocument[]> {
  const db = await getDatabase()
  return db.collection<BlogDocument>(BLOGS)
    .find(publicVisibilityFilter(input.publishedAtOrBefore, input.contentType ?? 'journal'))
    .sort({ publishedAt: -1, _id: -1 })
    .skip(input.skip)
    .limit(input.limit)
    .toArray()
}

export async function countPublicBlogDocuments(publishedAtOrBefore: Date, contentType: ContentType = 'journal'): Promise<number> {
  const db = await getDatabase()
  return db.collection<BlogDocument>(BLOGS)
    .countDocuments(publicVisibilityFilter(publishedAtOrBefore, contentType))
}

export async function findBlogBySlug(slug: string): Promise<BlogDocument | null> {
  const db = await getDatabase()
  return db.collection<BlogDocument>(BLOGS).findOne({ slug, deletedAt: null })
}

export interface SitemapBlogProjection {
  contentType?: ContentType
  slug: string
  canonicalUrl?: string | null
  updatedAt: Date
}

/** Same public visibility filter as the public API plus sitemap-only robotsIndex eligibility. */
export async function listSitemapEligibleBlogs(): Promise<SitemapBlogProjection[]> {
  const db = await getDatabase()
  return db.collection<BlogDocument>('blogs').find<SitemapBlogProjection>({
    status: 'published', publishedAt: { $type: 'date', $lte: new Date() }, deletedAt: null, robotsIndex: { $ne: false },
  }, { projection: { _id: 0, slug: 1, contentType: 1, canonicalUrl: 1, updatedAt: 1 } }).sort({ publishedAt: -1 }).toArray()
}

/** One-run scheduler hook; the update pipeline atomically copies scheduledAt into publishedAt. */
export async function publishDueScheduledBlogs(now = new Date()): Promise<number> {
  return publishDueScheduledDocuments(await getDatabase(),now)
}
