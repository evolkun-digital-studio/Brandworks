import rateLimit from 'express-rate-limit'

/**
 * A generous per-IP ceiling across the whole API — an abuse backstop,
 * not a usage quota. Every public endpoint here (blog listing, a post,
 * /sitemap.xml, /api/health) costs a MongoDB round-trip, so without
 * any limit a single client can turn request volume directly into
 * database load. 300 requests a minute is far above what a real
 * visitor or an admin working in the CMS produces.
 *
 * The login endpoint keeps its own, much stricter limiter on top of
 * this one (middleware/loginRateLimiter.ts). Same in-memory,
 * per-process store and the same caveat as that one.
 *
 * Relies on `trust proxy` (app.ts) to see the real client address
 * behind Passenger — without it every visitor shares the proxy's IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again shortly.' },
})
