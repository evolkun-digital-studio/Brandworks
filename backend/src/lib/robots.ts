/**
 * Deterministic robots.txt content (Phase 9). Pure function — same
 * input always produces the same output, no I/O.
 *
 * robots.txt controls *crawling* only (whether a crawler fetches a
 * URL at all) — it is not a substitute for the per-article `noindex`
 * robots meta tag (which controls *indexing* of a URL a crawler was
 * already allowed to fetch — see BlogDetailPage.tsx's `robotsIndex`
 * handling) and it is not what controls whether content is available
 * from the public API (see services/blog/publicBlog.service.ts). All
 * three are deliberately separate, non-overlapping mechanisms.
 *
 * `/blog` and `/api/blogs` are never disallowed — the former is the
 * public blog listing page itself, and the latter is the read-only
 * public data endpoint the client-side-rendered article/listing pages
 * fetch from; blocking it would risk a crawler that executes JavaScript
 * being unable to see the very content it's trying to index. `/admin`
 * (the SPA's client-side admin panel route) and `/api/admin` (the
 * authenticated CMS API) are disallowed — there is nothing there a
 * public crawler has any legitimate reason to fetch, and unauthenticated
 * requests to `/api/admin/*` are rejected by the server anyway.
 */
export function buildRobotsTxt(publicOrigin: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/admin',
    '',
    `Sitemap: ${publicOrigin}/sitemap.xml`,
    '',
  ].join('\n')
}
