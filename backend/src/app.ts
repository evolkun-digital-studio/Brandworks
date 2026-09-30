import express from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { env } from './config/env.js'
import { corsMiddleware } from './middleware/cors.js'
import { apiRateLimiter } from './middleware/apiRateLimiter.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { apiRouter } from './routes/index.js'
import { seoRouter } from './routes/seo.routes.js'

export function createApp() {
  const app = express()

  // Behind cPanel/Passenger the TCP peer is always the local web
  // server; this makes req.ip (and so both rate limiters) reflect the
  // real client instead. See resolveTrustProxy() in config/env.ts.
  if (env.trustProxy > 0) {
    app.set('trust proxy', env.trustProxy)
  }

  // Security headers (HSTS, nosniff, frame denial, no X-Powered-By, ...).
  // This server only ever returns JSON/XML/text, so helmet's defaults
  // apply cleanly — the one exception is Cross-Origin-Resource-Policy,
  // relaxed because the whole point of this API is to be read from the
  // frontend's different origin. The frontend's own pages are static
  // files served by Apache and never pass through here, so none of
  // this touches how the site loads its fonts, video or analytics.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

  app.use(corsMiddleware)
  app.use(apiRateLimiter)
  // Explicit rather than body-parser's implicit 100kb: a full blog
  // post (lib/blogValidators.ts allows 100,000 characters of content
  // plus FAQs, callouts and SEO fields) can exceed that, and should be
  // rejected by those validators' own messages, not by the parser.
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.use('/api', apiRouter)
  // Root-mounted, not under /api — sitemap.xml and robots.txt live at
  // fixed, well-known paths crawlers expect (see routes/seo.routes.ts).
  app.use(seoRouter)

  app.use(notFoundHandler)
  // Must be registered last — see middleware/errorHandler.ts.
  app.use(errorHandler)

  return app
}
