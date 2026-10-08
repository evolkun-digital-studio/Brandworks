import 'server-only'

import { countPublicBlogDocuments, findBlogBySlug, listPublicBlogDocuments } from '../repositories/blog.repository'
import { notFound } from '../http/errors'
import { parsePublicBlogPagination } from '../validation/blog'
import { toPublicBlogDetail, toPublicBlogListItem } from '../types/blog'
import type { BlogDocument } from '../types/blog'

const repository = { countPublicBlogDocuments, findBlogBySlug, listPublicBlogDocuments }

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

  if (
    !blog ||
    Boolean(blog.deletedAt) ||
    blog.status !== 'published' ||
    blog.publishedAt === null ||
    blog.publishedAt > new Date()
  ) {
    throw notFound('Blog post not found.')
  }

  return toPublicBlogDetail(blog as BlogDocument)
}
