import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../lib/httpError.js'
import { describeError, logger } from '../lib/logger.js'

/**
 * Errors raised by express.json() (body-parser) before any route runs.
 * They're the client's fault and carry a machine-readable `type`, so
 * each gets its real 4xx status and a fixed message — never the
 * parser's own message, which can echo part of the request body.
 */
const BODY_PARSER_ERRORS: Record<string, { status: number; message: string }> = {
  'entity.parse.failed': { status: 400, message: 'Request body is not valid JSON.' },
  'entity.too.large': { status: 413, message: 'Request body is too large.' },
  'encoding.unsupported': { status: 415, message: 'Unsupported request encoding.' },
  'charset.unsupported': { status: 415, message: 'Unsupported request charset.' },
}

function bodyParserError(err: unknown) {
  if (typeof err !== 'object' || err === null) return null
  const type = (err as { type?: unknown }).type
  return typeof type === 'string' ? (BODY_PARSER_ERRORS[type] ?? null) : null
}

/**
 * Single place all errors funnel through (via next(error), including
 * everything asyncHandler catches). An HttpError's message was written
 * to be shown to a client, so it's sent as-is; anything else — a raw
 * MongoDB error, a bug, a driver exception — is logged server-side
 * only and replaced with a generic message, so internals (query
 * shapes, connection details, stack traces) never reach the client,
 * in any environment.
 *
 * Must be registered last, after all routes, per Express's convention
 * for error-handling middleware (4-argument signature).
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Once a response has started there is nothing safe left to send —
  // hand over to Express's default handler, which closes the connection.
  if (res.headersSent) {
    next(err)
    return
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }

  const clientError = bodyParserError(err)
  if (clientError) {
    res.status(clientError.status).json({ error: clientError.message })
    return
  }

  // Method and path only — never the query string, headers, cookies or
  // body, any of which could carry a credential.
  logger.error(`unhandled error on ${req.method} ${req.path}: ${describeError(err)}`)
  res.status(500).json({ error: 'Something went wrong. Please try again.' })
}

/**
 * Anything no router claimed. Registered after every route and before
 * errorHandler so an unknown path gets the same JSON error shape as
 * every other failure instead of Express's default HTML page.
 */
export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' })
}
