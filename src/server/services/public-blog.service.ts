import 'server-only'

import { countPublicBlogDocuments, findBlogBySlug, listPublicBlogDocuments } from '../repositories/blog.repository'
import { notFound } from '../http/errors'
import { parsePublicBlogPagination } from '../validation/blog'
import { toPublicBlogDetail, toPublicBlogListItem } from '../types/blog'
import type { BlogDocument } from '../types/blog'
import type { PublicBlogDetail } from '../../blog/api/types'
import type { ContentType } from '../../blog/contentType'
import { findBlogSlugRedirect } from '../repositories/blog-redirects.repository'

const repository = { countPublicBlogDocuments, findBlogBySlug, listPublicBlogDocuments, findBlogSlugRedirect }

function isPublicBlog(blog: BlogDocument | null, contentType: ContentType, now = new Date()): blog is BlogDocument {
  return Boolean(
    blog &&
    (blog.contentType ?? 'journal') === contentType &&
    !blog.deletedAt &&
    blog.status === 'published' &&
    blog.publishedAt &&
    blog.publishedAt <= now,
  )
}

export async function listPublicBlogs(
  params: URLSearchParams,
  data = repository,
  contentType: ContentType = 'journal',
) {
  const { page, limit } = parsePublicBlogPagination(params)
  const publishedAtOrBefore = new Date()
  const [documents, total] = await Promise.all([
    data.listPublicBlogDocuments({
      contentType,
      publishedAtOrBefore,
      skip: (page - 1) * limit,
      limit,
    }),
    data.countPublicBlogDocuments(publishedAtOrBefore, contentType),
  ])

  return {
    items: documents.map(toPublicBlogListItem),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getPublicBlogBySlug(rawSlug: string, find = repository.findBlogBySlug, contentType: ContentType = 'journal') {
  const slug = rawSlug.trim().toLowerCase()
  const blog = await find(slug)

  if (!isPublicBlog(blog, contentType)) {
    throw notFound('Blog post not found.')
  }

  return toPublicBlogDetail(blog as BlogDocument)
}

export interface PublicBlogPageResult {
  blog: PublicBlogDetail
  source: 'cms'
}

/** Server-page resolver: CMS records win, even when a matching record is unpublished. */
export async function getPublicBlogPage(rawSlug: string, find = repository.findBlogBySlug, contentType: ContentType = 'journal'): Promise<PublicBlogPageResult> {
  return { blog: await getPublicBlogBySlug(rawSlug, find, contentType), source: 'cms' }
}

/** Resolves a changed CMS slug only when its destination is currently public. */
export async function getPublicBlogRedirect(rawSlug: string, contentType: ContentType = 'journal'): Promise<string | null> {
  const slug = rawSlug.trim().toLowerCase()
  const redirect = await repository.findBlogSlugRedirect(slug)
  if (!redirect) return null
  const target = await repository.findBlogBySlug(redirect.toSlug)
  return isPublicBlog(target, contentType) ? redirect.toSlug : null
}

/** Pages and APIs share the same CMS-only publication rules. */
export async function listPublicBlogPage(params: URLSearchParams, contentType: ContentType = 'journal') {
  return { result: await listPublicBlogs(params, repository, contentType) }
}
