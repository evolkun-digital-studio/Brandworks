import 'server-only'

import { countPublicBlogDocuments, findBlogBySlug, listPublicBlogDocuments } from '../repositories/blog.repository'
import { notFound } from '../http/errors'
import { parsePublicBlogPagination } from '../validation/blog'
import { toPublicBlogDetail, toPublicBlogListItem } from '../types/blog'
import type { BlogDocument } from '../types/blog'
import type { PublicBlogDetail } from '../../blog/api/types'
import { findBlogSlugRedirect } from '../repositories/blog-redirects.repository'
import {
  getLegacyPublicBlogBySlug,
  getLegacyPublicBlogList,
  isLegacyPublicBlogFallbackEnabled,
} from './public-blog-migration'

const repository = { countPublicBlogDocuments, findBlogBySlug, listPublicBlogDocuments, findBlogSlugRedirect }

function isPublicBlog(blog: BlogDocument | null, now = new Date()): blog is BlogDocument {
  return Boolean(
    blog &&
    !blog.deletedAt &&
    blog.status === 'published' &&
    blog.publishedAt &&
    blog.publishedAt <= now,
  )
}

export async function listPublicBlogs(
  params: URLSearchParams,
  data = repository,
) {
  const { page, limit } = parsePublicBlogPagination(params)
  const publishedAtOrBefore = new Date()
  const [documents, total] = await Promise.all([
    data.listPublicBlogDocuments({
      publishedAtOrBefore,
      skip: (page - 1) * limit,
      limit,
    }),
    data.countPublicBlogDocuments(publishedAtOrBefore),
  ])

  return {
    items: documents.map(toPublicBlogListItem),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getPublicBlogBySlug(rawSlug: string, find = repository.findBlogBySlug) {
  const slug = rawSlug.trim().toLowerCase()
  const blog = await find(slug)

  if (!isPublicBlog(blog)) {
    throw notFound('Blog post not found.')
  }

  return toPublicBlogDetail(blog as BlogDocument)
}

export interface PublicBlogPageResult {
  blog: PublicBlogDetail
  source: 'cms' | 'legacy'
}

/** Server-page resolver: CMS records win, even when a matching record is unpublished. */
export async function getPublicBlogPage(rawSlug: string, find = repository.findBlogBySlug): Promise<PublicBlogPageResult> {
  const slug = rawSlug.trim().toLowerCase()
  const blog = await find(slug)

  if (blog) {
    if (!isPublicBlog(blog)) throw notFound('Blog post not found.')
    return { blog: toPublicBlogDetail(blog), source: 'cms' }
  }

  if (isLegacyPublicBlogFallbackEnabled()) {
    const legacy = getLegacyPublicBlogBySlug(slug)
    if (legacy) return { blog: legacy, source: 'legacy' }
  }

  throw notFound('Blog post not found.')
}

/** Resolves a changed CMS slug only when its destination is currently public. */
export async function getPublicBlogRedirect(rawSlug: string): Promise<string | null> {
  const slug = rawSlug.trim().toLowerCase()
  const redirect = await repository.findBlogSlugRedirect(slug)
  if (!redirect) return null
  const target = await repository.findBlogBySlug(redirect.toSlug)
  return isPublicBlog(target) ? redirect.toSlug : null
}

/** The page-level list keeps old static stories visible only while CMS is empty. */
export async function listPublicBlogPage(params: URLSearchParams): Promise<{
  result: Awaited<ReturnType<typeof listPublicBlogs>>
  legacyFallback: boolean
}> {
  const result = await listPublicBlogs(params)
  if (result.total > 0 || !isLegacyPublicBlogFallbackEnabled()) return { result, legacyFallback: false }

  const page = result.page
  const limit = result.limit
  const legacy = getLegacyPublicBlogList()
  const items = legacy.slice((page - 1) * limit, page * limit)
  return {
    result: {
      items,
      page,
      limit,
      total: legacy.length,
      totalPages: Math.ceil(legacy.length / limit),
    },
    legacyFallback: true,
  }
}
