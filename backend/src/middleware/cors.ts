import cors from 'cors'
import type { CorsOptions } from 'cors'
import { allowedOrigins } from '../config/env.js'
import { forbidden } from '../lib/httpError.js'

/**
 * Allows only the configured frontend origin(s) (FRONTEND_ORIGIN — the
 * Vite dev server locally, the real site in production) to call this
 * API from a browser. Requests with no origin (curl, server-to-server,
 * health checks) are allowed through since they aren't browser requests.
 *
 * `credentials: true` is required so the browser will send/accept the
 * httpOnly admin session cookie across the frontend/backend origins —
 * this only works together with an explicit origin allow-list above
 * (never a `*` wildcard, which the `cors` package refuses to pair with
 * credentials anyway).
 *
 * A disallowed origin is an expected client error, not a server
 * fault: it's rejected with a 403 through the normal HttpError path
 * rather than a bare Error, which the error handler would report as a
 * 500 and log with a full stack trace on every stray request.
 */
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(forbidden('This origin is not allowed to access the API.'))
  },
  credentials: true,
}

export const corsMiddleware = cors(corsOptions)
