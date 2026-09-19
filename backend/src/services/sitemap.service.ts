import { env } from '../config/env.js'
import { listSitemapEligibleBlogs } from './blog/publicBlog.service.js'
import type { SitemapBlogProjection } from './blog/publicBlog.service.js'
import type { SitemapUrlEntry } from '../lib/xml.js'

/**
 * The small, explicit set of static pages that are genuine, canonical
 * public pages (Phase 9, Part 7) — cross-checked directly against
 * src/App.tsx's route table, not merely "every route that exists."
 * `/admin/*` is a real React Router route but is deliberately excluded
 * — it's the CMS, never meant to be indexed. `/blog/:slug` is handled
 * separately below, from real published articles, not listed here.
 * No lastmod: neither page has a reliable, CMS-tracked "last modified"
 * timestamp, and this file never invents one (Phase 9 spec, Part 3).
 */
const STATIC_PUBLIC_PATHS = ['/', '/blog']

/**
 * Resolves the single sitemap `<loc>` for one blog post, or `null` if
 * it shouldn't be listed at all.
 *
 *  - No configured `canonicalUrl` → the generated `{origin}/blog/{slug}`
 *    URL, matching the exact fallback documentedHead/schema.ts already
 *    use on the frontend (Phase 8) — one canonical-resolution rule,
 *    not two.
 *  - A configured `canonicalUrl` whose origin matches this site's own
 *    `PUBLIC_ORIGIN` → that URL, verbatim (Phase 9 spec, Part 2:
 *    "preserve the configured canonical").
 *  - A configured `canonicalUrl` pointing at a *different* origin →
 *    excluded entirely, deliberately. That article's own canonical
 *    tag (Phase 8) already tells crawlers the authoritative copy
 *    lives elsewhere; listing our own generated URL for it here would
 *    contradict that tag, and listing the foreign URL in *our*
 *    sitemap is non-standard (a sitemap should only recommend URLs
 *    canonical to the site serving it). Exclusion is the one choice
 *    that can never create a contradictory SEO signal — see the
 *    Phase 9 final report's Canonical/Public-Origin section.
 *  - A stored `canonicalUrl` that fails to parse as a URL (should
 *    never happen — it's validated at admin write time — but a single
 *    corrupted row must never break sitemap generation for every
 *    other post) → falls back to the generated URL rather than
 *    aborting or throwing.
 */
export function resolveSitemapLoc(
  post: Pick<SitemapBlogProjection, 'slug' | 'canonicalUrl'>,
  publicOrigin: string,
): string | null {
  const generated = `${publicOrigin}/blog/${post.slug}`
  if (!post.canonicalUrl) return generated

  let parsed: URL
  try {
    parsed = new URL(post.canonicalUrl)
  } catch {
    return generated
  }

  if (parsed.origin !== publicOrigin) return null
  return parsed.toString()
}

/**
 * Composes the full, deduplicated list of sitemap entries from
 * already-fetched data: the static pages above, followed by whatever
 * posts it's given. Pure and synchronous on purpose — no MongoDB
 * import reachable from here — so it's fully unit-testable with
 * canned `SitemapBlogProjection[]` input (see sitemap.service.test.ts)
 * without a live database connection. A `<loc>` that would otherwise
 * appear twice (e.g. two posts explicitly configured with the
 * identical canonical URL) is kept only once, on a first-seen basis.
 */
export function composeSitemapEntries(
  posts: SitemapBlogProjection[],
  publicOrigin: string,
): SitemapUrlEntry[] {
  const seen = new Set<string>()
  const entries: SitemapUrlEntry[] = []

  for (const path of STATIC_PUBLIC_PATHS) {
    const loc = `${publicOrigin}${path}`
    if (seen.has(loc)) continue
    seen.add(loc)
    entries.push({ loc })
  }

  for (const post of posts) {
    const loc = resolveSitemapLoc(post, publicOrigin)
    if (!loc || seen.has(loc)) continue
    seen.add(loc)
    entries.push({ loc, lastmod: post.updatedAt.toISOString() })
  }

  return entries
}

/**
 * The real, database-backed entry point the controller calls: fetches
 * the current sitemap-eligible posts (services/blog/publicBlog.service.ts
 * — the one authoritative query for "which blogs belong in the
 * sitemap") and composes them with this site's own `PUBLIC_ORIGIN`.
 */
export async function buildSitemapEntries(): Promise<SitemapUrlEntry[]> {
  const posts = await listSitemapEligibleBlogs()
  return composeSitemapEntries(posts, env.publicOrigin)
}
