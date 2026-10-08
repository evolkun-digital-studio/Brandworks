import 'server-only'

import type { Filter } from 'mongodb'
import { getDatabase } from '../db/client'
import type { BlogDocument } from '../types/blog'
import { publishDueScheduledDocuments } from './blog-jobs'

const BLOGS = 'blogs'

function publicVisibilityFilter(publishedAtOrBefore: Date): Filter<BlogDocument> {
  return {
    status: 'published',
    publishedAt: { $lte: publishedAtOrBefore },
    deletedAt: null,
  }
}

export async function listPublicBlogDocuments(input: {
  publishedAtOrBefore: Date
  skip: number
  limit: number
}): Promise<BlogDocument[]> {
  const db = await getDatabase()
  return db.collection<BlogDocument>(BLOGS)
    .find(publicVisibilityFilter(input.publishedAtOrBefore))
    .sort({ publishedAt: -1 })
    .skip(input.skip)
    .limit(input.limit)
    .toArray()
}

export async function countPublicBlogDocuments(publishedAtOrBefore: Date): Promise<number> {
  const db = await getDatabase()
  return db.collection<BlogDocument>(BLOGS)
    .countDocuments(publicVisibilityFilter(publishedAtOrBefore))
}

export async function findBlogBySlug(slug: string): Promise<BlogDocument | null> {
  const db = await getDatabase()
  return db.collection<BlogDocument>(BLOGS).findOne({ slug, deletedAt: null })
}

export interface SitemapBlogProjection {
  slug: string
  canonicalUrl?: string | null
  updatedAt: Date
}

/** Same public visibility filter as the public API plus sitemap-only robotsIndex eligibility. */
export async function listSitemapEligibleBlogs(): Promise<SitemapBlogProjection[]> {
  const db = await getDatabase()
  return db.collection<BlogDocument>('blogs').find<SitemapBlogProjection>({
    status: 'published', publishedAt: { $lte: new Date() }, deletedAt: null, robotsIndex: { $ne: false },
  }, { projection: { _id: 0, slug: 1, canonicalUrl: 1, updatedAt: 1 } }).sort({ publishedAt: -1 }).toArray()
}

/** One-run scheduler hook; the update pipeline atomically copies scheduledAt into publishedAt. */
export async function publishDueScheduledBlogs(now = new Date()): Promise<number> {
  return publishDueScheduledDocuments(await getDatabase(),now)
}
