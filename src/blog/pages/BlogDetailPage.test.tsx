// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PublicBlogDetail } from '../api/types'

const getBlogBySlugMock = vi.fn()
const getBlogsMock = vi.fn()

vi.mock('../api/blogApi', () => ({
  getBlogBySlug: (slug: string) => getBlogBySlugMock(slug),
  getBlogs: (...args: unknown[]) => getBlogsMock(...args),
}))
vi.mock('../../analytics/analytics', () => ({
  trackBlogArticleView: vi.fn(),
}))

const { default: BlogDetailPage } = await import('./BlogDetailPage')
const { PublicApiError } = await import('../api/client')

function post(overrides: Partial<PublicBlogDetail> = {}): PublicBlogDetail {
  return {
    id: '1',
    title: 'First Post',
    slug: 'first-post',
    excerpt: 'First excerpt.',
    content: '## Heading\n\nSome body text.',
    coverImage: 'https://example.com/cover.jpg',
    coverImageAlt: 'A cover image',
    coverImageTitle: null,
    coverImageCaption: null,
    coverImageDescription: null,
    authorName: 'Jane Doe',
    publishedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    seoTitle: null,
    seoDescription: null,
    category: null,
    tags: [],
    aiSummary: null,
    keyTakeaways: [],
    aiContext: null,
    entitySeo: null,
    faq: [],
    expertQuote: null,
    canonicalUrl: null,
    robotsIndex: true,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    twitterCard: null,
    breadcrumbEnabled: true,
    ...overrides,
  }
}

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  if (root) act(() => root?.unmount())
  container?.remove()
  container = null
  root = null
  getBlogBySlugMock.mockReset()
  getBlogsMock.mockReset()
  // MoreFromBlog (rendered whenever a post successfully loads) also
  // calls getBlogs — give it a harmless default so it never rejects
  // and pollutes an unrelated test with an uncaught rejection.
  getBlogsMock.mockResolvedValue({ items: [], page: 1, limit: 4, total: 0, totalPages: 0 })
  document.title = ''
  document.head.innerHTML = ''
})

// Applies before the very first test too (afterEach only runs after).
getBlogsMock.mockResolvedValue({ items: [], page: 1, limit: 4, total: 0, totalPages: 0 })

async function mountAt(initialPath: string) {
  container = document.createElement('div')
  document.body.appendChild(container)
  await act(async () => {
    root = createRoot(container!)
    root!.render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
  })
}

function canonicalHref(): string | null {
  return document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null
}

function jsonLd(): string | null {
  return document.getElementById('blog-article-jsonld')?.textContent ?? null
}

describe('BlogDetailPage — successful load', () => {
  it('sets title, canonical, robots, and JSON-LD from the resolved post', async () => {
    getBlogBySlugMock.mockResolvedValue({ blog: post() })
    await mountAt('/blog/first-post')
    expect(document.title).toBe('First Post | BRANDWORKS')
    expect(canonicalHref()).toContain('/blog/first-post')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index,follow')
    expect(jsonLd()).toContain('BlogPosting')
  })

  it('emits noindex,nofollow when the article has robotsIndex: false', async () => {
    getBlogBySlugMock.mockResolvedValue({ blog: post({ robotsIndex: false }) })
    await mountAt('/blog/first-post')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow')
  })

  it('honors a configured same-origin canonicalUrl verbatim', async () => {
    getBlogBySlugMock.mockResolvedValue({
      blog: post({ canonicalUrl: 'http://localhost:3000/blog/custom-path' }),
    })
    await mountAt('/blog/first-post')
    expect(canonicalHref()).toBe('http://localhost:3000/blog/custom-path')
  })

  it('honors a configured cross-origin canonicalUrl verbatim — the page never rewrites it', async () => {
    getBlogBySlugMock.mockResolvedValue({
      blog: post({ canonicalUrl: 'https://elsewhere.example.com/original-article' }),
    })
    await mountAt('/blog/first-post')
    expect(canonicalHref()).toBe('https://elsewhere.example.com/original-article')
  })
})

describe('BlogDetailPage — navigating directly from one article to another', () => {
  it('clears the previous article’s title/canonical/JSON-LD immediately, before the next article resolves (Phase 13, Part 5)', async () => {
    let resolveSecond!: (value: { blog: PublicBlogDetail }) => void
    getBlogBySlugMock
      .mockResolvedValueOnce({ blog: post({ slug: 'first-post', title: 'First Post' }) })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          }),
      )

    container = document.createElement('div')
    document.body.appendChild(container)
    await act(async () => {
      root = createRoot(container!)
      root!.render(
        <MemoryRouter initialEntries={['/blog/first-post']}>
          <Routes>
            <Route
              path="/blog/:slug"
              element={
                <>
                  <BlogDetailPage />
                  {/* A real in-router navigation, same as clicking a
                     "More from the blog" card — not a fresh MemoryRouter,
                     which wouldn't exercise the same-route param change
                     this fix is actually about. */}
                  <Link to="/blog/second-post" data-testid="go-second">
                    next
                  </Link>
                </>
              }
            />
          </Routes>
        </MemoryRouter>,
      )
    })
    expect(document.title).toBe('First Post | BRANDWORKS')
    expect(canonicalHref()).toContain('first-post')
    expect(jsonLd()).not.toBeNull()

    // Navigate directly to a second article via a real route change —
    // same component instance, only the :slug param changes.
    await act(async () => {
      container!.querySelector<HTMLAnchorElement>('[data-testid="go-second"]')!.click()
    })

    // The second article's fetch is still pending — nothing from the
    // first article should still be in the document head (the bug
    // this test guards: it used to still say "first-post" here).
    expect(canonicalHref()).toBeNull()
    expect(jsonLd()).toBeNull()

    await act(async () => {
      resolveSecond({ blog: post({ slug: 'second-post', title: 'Second Post' }) })
      await Promise.resolve()
    })
    expect(document.title).toBe('Second Post | BRANDWORKS')
    expect(canonicalHref()).toContain('second-post')
  })
})

describe('BlogDetailPage — a loaded, published article transitioning to a 404 (Phase 17, Part 6 — the soft-404 case)', () => {
  it('clears the previous article’s title/canonical/robots/JSON-LD when navigating straight to a slug that 404s — nothing from the published article survives into the not-found state', async () => {
    getBlogBySlugMock
      .mockResolvedValueOnce({ blog: post({ slug: 'first-post', title: 'First Post' }) })
      .mockRejectedValueOnce(new PublicApiError(404, 'Not found'))

    container = document.createElement('div')
    document.body.appendChild(container)
    await act(async () => {
      root = createRoot(container!)
      root!.render(
        <MemoryRouter initialEntries={['/blog/first-post']}>
          <Routes>
            <Route
              path="/blog/:slug"
              element={
                <>
                  <BlogDetailPage />
                  <Link to="/blog/removed-post" data-testid="go-removed">
                    next
                  </Link>
                </>
              }
            />
          </Routes>
        </MemoryRouter>,
      )
    })
    // The article loaded successfully first — the full public/SEO
    // contract is in place (this is the "published" half of the
    // transition this phase is auditing).
    expect(document.title).toBe('First Post | BRANDWORKS')
    expect(canonicalHref()).toContain('first-post')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index,follow')
    expect(jsonLd()).not.toBeNull()

    // Now the same slug (or a sibling one) 404s — e.g. it was
    // unpublished or deleted since the visitor arrived. Nothing from
    // the previously-loaded article may remain once the not-found
    // state renders.
    await act(async () => {
      container!.querySelector<HTMLAnchorElement>('[data-testid="go-removed"]')!.click()
      await Promise.resolve()
    })

    expect(document.title).toBe('Post Not Found | BRANDWORKS')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow')
    expect(canonicalHref()).toBeNull()
    expect(jsonLd()).toBeNull()
    expect(document.querySelector('meta[property="og:title"]')).toBeNull()
    expect(document.querySelector('meta[property="article:published_time"]')).toBeNull()
  })
})

describe('BlogDetailPage — not found (draft/unpublished/future/deleted/nonexistent all reach here identically)', () => {
  it('sets a noindex title and leaves no canonical or JSON-LD behind', async () => {
    getBlogBySlugMock.mockRejectedValue(new PublicApiError(404, 'Not found'))
    await mountAt('/blog/does-not-exist')
    expect(document.title).toBe('Post Not Found | BRANDWORKS')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow')
    expect(canonicalHref()).toBeNull()
    expect(jsonLd()).toBeNull()
  })
})

describe('BlogDetailPage — API failure (non-404)', () => {
  it('sets a noindex title and leaves no stale article metadata behind', async () => {
    getBlogBySlugMock.mockRejectedValue(new PublicApiError(500, 'Server error'))
    await mountAt('/blog/first-post')
    expect(document.title).toBe('Something Went Wrong | BRANDWORKS')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow')
    expect(canonicalHref()).toBeNull()
    expect(jsonLd()).toBeNull()
  })
})
