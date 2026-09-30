import { adminApiRequest } from './client'
import type {
  AdminBlogListResult,
  AdminBlogPost,
  AiContext,
  BlogStatus,
  Callout,
  CustomMetaTag,
  EntitySeo,
  ExpertQuote,
  FaqItem,
  TwitterCardType,
} from './blogTypes'

export interface ListBlogPostsParams {
  status?: BlogStatus
  /**
   * "Scheduled" (Phase 16) — a distinct filter dimension from
   * `status`, never a `BlogStatus` value; mutually exclusive with
   * `status` (the backend rejects both being set at once).
   */
  scheduled?: boolean
  search?: string
  page?: number
  limit?: number
  includeDeleted?: boolean
}

function buildQueryString(params: ListBlogPostsParams): string {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.scheduled) search.set('scheduled', 'true')
  if (params.search) search.set('search', params.search)
  if (params.page) search.set('page', String(params.page))
  if (params.limit) search.set('limit', String(params.limit))
  if (params.includeDeleted) search.set('includeDeleted', 'true')
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function listBlogPosts(params: ListBlogPostsParams = {}) {
  return adminApiRequest<AdminBlogListResult>(`/blogs${buildQueryString(params)}`)
}

/** Phase 16 — the Dashboard's "Scheduled Posts" count; a single small request rather than fetching the whole list just to count it. */
export function getScheduledCount() {
  return adminApiRequest<{ scheduled: number }>('/blogs/scheduled-count')
}

export function fetchBlogPost(id: string) {
  return adminApiRequest<{ blog: AdminBlogPost }>(`/blogs/${id}`)
}

/**
 * Fields shared by create and update — every Phase 6 structured field
 * is optional on both; the backend validates whatever's actually
 * sent and, on create, fills in defaults for whatever's omitted.
 */
interface StructuredFields {
  coverImageTitle?: string | null
  coverImageCaption?: string | null
  coverImageDescription?: string | null
  category?: string | null
  tags?: string[]
  aiSummary?: string | null
  keyTakeaways?: string[]
  aiContext?: AiContext | null
  entitySeo?: EntitySeo | null
  faq?: FaqItem[]
  expertQuote?: ExpertQuote | null
  callouts?: Callout[]
  focusKeyword?: string | null
  secondaryKeywords?: string[]
  canonicalUrl?: string | null
  robotsIndex?: boolean
  ogTitle?: string | null
  ogDescription?: string | null
  ogImage?: string | null
  twitterCard?: TwitterCardType | null
  breadcrumbEnabled?: boolean
  customMetaTags?: CustomMetaTag[]
}

export interface CreateBlogPostInput extends StructuredFields {
  title: string
  excerpt: string
  content: string
  coverImage: string
  coverImageAlt: string
  slug?: string
  seoTitle?: string | null
  seoDescription?: string | null
  /** Editor-chosen publish date, before first publication only. */
  publishedAt?: string | null
}

export function createBlogPost(input: CreateBlogPostInput) {
  return adminApiRequest<{ blog: AdminBlogPost }>('/blogs', {
    method: 'POST',
    body: input,
  })
}

export interface UpdateBlogPostInput extends StructuredFields {
  title?: string
  slug?: string
  excerpt?: string
  content?: string
  coverImage?: string
  coverImageAlt?: string
  seoTitle?: string | null
  seoDescription?: string | null
  // No publishedAt — the backend never accepts it through update; see
  // src/admin/pages/blogs/BlogEditor.tsx for how a publish date is set.
}

export function updateBlogPost(id: string, input: UpdateBlogPostInput) {
  return adminApiRequest<{ blog: AdminBlogPost }>(`/blogs/${id}`, {
    method: 'PUT',
    body: input,
  })
}

/** The backend alone decides publishedAt — this only ever sends the target status. */
export function setBlogPostStatus(id: string, status: BlogStatus) {
  return adminApiRequest<{ blog: AdminBlogPost }>(`/blogs/${id}/status`, {
    method: 'PATCH',
    body: { status },
  })
}

/**
 * Schedules a not-yet-published post to publish automatically at a
 * future date (Phase 14). `scheduledAt` must be a real ISO-8601
 * timestamp (e.g. from `Date.prototype.toISOString()`) — the backend
 * rejects anything else, including a locale-formatted string. Backend-
 * authoritative: nothing on this side ever publishes the post itself.
 */
export function scheduleBlogPost(id: string, scheduledAt: string) {
  return adminApiRequest<{ blog: AdminBlogPost }>(`/blogs/${id}/schedule`, {
    method: 'PATCH',
    body: { scheduledAt },
  })
}

/** Cancels a pending schedule without otherwise changing status. */
export function unscheduleBlogPost(id: string) {
  return adminApiRequest<{ blog: AdminBlogPost }>(`/blogs/${id}/unschedule`, {
    method: 'PATCH',
  })
}

/** Soft-delete — admin only; the backend rejects this for a sub-admin. */
export function deleteBlogPost(id: string) {
  return adminApiRequest<undefined>(`/blogs/${id}`, { method: 'DELETE' })
}

/** Admin only; does not change status — the backend leaves it exactly as it was. */
export function restoreBlogPost(id: string) {
  return adminApiRequest<{ blog: AdminBlogPost }>(`/blogs/${id}/restore`, {
    method: 'PATCH',
  })
}
