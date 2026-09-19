import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import BlogCard from './BlogCard'
import type { PublicBlogListItem } from '../api/types'

/**
 * Real rendered-output tests (via renderToStaticMarkup, already
 * available through react-dom — no new test dependency) rather than
 * source-text inspection, since BlogCard's image-loading attributes
 * genuinely vary with the `priority` prop (Phase 10, Part 2). Wrapped
 * in MemoryRouter only because BlogCard renders a react-router <Link>.
 */

function post(overrides: Partial<PublicBlogListItem> = {}): PublicBlogListItem {
  return {
    id: '1',
    title: 'A Post',
    slug: 'a-post',
    excerpt: 'An excerpt.',
    coverImage: 'https://example.com/cover.jpg',
    coverImageAlt: 'A meaningful description of the cover',
    authorName: 'Jane Doe',
    publishedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderCard(props: Partial<Parameters<typeof BlogCard>[0]> = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <BlogCard post={post()} {...props} />
    </MemoryRouter>,
  )
}

function imgTag(html: string): string {
  const match = html.match(/<img[^>]*>/)
  if (!match) throw new Error('No <img> tag found in rendered output')
  return match[0]
}

describe('BlogCard image attributes', () => {
  it('uses the CMS-provided coverImageAlt verbatim as the alt text', () => {
    const html = renderCard()
    expect(imgTag(html)).toContain('alt="A meaningful description of the cover"')
  })

  it('is lazy-loaded with async decoding by default (homepage teaser usage)', () => {
    const img = imgTag(renderCard())
    expect(img).toContain('loading="lazy"')
    expect(img).toContain('decoding="async"')
  })

  it('is eager-loaded, without forced decoding, when priority is set (e.g. /blog first row)', () => {
    const img = imgTag(renderCard({ priority: true }))
    expect(img).toContain('loading="eager"')
    expect(img).not.toContain('decoding=')
  })

  it('renders the original remote CMS URL verbatim — no fabricated responsive/transformation query params', () => {
    const html = renderCard({
      post: post({ coverImage: 'https://cms-host.example.com/uploads/photo.jpg?v=1' }),
    })
    expect(imgTag(html)).toContain('src="https://cms-host.example.com/uploads/photo.jpg?v=1"')
    expect(html).not.toMatch(/srcset=/)
  })

  it('reserves layout space via an aspect-ratio class regardless of priority (CLS)', () => {
    expect(imgTag(renderCard())).toContain('aspect-[16/10]')
    expect(imgTag(renderCard({ priority: true }))).toContain('aspect-[16/10]')
  })
})
