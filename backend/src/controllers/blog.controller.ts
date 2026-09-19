import type { Request, Response } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { getPublicBlogBySlug, listPublicBlogs } from '../services/blog/publicBlog.service.js'
import { toPublicBlogDetail, toPublicBlogListItem } from '../types/blog.js'

/**
 * Short, safe cache window for public GET responses only — never
 * applied to anything under routes/admin/*, none of which import this.
 * 60s is small enough that a just-published/edited post shows up
 * within a minute, and large enough to absorb repeat homepage/listing
 * hits without needing any invalidation logic.
 */
const PUBLIC_CACHE_CONTROL = 'public, max-age=60'

export const listBlogs = asyncHandler(async (req: Request, res: Response) => {
  const result = await listPublicBlogs({
    page: req.query.page,
    limit: req.query.limit,
  })

  res.set('Cache-Control', PUBLIC_CACHE_CONTROL)
  res.status(200).json({
    items: result.items.map(toPublicBlogListItem),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  })
})

export const getBlogBySlug = asyncHandler(async (req: Request, res: Response) => {
  const blog = await getPublicBlogBySlug(req.params.slug)

  res.set('Cache-Control', PUBLIC_CACHE_CONTROL)
  res.status(200).json({ blog: toPublicBlogDetail(blog) })
})
