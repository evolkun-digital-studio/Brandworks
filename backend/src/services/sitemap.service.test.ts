import { describe, expect, it } from 'vitest'
import { composeSitemapEntries, resolveSitemapLoc } from './sitemap.service.js'
import type { SitemapBlogProjection } from '../repositories/blog.repository.js'

const ORIGIN = 'https://brandworks.com'

function post(overrides: Partial<SitemapBlogProjection> = {}): SitemapBlogProjection {
  return {
    slug: 'a-published-post',
    canonicalUrl: null,
    updatedAt: new Date('2026-09-10T00:00:00.000Z'),
    ...overrides,
  }
}

describe('resolveSitemapLoc', () => {
  it('falls back to {origin}/blog/{slug} when no canonicalUrl is configured', () => {
    expect(resolveSitemapLoc(post({ canonicalUrl: null }), ORIGIN)).toBe(
      'https://brandworks.com/blog/a-published-post',
    )
  })

  it('uses the configured canonicalUrl when it belongs to this site’s own origin', () => {
    const loc = resolveSitemapLoc(
      post({ canonicalUrl: 'https://brandworks.com/blog/custom-path' }),
      ORIGIN,
    )
    expect(loc).toBe('https://brandworks.com/blog/custom-path')
  })

  it('excludes the post entirely when its canonicalUrl points to a different origin', () => {
    const loc = resolveSitemapLoc(
      post({ canonicalUrl: 'https://some-other-site.com/reposted-article' }),
      ORIGIN,
    )
    expect(loc).toBeNull()
  })

  it('falls back to the generated URL if the stored canonicalUrl fails to parse', () => {
    const loc = resolveSitemapLoc(post({ canonicalUrl: 'not a url' }), ORIGIN)
    expect(loc).toBe('https://brandworks.com/blog/a-published-post')
  })

  it('never produces a backend-origin (:4001) URL, regardless of input', () => {
    const loc = resolveSitemapLoc(post({ canonicalUrl: null }), ORIGIN)
    expect(loc).not.toContain('4001')
    expect(loc).not.toContain('localhost')
  })
})

describe('composeSitemapEntries', () => {
  it('always includes the homepage and /blog', () => {
    const entries = composeSitemapEntries([], ORIGIN)
    const locs = entries.map((e) => e.loc)
    expect(locs).toContain('https://brandworks.com/')
    expect(locs).toContain('https://brandworks.com/blog')
  })

  it('static pages carry no lastmod — never invented', () => {
    const entries = composeSitemapEntries([], ORIGIN)
    for (const entry of entries) {
      expect(entry.lastmod).toBeUndefined()
    }
  })

  it('includes an eligible published post using its updatedAt as lastmod', () => {
    const entries = composeSitemapEntries([post({ slug: 'hello-world' })], ORIGIN)
    const entry = entries.find((e) => e.loc === 'https://brandworks.com/blog/hello-world')
    expect(entry).toBeDefined()
    expect(entry?.lastmod).toBe('2026-09-10T00:00:00.000Z')
  })

  it('excludes a post whose canonical points cross-origin, without throwing', () => {
    const entries = composeSitemapEntries(
      [post({ slug: 'syndicated', canonicalUrl: 'https://elsewhere.com/original' })],
      ORIGIN,
    )
    expect(entries.some((e) => e.loc.includes('syndicated'))).toBe(false)
    expect(entries.some((e) => e.loc.includes('elsewhere.com'))).toBe(false)
  })

  it('deduplicates two posts that resolve to the identical loc, keeping only one entry', () => {
    const entries = composeSitemapEntries(
      [
        post({ slug: 'post-a', canonicalUrl: 'https://brandworks.com/blog/shared' }),
        post({ slug: 'post-b', canonicalUrl: 'https://brandworks.com/blog/shared' }),
      ],
      ORIGIN,
    )
    const matches = entries.filter((e) => e.loc === 'https://brandworks.com/blog/shared')
    expect(matches).toHaveLength(1)
  })

  it('never leaks the backend origin (:4001) into any produced loc', () => {
    const entries = composeSitemapEntries(
      [post({ slug: 'a' }), post({ slug: 'b', canonicalUrl: 'https://brandworks.com/blog/b' })],
      ORIGIN,
    )
    for (const entry of entries) {
      expect(entry.loc).not.toContain('4001')
    }
  })

  it('preserves static-page-first ordering, then posts in the order given', () => {
    const entries = composeSitemapEntries([post({ slug: 'first' }), post({ slug: 'second' })], ORIGIN)
    expect(entries[0].loc).toBe('https://brandworks.com/')
    expect(entries[1].loc).toBe('https://brandworks.com/blog')
    expect(entries[2].loc).toContain('first')
    expect(entries[3].loc).toContain('second')
  })
})
