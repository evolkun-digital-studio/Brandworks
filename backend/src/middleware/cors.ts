import cors from 'cors'
import type { CorsOptions } from 'cors'
import { allowedOrigins } from '../config/env.js'

/**
 * Allows the configured frontend origin(s) to call this API during
 * local development. Requests with no origin (curl, server-to-server,
 * health checks) are allowed through since they aren't browser requests.
 *
 * `credentials: true` is required so the browser will send/accept the
 * httpOnly admin session cookie across the frontend/backend origins —
 * this only works together with an explicit origin allow-list above
 * (never a `*` wildcard, which the `cors` package refuses to pair with
 * credentials anyway).
 */
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(new Error(`Origin ${origin} is not allowed by CORS`))
  },
  credentials: true,
}

export const corsMiddleware = cors(corsOptions)
