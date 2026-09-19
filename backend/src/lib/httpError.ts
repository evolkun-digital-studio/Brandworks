/**
 * A typed error carrying an HTTP status code and a message that is
 * always safe to send to the client. Services/controllers throw this
 * for expected failure cases (bad input, not found, forbidden, ...);
 * the central error handler in app.ts sends its message verbatim and
 * logs anything else (e.g. raw MongoDB errors) without exposing it.
 */
export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export const badRequest = (message: string) => new HttpError(400, message)
export const unauthorized = (message = 'Authentication required') =>
  new HttpError(401, message)
export const forbidden = (message = 'You do not have permission to do that') =>
  new HttpError(403, message)
export const notFound = (message = 'Not found') => new HttpError(404, message)
export const conflict = (message: string) => new HttpError(409, message)
