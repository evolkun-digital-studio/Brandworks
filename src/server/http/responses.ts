// Publication visibility can change at any time. Pages use Next's invalidated
// server cache; API responses must not keep an unpublished article in a browser cache.
export const PUBLIC_BLOG_CACHE_CONTROL = 'no-store'

export function publicJsonResponse(body: unknown): Response {
  return Response.json(body, {
    headers: { 'Cache-Control': PUBLIC_BLOG_CACHE_CONTROL },
  })
}
