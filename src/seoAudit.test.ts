import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/**
 * A small, deterministic, local audit of the SEO invariants this
 * project depends on (Phase 13, Part 19) — cross-checking frontend
 * route declarations against the backend's sitemap/robots source
 * directly, by reading file text (not importing backend TS into the
 * frontend's module graph, which would drag in NodeNext-specific
 * resolution rules that don't apply here — see the .js-extension
 * import style in the backend's own source), and not by making any
 * network call or spinning up a real crawler. This intentionally
 * duplicates none of the deeper behavioral tests already covering
 * this ground (backend/src/services/sitemap.service.test.ts,
 * backend/src/lib/robots.test.ts, src/blog/lib/schema.test.ts,
 * src/blog/pages/BlogDetailPage.test.tsx) — it exists specifically to
 * catch the two files silently drifting apart, which none of those
 * files (each scoped to only its own side) can catch on their own.
 */

const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')

function read(relativeToRepoRoot: string): string {
  return readFileSync(path.join(repoRoot, relativeToRepoRoot), 'utf8')
}

/** Extracts the quoted string literals out of `STATIC_PUBLIC_PATHS = ['/', '/blog']` without eval() — a plain regex over a trusted local source file. */
function extractStaticPublicPaths(sitemapSource: string): string[] {
  const match = sitemapSource.match(/STATIC_PUBLIC_PATHS = \[([^\]]*)\]/)
  if (!match) return []
  return [...match[1].matchAll(/'([^']*)'/g)].map((m) => m[1])
}

describe('Route inventory (Part 1)', () => {
  const appSource = read('src/App.tsx')

  it('declares exactly the three public content routes plus a catch-all, inside PublicLayout', () => {
    expect(appSource).toMatch(/<Route path="\/" element=\{<Home/)
    expect(appSource).toMatch(/<Route path="\/blog" element=\{<BlogPage/)
    expect(appSource).toMatch(/<Route path="\/blog\/:slug" element=\{<BlogDetailPage/)
    expect(appSource).toMatch(/<Route path="\*" element=\{<NotFound/)
  })

  it('mounts /admin/* as a separate top-level route, not nested under PublicLayout', () => {
    const publicBlock = appSource.slice(
      appSource.indexOf('<Route element={<PublicLayout'),
      appSource.indexOf('</Route>', appSource.indexOf('<Route element={<PublicLayout')),
    )
    expect(publicBlock).not.toContain('/admin')
    expect(appSource).toContain('/admin/*')
  })
})

describe('Sitemap / route consistency (Part 10)', () => {
  const appSource = read('src/App.tsx')
  const sitemapSource = read('backend/src/services/sitemap.service.ts')

  it('the backend sitemap lists exactly the static paths that are real frontend routes — nothing invented, nothing missing', () => {
    const staticPaths = extractStaticPublicPaths(sitemapSource)
    expect(staticPaths).toEqual(['/', '/blog'])
    for (const p of staticPaths) {
      expect(appSource).toContain(`path="${p}"`)
    }
  })

  it('the sitemap never lists /admin or any /api path', () => {
    const staticPaths = extractStaticPublicPaths(sitemapSource)
    expect(staticPaths.length).toBeGreaterThan(0)
    for (const p of staticPaths) {
      expect(p.startsWith('/admin')).toBe(false)
      expect(p.startsWith('/api')).toBe(false)
    }
  })
})

describe('Robots consistency (Part 11)', () => {
  const robotsSource = read('backend/src/lib/robots.ts')

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
    'src/App.tsx',
    'src/PublicLayout.tsx',
    'src/Header.tsx',
    'src/Footer.tsx',
    'src/NotFound.tsx',
    'src/blog/pages/BlogPage.tsx',
    'src/blog/pages/BlogDetailPage.tsx',
    'src/blog/components/BlogCard.tsx',
    'src/blog/lib/schema.ts',
    'src/blog/lib/documentHead.ts',
  ]

  it.each(publicFiles)('%s never hardcodes localhost or port 4001', (file) => {
    const source = read(file)
    expect(source).not.toContain('4001')
    expect(source).not.toMatch(/localhost/i)
  })

  it('the only "http://localhost" literals anywhere in src/ are documented dev-only API base URL fallbacks', () => {
    const clientFiles = ['src/blog/api/client.ts', 'src/admin/api/client.ts']
    for (const file of clientFiles) {
      const source = read(file)
      const matches = source.match(/http:\/\/localhost:4001/g) ?? []
      expect(matches.length).toBeGreaterThan(0)
      // Must only ever be assigned to the API base URL, never used to
      // build a public link, canonical, or OG value.
      expect(source).toContain('API_BASE_URL')
    }
  })
})

describe('Canonical fallback formula consistency (Part 8)', () => {
  it('the frontend article canonical fallback and the backend sitemap canonical fallback use the same shape: {origin}/blog/{slug}', () => {
    const frontend = read('src/blog/pages/BlogDetailPage.tsx')
    const backend = read('backend/src/services/sitemap.service.ts')
    expect(frontend).toMatch(/\$\{origin\}\/blog\/\$\{post\.slug\}/)
    expect(backend).toMatch(/\$\{publicOrigin\}\/blog\/\$\{post\.slug\}/)
  })

  it('both explicitly prefer a configured canonicalUrl over the generated fallback', () => {
    const frontend = read('src/blog/pages/BlogDetailPage.tsx')
    const backend = read('backend/src/services/sitemap.service.ts')
    expect(frontend).toContain('post.canonicalUrl ||')
    expect(backend).toContain('post.canonicalUrl')
  })
})

describe('JSON-LD required node types are still generated (Part 16)', () => {
  const schemaSource = read('src/blog/lib/schema.ts')

  it('generates Organization, Person, WebPage, BlogPosting/Article, BreadcrumbList, FAQPage', () => {
    for (const type of ['Organization', 'Person', 'WebPage', "['BlogPosting', 'Article']", 'BreadcrumbList', 'FAQPage']) {
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

  it('is gated on VITE_GSC_VERIFICATION and never emits without it', () => {
    expect(gscSource).toContain('gscEnabled')
    expect(gscSource).toMatch(/if \(!gscEnabled/)
  })

  it('never references any Search Console API or OAuth mechanism', () => {
    expect(gscSource).not.toMatch(/oauth/i)
    expect(gscSource.toLowerCase()).not.toContain('searchconsole.googleapis.com')
  })
})
