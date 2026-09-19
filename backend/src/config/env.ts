import 'dotenv/config'

/**
 * Centralized, typed access to environment variables.
 * Add new variables here as the backend grows instead of
 * reading process.env directly throughout the codebase.
 */

function optional(name: string, fallback: string): string {
  const value = process.env[name]
  return value && value.trim() !== '' ? value : fallback
}

/**
 * Reads a required env var. Throws instead of silently falling back —
 * callers (e.g. the database module) decide how to handle a missing
 * value, but we never invent one.
 */
function required(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const nodeEnv = optional('NODE_ENV', 'development')
const isProductionEnv = nodeEnv === 'production'

const frontendOriginRaw = optional('FRONTEND_ORIGIN', 'http://localhost:5173')

export const allowedOrigins = frontendOriginRaw
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

/**
 * Parses and validates a string as a bare origin (scheme + host +
 * port, nothing else) — used for PUBLIC_ORIGIN below so a misconfigured
 * value fails loudly at startup rather than silently producing
 * malformed or misleading sitemap/canonical URLs later.
 */
function normalizeOrigin(raw: string, name: string): string {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`${name} must be a valid absolute URL (e.g. https://brandworks.com) — got: "${raw}"`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must use http or https — got: "${raw}"`)
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new Error(
      `${name} must be an origin only, with no path (e.g. https://brandworks.com, not .../api or .../blog) — got: "${raw}"`,
    )
  }
  if (url.search || url.hash) {
    throw new Error(`${name} must not include a query string or fragment — got: "${raw}"`)
  }
  // url.origin normalizes away a trailing slash / default-port noise.
  return url.origin
}

/**
 * The public website's own origin — the one and only source used to
 * build absolute canonical/sitemap URLs (Phase 9). Deliberately never
 * the backend's own host:port (this server) and never derived from
 * VITE_API_BASE_URL or any backend-facing value, so the backend API
 * origin (e.g. http://localhost:4001) can never leak into public SEO
 * output. In production it must be set explicitly, since guessing
 * wrong here would silently corrupt every canonical/sitemap URL; in
 * development it falls back to the first configured FRONTEND_ORIGIN,
 * which already names the public site's own origin in this project.
 */
function resolvePublicOrigin(): string {
  const raw = process.env.PUBLIC_ORIGIN
  if (raw && raw.trim() !== '') {
    return normalizeOrigin(raw.trim(), 'PUBLIC_ORIGIN')
  }
  if (isProductionEnv) {
    throw new Error(
      'PUBLIC_ORIGIN is required in production — set it to the public website origin (e.g. https://brandworks.com).',
    )
  }
  return normalizeOrigin(allowedOrigins[0] ?? 'http://localhost:5173', 'FRONTEND_ORIGIN (used as the PUBLIC_ORIGIN fallback)')
}

// How often the blog scheduler (services/blog/scheduler.service.ts)
// checks for due scheduled posts. Bounds are deliberate, not arbitrary:
// below 1s risks polling MongoDB pathologically often for a feature
// that's inherently minute-grained anyway; above 1h stops being a
// credible "scheduled publishing" experience (a post could sit due
// for up to an hour before anyone notices it hasn't gone live).
const MIN_SCHEDULER_INTERVAL_MS = 1_000
const MAX_SCHEDULER_INTERVAL_MS = 60 * 60 * 1000
const DEFAULT_SCHEDULER_INTERVAL_MS = 60_000

function resolveSchedulerIntervalMs(): number {
  const raw = optional('SCHEDULER_INTERVAL_MS', String(DEFAULT_SCHEDULER_INTERVAL_MS))
  const parsed = Number(raw)
  if (!Number.isInteger(parsed)) {
    throw new Error(`SCHEDULER_INTERVAL_MS must be a whole number of milliseconds — got: "${raw}"`)
  }
  if (parsed < MIN_SCHEDULER_INTERVAL_MS || parsed > MAX_SCHEDULER_INTERVAL_MS) {
    throw new Error(
      `SCHEDULER_INTERVAL_MS must be between ${MIN_SCHEDULER_INTERVAL_MS} and ${MAX_SCHEDULER_INTERVAL_MS} — got: ${parsed}`,
    )
  }
  return parsed
}

export const env = {
  /** Port the Express server listens on. */
  port: Number(optional('PORT', '4001')),

  /** Node environment: development | production | test. */
  nodeEnv,

  /**
   * Origin(s) allowed to call this API via CORS.
   * Comma-separated list to support multiple frontend origins later.
   */
  frontendOrigin: frontendOriginRaw,

  /**
   * MongoDB connection string. Required — read lazily via a getter so
   * importing `env` doesn't throw for code paths that don't need the
   * database (the value is only demanded when `getMongoUri()` is called).
   */
  get mongoUri(): string {
    return required('MONGODB_URI')
  },

  /**
   * Secret used to sign/verify admin session JWTs. Required — lazily
   * read so only code that actually touches auth demands it.
   */
  get jwtSecret(): string {
    return required('JWT_SECRET')
  },

  /** How long an admin session token stays valid. */
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '8h'),

  /** See resolvePublicOrigin() above. Computed eagerly (not a secret) so a bad value fails at startup, not on first request. */
  publicOrigin: resolvePublicOrigin(),

  /**
   * How often services/blog/scheduler.service.ts checks for due
   * scheduled posts, in milliseconds (Phase 15). Computed eagerly, same
   * reasoning as publicOrigin — a misconfigured value fails the moment
   * the server starts, not silently in the background. Defaults to
   * 60000 (one minute), preserving Phase 14's original behavior when
   * SCHEDULER_INTERVAL_MS is unset.
   */
  schedulerIntervalMs: resolveSchedulerIntervalMs(),
}

export const isProduction = isProductionEnv

// A PUBLIC_ORIGIN that resolves to this backend's own origin is almost
// certainly a misconfiguration (it would mean canonical/sitemap URLs
// point at the API server instead of the public website) — caught
// here, once, rather than trusted silently everywhere it's used.
if (env.publicOrigin === `http://localhost:${env.port}` || env.publicOrigin === `http://127.0.0.1:${env.port}`) {
  throw new Error(
    `PUBLIC_ORIGIN must not be this backend's own origin (${env.publicOrigin}) — set it to the public website's origin instead.`,
  )
}
