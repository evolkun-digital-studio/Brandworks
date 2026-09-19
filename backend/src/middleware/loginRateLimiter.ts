import rateLimit from 'express-rate-limit'

/**
 * Basic brute-force mitigation on the login endpoint only. Deliberately
 * simple — an in-memory, per-process window is enough for this phase;
 * revisit with a shared store if the backend ever runs multiple
 * instances behind a load balancer.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
})
