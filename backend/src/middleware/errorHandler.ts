import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../lib/httpError.js'

/**
 * Single place all errors funnel through (via next(error), including
 * everything asyncHandler catches). An HttpError's message was written
 * to be shown to a client, so it's sent as-is; anything else — a raw
 * MongoDB error, a bug, a driver exception — is logged server-side
 * only and replaced with a generic message, so internals (query
 * shapes, connection details, stack traces) never reach the client.
 *
 * Must be registered last, after all routes, per Express's convention
 * for error-handling middleware (4-argument signature).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }

  console.error('[brandworks-backend] unhandled error:', err)
  res.status(500).json({ error: 'Something went wrong. Please try again.' })
}
