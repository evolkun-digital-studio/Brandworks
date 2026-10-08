export const PUBLIC_BLOG_CACHE_CONTROL = 'public, max-age=60'

export function publicJsonResponse(body: unknown): Response {
  return Response.json(body, {
    headers: { 'Cache-Control': PUBLIC_BLOG_CACHE_CONTROL },
  })
}
