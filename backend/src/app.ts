import express from 'express'
import cookieParser from 'cookie-parser'
import { corsMiddleware } from './middleware/cors.js'
import { errorHandler } from './middleware/errorHandler.js'
import { apiRouter } from './routes/index.js'
import { seoRouter } from './routes/seo.routes.js'

export function createApp() {
  const app = express()

  app.use(corsMiddleware)
  app.use(express.json())
  app.use(cookieParser())

  app.use('/api', apiRouter)
  // Root-mounted, not under /api — sitemap.xml and robots.txt live at
  // fixed, well-known paths crawlers expect (see routes/seo.routes.ts).
  app.use(seoRouter)

  // Must be registered last — see middleware/errorHandler.ts.
  app.use(errorHandler)

  return app
}
