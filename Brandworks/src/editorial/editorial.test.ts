import { describe, expect, it } from 'vitest'
import { blogCategories, blogPosts, newsPosts, serviceLinks } from './data'
import { formatDate, imageSources, readingTime } from './format'

describe('formatDate', () => {
  it('formats without a timezone shift or engine-specific month names', () => {
    expect(formatDate('2026-09-01')).toBe('1 September 2026')
    expect(formatDate('2026-09-01', 'short')).toBe('1 Sep 2026')
  })
})

describe('imageSources', () => {
  it('builds a width-based srcset for Unsplash', () => {
    const { src, srcSet } = imageSources('https://images.unsplash.com/photo-1', [400, 800, 1200])
    expect(src).toBe('https://images.unsplash.com/photo-1?auto=format&fit=crop&w=800&q=80')
    expect(srcSet).toContain('w=1200&q=80 1200w')
  })

  it('leaves any other host untouched', () => {
    expect(imageSources('https://cdn.example.com/a.jpg', [400])).toEqual({ src: 'https://cdn.example.com/a.jpg' })
  })
})

describe('editorial content', () => {
  const all = [...blogPosts, ...newsPosts]

  it('has unique slugs within each section', () => {
    for (const posts of [blogPosts, newsPosts]) {
      expect(new Set(posts.map((p) => p.slug)).size).toBe(posts.length)
    }
  })

  it('files every Journal post under a filterable category with a service link', () => {
    for (const post of blogPosts) {
      expect(blogCategories).toContain(post.category)
      expect(serviceLinks[post.category]).toBeDefined()
    }
  })

  it('has exactly one featured Journal post', () => {
    expect(blogPosts.filter((p) => p.featured)).toHaveLength(1)
  })

  it('uses ISO dates and gives every image alt text', () => {
    for (const post of all) {
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(post.imageAlt.trim()).not.toBe('')
      for (const block of post.body) if (block.type === 'image') expect(block.alt.trim()).not.toBe('')
    }
  })

  it('only links internally to stories that exist', () => {
    const paths = new Set(['/blog', '/news', ...blogPosts.map((p) => `/blog/${p.slug}`), ...newsPosts.map((p) => `/news/${p.slug}`)])
    for (const post of all) {
      const text = post.body.map((b) => ('text' in b ? b.text : 'items' in b ? b.items.join(' ') : '')).join(' ')
      for (const [, href] of text.matchAll(/\]\((\/[^)\s]*)\)/g)) expect(paths).toContain(href)
    }
  })

  it('reports a reading time for every Journal post', () => {
    for (const post of blogPosts) expect(readingTime(post)).toMatch(/^\d+ min read$/)
  })
})
