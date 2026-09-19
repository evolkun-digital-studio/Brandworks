import { Router } from 'express'
import { getRobotsTxt, getSitemapXml } from '../controllers/seo.controller.js'

/**
 * Public SEO infrastructure routes (Phase 9). Mounted directly on the
 * app root in app.ts — deliberately NOT under /api like every other
 * router in routes/index.ts — because crawlers fetch these at fixed,
 * well-known paths (`/sitemap.xml`, `/robots.txt`), not under an API
 * prefix. No auth, no admin coupling: same "visitor-facing, read-only"
 * spirit as routes/blog.routes.ts.
 */
export const seoRouter = Router()

seoRouter.get('/sitemap.xml', getSitemapXml)
seoRouter.get('/robots.txt', getRobotsTxt)
