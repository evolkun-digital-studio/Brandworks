import type { NextFunction, Request, Response } from 'express'

/**
 * Wraps an async Express handler so a rejected promise is forwarded to
 * `next(error)` instead of crashing the process / hanging the request.
 * Keeps controllers free of repetitive try/catch boilerplate.
 */
export function asyncHandler<
  Req extends Request = Request,
  Res extends Response = Response,
>(handler: (req: Req, res: Res, next: NextFunction) => Promise<unknown>) {
  return (req: Req, res: Res, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}
