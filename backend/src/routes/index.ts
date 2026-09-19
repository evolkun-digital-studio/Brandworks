import { Router } from 'express'
import { healthRouter } from './health.routes.js'
import { adminRouter } from './admin/index.js'
import { blogRouter } from './blog.routes.js'

/**
 * All API routes are mounted under /api. Add new feature routers
 * here as they're built (e.g. apiRouter.use('/contact', contactRouter)).
 *
 * /blogs (public, read-only) and /admin/blogs (authenticated CMS) are
 * two entirely separate route trees mounted at different prefixes —
 * not nested — so there is no path overlap between them.
 */
export const apiRouter = Router()

apiRouter.use(healthRouter)
apiRouter.use('/admin', adminRouter)
apiRouter.use('/blogs', blogRouter)
