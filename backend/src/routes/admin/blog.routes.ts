import { Router } from 'express'
import {
  createBlog,
  deleteBlog,
  getBlog,
  getScheduledCount,
  listBlogs,
  restoreBlog,
  scheduleBlog,
  unscheduleBlog,
  updateBlog,
  updateBlogStatus,
} from '../../controllers/admin/blog.controller.js'
import { requireAdminAuth } from '../../middleware/requireAdminAuth.js'
import { requireAdminRole } from '../../middleware/requireAdminRole.js'

export const adminBlogRouter = Router()

// Every route here requires an authenticated admin or sub-admin
// session. Unlike routes/admin/users.routes.ts, this router does NOT
// apply a blanket admin-only gate — create/read/update/status are
// open to both roles (see services/blog/blog.service.ts); only
// soft-delete and restore are admin-only, gated individually below.
adminBlogRouter.use(requireAdminAuth)

adminBlogRouter.get('/', listBlogs)
adminBlogRouter.post('/', createBlog)
// Registered *before* GET /:id (Phase 16) — Express matches routes in
// registration order, and "/scheduled-count" would otherwise be
// captured as an :id value by the more general route below.
adminBlogRouter.get('/scheduled-count', getScheduledCount)
adminBlogRouter.get('/:id', getBlog)
adminBlogRouter.put('/:id', updateBlog)
adminBlogRouter.patch('/:id/status', updateBlogStatus)
// Scheduling (Phase 14) — open to both roles, same as /status above:
// it's a publication-workflow action, not a destructive one (unlike
// delete/restore below, which stay admin-only).
adminBlogRouter.patch('/:id/schedule', scheduleBlog)
adminBlogRouter.patch('/:id/unschedule', unscheduleBlog)

// Soft-delete and restore are admin-only — sub-admins cannot delete.
// The service layer enforces the same rule independently; this is
// just the fast-fail path, same pattern as routes/admin/users.routes.ts.
adminBlogRouter.delete('/:id', requireAdminRole('admin'), deleteBlog)
adminBlogRouter.patch('/:id/restore', requireAdminRole('admin'), restoreBlog)
