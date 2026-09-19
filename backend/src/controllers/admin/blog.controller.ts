import type { Request, Response } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { badRequest } from '../../lib/httpError.js'
import {
  countScheduledBlogPosts,
  createBlogPost,
  getBlogPostForAdmin,
  listBlogPostsForAdmin,
  restoreBlogPost,
  scheduleBlogPost,
  setBlogPostStatus,
  softDeleteBlogPost,
  unscheduleBlogPost,
  updateBlogPost,
} from '../../services/blog/blog.service.js'
import type { StructuredFieldsInput } from '../../services/blog/blog.service.js'
import { toAdminBlogResponse } from '../../types/blog.js'

/**
 * Basic shape/type checks live here (mirrors controllers/admin/profile.controller.ts) —
 * the real field-level validation (length limits, URL format, slug
 * uniqueness) happens in the service. Any request field not read out
 * here (status, authorId, createdAt, updatedAt, deletedAt, role, ...)
 * is simply never looked at, which is how it's "ignored" rather than
 * explicitly rejected.
 *
 * The Phase 6 structured fields (tags, faq, aiContext, entitySeo, ...)
 * are forwarded as-is, untyped — the service's validateStructuredFields
 * does all real shape/length/enum validation for those. Duplicating
 * that structural checking here would just be the same work twice.
 */

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw badRequest(`${field} must be text if provided.`)
  return value
}

function optionalNullableString(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') throw badRequest(`${field} must be text if provided.`)
  return value
}

/** Pulls out every Phase 6 structured field from a request body, untyped. */
function extractStructuredFields(body: Record<string, unknown>): StructuredFieldsInput {
  return {
    coverImageTitle: body.coverImageTitle,
    coverImageCaption: body.coverImageCaption,
    coverImageDescription: body.coverImageDescription,
    category: body.category,
    tags: body.tags,
    aiSummary: body.aiSummary,
    keyTakeaways: body.keyTakeaways,
    aiContext: body.aiContext,
    entitySeo: body.entitySeo,
    faq: body.faq,
    expertQuote: body.expertQuote,
    callouts: body.callouts,
    focusKeyword: body.focusKeyword,
    secondaryKeywords: body.secondaryKeywords,
    canonicalUrl: body.canonicalUrl,
    robotsIndex: body.robotsIndex,
    ogTitle: body.ogTitle,
    ogDescription: body.ogDescription,
    ogImage: body.ogImage,
    twitterCard: body.twitterCard,
    breadcrumbEnabled: body.breadcrumbEnabled,
    customMetaTags: body.customMetaTags,
  }
}

export const createBlog = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {}
  const { title, excerpt, content, coverImage, coverImageAlt, slug, seoTitle, seoDescription } = body

  if (
    typeof title !== 'string' ||
    typeof excerpt !== 'string' ||
    typeof content !== 'string' ||
    typeof coverImage !== 'string' ||
    typeof coverImageAlt !== 'string'
  ) {
    throw badRequest('title, excerpt, content, coverImage, and coverImageAlt are required.')
  }

  if (body.publishedAt !== undefined && body.publishedAt !== null && typeof body.publishedAt !== 'string') {
    throw badRequest('publishedAt must be a date string if provided.')
  }

  const created = await createBlogPost(req.admin!, {
    title,
    excerpt,
    content,
    coverImage,
    coverImageAlt,
    slug: optionalString(slug, 'slug'),
    seoTitle: optionalNullableString(seoTitle, 'seoTitle'),
    seoDescription: optionalNullableString(seoDescription, 'seoDescription'),
    publishedAt: body.publishedAt,
    ...extractStructuredFields(body),
  })

  res.status(201).json({ blog: toAdminBlogResponse(created) })
})

export const getBlog = asyncHandler(async (req: Request, res: Response) => {
  const blog = await getBlogPostForAdmin(req.params.id)
  res.status(200).json({ blog: toAdminBlogResponse(blog) })
})

export const listBlogs = asyncHandler(async (req: Request, res: Response) => {
  const { status, scheduled, search, page, limit, includeDeleted } = req.query

  const result = await listBlogPostsForAdmin(req.admin!, {
    status: typeof status === 'string' ? status : undefined,
    // Phase 16: `?scheduled=true` — anything else (absent, "false",
    // a typo) is simply not the scheduled view, same permissive
    // parsing convention as `includeDeleted` just below.
    scheduled: scheduled === 'true',
    search: typeof search === 'string' ? search : undefined,
    page: page !== undefined ? Number(page) : undefined,
    limit: limit !== undefined ? Number(limit) : undefined,
    includeDeleted: includeDeleted === 'true',
  })

  res.status(200).json({
    items: result.items.map(toAdminBlogResponse),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  })
})

/**
 * Phase 16 — the Dashboard's "Scheduled Posts" count. Deliberately its
 * own tiny endpoint rather than folding a count into every /blogs
 * response: the Dashboard needs only a number, not a page of items,
 * and every other consumer of listBlogs still gets exactly the
 * response shape it already expects.
 */
export const getScheduledCount = asyncHandler(async (_req: Request, res: Response) => {
  const scheduled = await countScheduledBlogPosts()
  res.status(200).json({ scheduled })
})

export const updateBlog = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {}

  const updated = await updateBlogPost(req.params.id, {
    title: optionalString(body.title, 'title'),
    slug: optionalString(body.slug, 'slug'),
    excerpt: optionalString(body.excerpt, 'excerpt'),
    content: optionalString(body.content, 'content'),
    coverImage: optionalString(body.coverImage, 'coverImage'),
    coverImageAlt: optionalString(body.coverImageAlt, 'coverImageAlt'),
    seoTitle: optionalNullableString(body.seoTitle, 'seoTitle'),
    seoDescription: optionalNullableString(body.seoDescription, 'seoDescription'),
    // publishedAt is never read here — see UpdateBlogPostInput's
    // comment; even if a client sends it, it's simply ignored.
    ...extractStructuredFields(body),
  })

  res.status(200).json({ blog: toAdminBlogResponse(updated) })
})

export const updateBlogStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body ?? {}

  if (typeof status !== 'string') {
    throw badRequest('status is required.')
  }

  const updated = await setBlogPostStatus(req.params.id, status)
  res.status(200).json({ blog: toAdminBlogResponse(updated) })
})

export const scheduleBlog = asyncHandler(async (req: Request, res: Response) => {
  const { scheduledAt } = req.body ?? {}
  const updated = await scheduleBlogPost(req.params.id, scheduledAt)
  res.status(200).json({ blog: toAdminBlogResponse(updated) })
})

export const unscheduleBlog = asyncHandler(async (req: Request, res: Response) => {
  const updated = await unscheduleBlogPost(req.params.id)
  res.status(200).json({ blog: toAdminBlogResponse(updated) })
})

export const deleteBlog = asyncHandler(async (req: Request, res: Response) => {
  await softDeleteBlogPost(req.admin!, req.params.id)
  res.status(204).send()
})

export const restoreBlog = asyncHandler(async (req: Request, res: Response) => {
  const restored = await restoreBlogPost(req.admin!, req.params.id)
  res.status(200).json({ blog: toAdminBlogResponse(restored) })
})
