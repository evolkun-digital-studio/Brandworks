import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/**
 * A small, deterministic, local audit of the SEO invariants this
 * project depends on (Phase 13, Part 19) — cross-checking the Next App
 * Router route tree against the sitemap/robots source directly, by
 * reading file text and not by making any network call or spinning up
 * a real crawler. This intentionally duplicates none of the deeper
 * behavioral tests already covering this ground
 * (src/server/seo/sitemap.test.ts, src/server/seo/robots.test.ts,
 * app/sitemap.xml/route.test.ts, app/robots.txt/route.test.ts,
 * src/blog/lib/schema.test.ts) — it exists specifically to catch the
 * page-side and sitemap-side sources silently drifting apart.
 *
 * Next.js migration: the separate Express backend (../backend) and
 * the React Router route table are gone. Sitemap/robots now live in
 * src/server/seo/, routes are folders under app/(public), and the
 * article canonical is resolved by src/blog/lib/schema.ts.
 */

const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')

function read(relativeToRepoRoot: string): string {
  return readFileSync(path.join(repoRoot, relativeToRepoRoot), 'utf8')
}

/** Extracts the quoted string literals out of `STATIC_PUBLIC_PATHS = ['/', '/blog'] as const` without eval(). */
function extractStaticPublicPaths(sitemapSource: string): string[] {
  const match = sitemapSource.match(/STATIC_PUBLIC_PATHS = \[([^\]]*)\]/)
  if (!match) return []
  return [...match[1].matchAll(/'([^']*)'/g)].map((m) => m[1])
}

/** The App Router page file that serves a public path. */
function publicPageFile(routePath: string): string {
  return path.join('app/(public)', routePath === '/' ? '' : routePath, 'page.tsx')
}

describe('Route inventory (Part 1)', () => {
  it('serves the home, blog index and blog article routes, plus a root not-found page', () => {
    for (const file of [publicPageFile('/'), publicPageFile('/blog'), 'app/(public)/blog/[slug]/page.tsx', 'app/not-found.tsx']) {
      expect(existsSync(path.join(repoRoot, file)), file).toBe(true)
    }
  })

  it('mounts /admin as its own top-level segment, not inside the public route group', () => {
    expect(existsSync(path.join(repoRoot, 'app/admin/layout.tsx'))).toBe(true)
    expect(existsSync(path.join(repoRoot, 'app/(public)/admin'))).toBe(false)
  })
})

describe('Sitemap / route consistency (Part 10)', () => {
  const sitemapSource = read('src/server/seo/sitemap.ts')
  const staticPaths = extractStaticPublicPaths(sitemapSource)

  it('every static sitemap path is a real public page — nothing invented', () => {
    expect(staticPaths).toContain('/')
    expect(staticPaths).toContain('/blog')
    for (const p of staticPaths) {
      expect(existsSync(path.join(repoRoot, publicPageFile(p))), p).toBe(true)
    }
  })

  it('the sitemap never lists /admin or any /api path', () => {
    expect(staticPaths.length).toBeGreaterThan(0)
    for (const p of staticPaths) {
      expect(p.startsWith('/admin')).toBe(false)
      expect(p.startsWith('/api')).toBe(false)
    }
  })
})

describe('Robots consistency (Part 11)', () => {
  const robotsSource = read('src/server/seo/robots.ts')

  it('disallows /admin and /api/admin, never /blog or /api/blogs', () => {
    expect(robotsSource).toContain("'Disallow: /admin'")
    expect(robotsSource).toContain("'Disallow: /api/admin'")
    expect(robotsSource).not.toMatch(/Disallow:\s*\/blog\b/)
    expect(robotsSource).not.toMatch(/Disallow:\s*\/api\/blogs?\b/)
  })

  it('references the sitemap via a publicOrigin parameter, never a hardcoded host', () => {
    expect(robotsSource).toContain('${publicOrigin}/sitemap.xml')
    expect(robotsSource).not.toMatch(/https?:\/\/(?!\$\{)/)
  })
})

describe('No backend-origin or localhost leakage in public-facing source (Part 10/12)', () => {
  const publicFiles = [
    'app/layout.tsx',
    'app/(public)/page.tsx',
    'app/(public)/blog/page.tsx',
    'app/(public)/blog/[slug]/page.tsx',
    'app/not-found.tsx',
    'src/PublicLayout.tsx',
    'src/components/Header/Header.tsx',
    'src/components/Footer/Footer.tsx',
    'src/NotFound.tsx',
    'src/blog/components/BlogCard.tsx',
    'src/blog/lib/schema.ts',
    'src/blog/lib/metadata.ts',
    'src/blog/lib/documentHead.ts',
  ]

  it.each(publicFiles)('%s never hardcodes localhost or port 4001', (file) => {
    const source = read(file)
    expect(source).not.toContain('4001')
    expect(source).not.toMatch(/localhost/i)
  })

  // The old dev-only http://localhost:4001 fallback is gone: Next serves
  // the API on the same origin, so the base is '' outside the legacy
  // Vite runtime, which supplies its own configured origin.
  it('the API base URL has no localhost fallback and is same-origin under Next', () => {
    const source = read('src/config/api.ts')
    expect(source).not.toMatch(/localhost/i)
    expect(source).toContain('API_BASE_URL')
    expect(source).toMatch(/NEXT_PUBLIC_APP_RUNTIME === 'vite'[\s\S]*:\s*''/)

    // Both API clients take the base URL from that one module rather
    // than each carrying its own fallback.
    for (const file of ['src/blog/api/client.ts', 'src/admin/api/client.ts']) {
      const client = read(file)
      expect(client).toContain("from '../../config/api'")
      expect(client).not.toMatch(/localhost/i)
    }
  })
})

describe('Canonical fallback formula consistency (Part 8)', () => {
  const schema = read('src/blog/lib/schema.ts')
  const sitemap = read('src/server/seo/sitemap.ts')

  it('the article canonical fallback and the sitemap fallback use the same shape: {origin}{contentPath}/{slug}', () => {
    expect(schema).toContain('`${site.origin}${contentPath(post.contentType)}/${post.slug}`')
    expect(sitemap).toContain('`${publicOrigin}${contentPath(post.contentType)}/${post.slug}`')
  })

  it('both prefer a configured canonicalUrl, but only when it is on the site origin', () => {
    expect(schema).toContain('post.canonicalUrl')
    expect(schema).toContain('candidate.origin === site.origin')
    expect(sitemap).toContain('post.canonicalUrl')
    expect(sitemap).toContain('canonical.origin!==publicOrigin')
  })

  it('the Next article page takes its canonical from that same resolver', () => {
    expect(read('src/blog/lib/metadata.ts')).toContain('resolveCanonicalUrl(')
  })
})

describe('JSON-LD required node types are still generated (Part 16)', () => {
  const schemaSource = read('src/blog/lib/schema.ts')

  // Newsroom posts are typed NewsArticle in place of BlogPosting; both stay Article subtypes.
  it('generates Organization, Person, WebPage, BlogPosting|NewsArticle/Article, BreadcrumbList, FAQPage', () => {
    for (const type of ['Organization', 'Person', 'WebPage', "[post.contentType === 'newsroom' ? 'NewsArticle' : 'BlogPosting', 'Article']", 'BreadcrumbList', 'FAQPage']) {
      expect(schemaSource).toContain(type)
    }
  })

  it('never generates the explicitly out-of-scope schema types', () => {
    for (const forbidden of ['HowTo', 'Product', 'Review', 'VideoObject', 'Speakable']) {
      // Allowed only inside a comment explaining *why* it's absent.
      const codeOnly = schemaSource
        .split('\n')
        .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
        .join('\n')
      expect(codeOnly).not.toContain(forbidden)
    }
  })
})

describe('Search Console verification tag (Part 18)', () => {
  const gscSource = read('src/analytics/gsc.ts')

  it('is gated on NEXT_PUBLIC_GSC_VERIFICATION and never emits without it', () => {
    expect(gscSource).toContain('gscEnabled')
    expect(gscSource).toMatch(/if \(!gscEnabled/)
  })

  it('never references any Search Console API or OAuth mechanism', () => {
    expect(gscSource).not.toMatch(/oauth/i)
    expect(gscSource.toLowerCase()).not.toContain('searchconsole.googleapis.com')
  })
})
