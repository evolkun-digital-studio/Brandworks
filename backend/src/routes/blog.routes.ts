import { Router } from 'express'
import { getBlogBySlug, listBlogs } from '../controllers/blog.controller.js'

/**
 * Public, unauthenticated blog endpoints — mounted at /api/blogs (a
 * sibling of /api/admin/blogs, a completely separate route tree, not
 * nested under it). No requireAdminAuth anywhere in this file, on
 * purpose: this router's entire job is visitor-facing, read-only
 * access to published content. The actual visibility enforcement
 * lives in services/blog/publicBlog.service.ts, not here.
 */
export const blogRouter = Router()

blogRouter.get('/', listBlogs)
blogRouter.get('/:slug', getBlogBySlug)
