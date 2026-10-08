export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const badRequest = (message: string) => new ApiError(400, message)
export const notFound = (message = 'Not found') => new ApiError(404, message)
export const unauthorized = (message = 'Authentication required.') => new ApiError(401, message)
export const forbidden = (message = 'Forbidden.') => new ApiError(403, message)
export const conflict = (message: string) => new ApiError(409, message)

/** Known errors retain their contract; unexpected errors never reach the response. */
export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  return Response.json(
    { error: 'Something went wrong. Please try again.' },
    { status: 500 },
  )
}

export async function withApiErrors(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler()
  } catch (error) {
    return errorResponse(error)
  }
}
