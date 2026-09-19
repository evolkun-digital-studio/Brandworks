import { countBlogs, findBlogBySlug, listBlogs, listBlogsForSitemap } from '../../repositories/blog.repository.js'
import type { BlogQueryFilter, SitemapBlogProjection } from '../../repositories/blog.repository.js'
import { badRequest, notFound } from '../../lib/httpError.js'
import type { BlogDocument } from '../../types/blog.js'

/**
 * The entire public visibility contract for the blog lives here, in
 * one place: a post is public if and only if
 *
 *   status === 'published' AND publishedAt <= now AND deletedAt === null
 *
 * Nothing in this file accepts a client-supplied status, includeDeleted,
 * or any other override — there is no such parameter on either
 * exported query type below, so there's nothing to accidentally trust.
 * Contrast services/blog/blog.service.ts (the authenticated admin
 * service), which can see any status/deleted post for management.
 */

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 9
const MAX_LIMIT = 30

// Deliberately strict (no leading zeros, no decimals, no signs, no
// scientific notation) rather than a loose `Number()` coercion, so a
// query string that merely *looks* numeric-ish can't sneak through.
const POSITIVE_INTEGER_PATTERN = /^[1-9][0-9]*$/

function parsePositiveIntParam(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !POSITIVE_INTEGER_PATTERN.test(value)) {
    throw badRequest(`${field} must be a positive integer.`)
  }
  return Number(value)
}

/**
 * The base rule shared by every public visibility check in this file:
 * published, publishedAt has arrived, not soft-deleted. Exported (as
 * a function, so `new Date()` is evaluated fresh on each call) so
 * Phase 9's sitemap query below can build on top of exactly this
 * instead of restating the same three conditions a second time.
 */
function publicVisibilityFilter(): BlogQueryFilter {
  return {
    status: 'published',
    publishedAtBefore: new Date(),
    includeDeleted: false,
  }
}

export interface PublicBlogListQuery {
  page?: unknown
  limit?: unknown
}

export interface PublicBlogListResult {
  items: BlogDocument[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export async function listPublicBlogs(
  query: PublicBlogListQuery,
): Promise<PublicBlogListResult> {
  const page = parsePositiveIntParam(query.page, 'page') ?? DEFAULT_PAGE

  const requestedLimit = parsePositiveIntParam(query.limit, 'limit') ?? DEFAULT_LIMIT
  // An excessive limit is safely constrained rather than rejected —
  // a caller asking for too many isn't inherently malicious, and
  // clamping fully protects the server without being unfriendly to a
  // naive caller (the Phase 3 spec explicitly allows either choice).
  const limit = Math.min(requestedLimit, MAX_LIMIT)

  const filter = publicVisibilityFilter()

  const [items, total] = await Promise.all([
    listBlogs({
      ...filter,
      skip: (page - 1) * limit,
      limit,
      sort: { publishedAt: -1 },
    }),
    countBlogs(filter),
  ])

  return {
    items,
    page,
    limit,
    total,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  }
}

/**
 * Looks up a post by slug and returns it ONLY if it's currently
 * public. Every failure path — nonexistent slug, draft, unpublished,
 * soft-deleted, or scheduled for the future — throws the exact same
 * generic 404, so none of those states are distinguishable from the
 * outside (see this file's header comment and the Phase 3 privacy
 * requirement it implements).
 */
export async function getPublicBlogBySlug(rawSlug: string): Promise<BlogDocument> {
  // Minimal, safe normalization (trim + lowercase) — not the full
  // slugify() transform, which could make an unrelated string
  // "helpfully" match a real slug. Anything that isn't an exact match
  // after this just 404s, same as anything else that doesn't resolve.
  const slug = rawSlug.trim().toLowerCase()

  // includeDeleted is passed explicitly (even though false is already
  // the repository's default) so this security-critical intent stays
  // visible here rather than depending on a default defined elsewhere.
  const blog = await findBlogBySlug(slug, { includeDeleted: false })
  if (!blog) throw notFound('Blog post not found.')

  const now = new Date()
  if (blog.status !== 'published' || blog.publishedAt === null || blog.publishedAt > now) {
    throw notFound('Blog post not found.')
  }

  return blog
}

export type { SitemapBlogProjection }

/**
 * The authoritative "which blogs belong in the sitemap" query (Phase
 * 9): every rule from `publicVisibilityFilter()` above — the exact
 * same rule the public API itself enforces — plus one additional,
 * sitemap-only restriction: a post explicitly marked
 * `robotsIndex: false` is left out. That extra restriction never
 * reaches `listPublicBlogs`/`getPublicBlogBySlug` above, so a noindex
 * post stays fully reachable through the public API and its own page
 * (Phase 8's `robotsIndex` only ever controls that page's own robots
 * meta tag) — it's simply not *recommended* to crawlers via the
 * sitemap, so the two signals never contradict each other.
 */
export function listSitemapEligibleBlogs(): Promise<SitemapBlogProjection[]> {
  return listBlogsForSitemap({
    ...publicVisibilityFilter(),
    excludeNoIndex: true,
  })
}
