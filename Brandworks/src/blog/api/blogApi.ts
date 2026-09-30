import { publicApiRequest } from './client'
import type { PublicBlogDetail, PublicBlogListResult } from './types'

/**
 * The only two calls the public blog surface ever needs — kept here
 * so no component talks to fetch()/the API shape directly (see
 * src/Blog.tsx, src/blog/pages/BlogPage.tsx and BlogDetailPage.tsx,
 * all of which just call these).
 */

export function getBlogs(page = 1, limit = 9) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  return publicApiRequest<PublicBlogListResult>(`/blogs?${params.toString()}`)
}

export function getBlogBySlug(slug: string) {
  return publicApiRequest<{ blog: PublicBlogDetail }>(`/blogs/${encodeURIComponent(slug)}`)
}
