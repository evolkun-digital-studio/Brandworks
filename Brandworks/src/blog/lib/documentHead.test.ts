// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  removeJsonLd,
  removeLinkTag,
  removeMetaTag,
  setDocumentTitle,
  setJsonLd,
  setLinkTag,
  setMetaTag,
} from './documentHead'

afterEach(() => {
  document.head.innerHTML = ''
  document.title = ''
})

describe('meta tags', () => {
  it('creates a meta tag if none exists, and updates it in place on a second call', () => {
    setMetaTag('name', 'description', 'first')
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('first')

    setMetaTag('name', 'description', 'second')
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('second')
  })

  it('removes a meta tag cleanly, leaving none behind', () => {
    setMetaTag('property', 'og:title', 'hello')
    removeMetaTag('property', 'og:title')
    expect(document.querySelector('meta[property="og:title"]')).toBeNull()
  })

  it('removing a tag that was never set is a safe no-op', () => {
    expect(() => removeMetaTag('name', 'robots')).not.toThrow()
  })
})

describe('canonical link tag', () => {
  it('creates and updates a single canonical tag', () => {
    setLinkTag('canonical', 'https://example.com/blog/a')
    setLinkTag('canonical', 'https://example.com/blog/b')
    const tags = document.querySelectorAll('link[rel="canonical"]')
    expect(tags).toHaveLength(1)
    expect(tags[0].getAttribute('href')).toBe('https://example.com/blog/b')
  })

  it('removes the canonical tag cleanly', () => {
    setLinkTag('canonical', 'https://example.com/blog/a')
    removeLinkTag('canonical')
    expect(document.querySelector('link[rel="canonical"]')).toBeNull()
  })
})

describe('JSON-LD script tag', () => {
  it('sets the script content via textContent, not innerHTML', () => {
    setJsonLd('blog-jsonld', '{"@type":"BlogPosting"}')
    const el = document.getElementById('blog-jsonld') as HTMLScriptElement
    expect(el.type).toBe('application/ld+json')
    expect(el.textContent).toBe('{"@type":"BlogPosting"}')
  })

  it('updates existing content rather than creating a duplicate tag', () => {
    setJsonLd('blog-jsonld', '{"a":1}')
    setJsonLd('blog-jsonld', '{"a":2}')
    expect(document.querySelectorAll('#blog-jsonld')).toHaveLength(1)
    expect(document.getElementById('blog-jsonld')?.textContent).toBe('{"a":2}')
  })

  it('removes the JSON-LD tag cleanly', () => {
    setJsonLd('blog-jsonld', '{}')
    removeJsonLd('blog-jsonld')
    expect(document.getElementById('blog-jsonld')).toBeNull()
  })
})

describe('navigation cleanup scenario', () => {
  it('leaves no stale title/meta/canonical/json-ld after a full set-then-remove cycle (simulating post -> list -> home)', () => {
    const originalTitle = document.title

    // "Enter" a blog post.
    setDocumentTitle('Post A | BRANDWORKS')
    setMetaTag('name', 'description', 'Post A description')
    setLinkTag('canonical', 'https://example.com/blog/post-a')
    setMetaTag('name', 'robots', 'index,follow')
    setJsonLd('blog-jsonld', '{"headline":"Post A"}')

    // "Leave" it — every one of these is what BlogDetailPage's effect
    // cleanup calls on unmount/post change.
    setDocumentTitle(originalTitle)
    removeMetaTag('name', 'description')
    removeLinkTag('canonical')
    removeMetaTag('name', 'robots')
    removeJsonLd('blog-jsonld')

    expect(document.title).toBe(originalTitle)
    expect(document.querySelector('meta[name="description"]')).toBeNull()
    expect(document.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.querySelector('meta[name="robots"]')).toBeNull()
    expect(document.getElementById('blog-jsonld')).toBeNull()
  })
})
