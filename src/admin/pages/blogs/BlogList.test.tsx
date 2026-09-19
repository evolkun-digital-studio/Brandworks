// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BlogRow } from './BlogList'
import type { AdminBlogPost } from '../../api/blogTypes'

const listBlogPostsMock = vi.fn()

vi.mock('../../api/blogAdminApi', () => ({
  listBlogPosts: (...args: unknown[]) => listBlogPostsMock(...args),
  getScheduledCount: vi.fn(),
  setBlogPostStatus: vi.fn(),
  deleteBlogPost: vi.fn(),
  restoreBlogPost: vi.fn(),
}))

vi.mock('../../context/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    admin: { id: '1', username: 'testadmin', role: 'admin' },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  }),
}))

const { default: BlogList } = await import('./BlogList')

/**
 * Audits the Phase 14 "Scheduled" list indicator (Phase 15, Part 10):
 * scheduled drafts clearly look scheduled, normal drafts don't, and
 * published/unpublished posts never incorrectly show it either — the
 * badge is driven purely by `post.scheduledAt`, which (by the Phase
 * 14/15 invariant verified in blog.service.test.ts) is only ever
 * non-null while status is 'draft'.
 */

function post(overrides: Partial<AdminBlogPost> = {}): AdminBlogPost {
  return {
    id: '1',
    title: 'A Post',
    slug: 'a-post',
    excerpt: 'e',
    content: 'c',
    coverImage: 'https://example.com/c.jpg',
    coverImageAlt: 'a',
    coverImageTitle: null,
    coverImageCaption: null,
    coverImageDescription: null,
    authorName: 'Jane Doe',
    status: 'draft',
    publishedAt: null,
    scheduledAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
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
    callouts: [],
    focusKeyword: null,
    secondaryKeywords: [],
    canonicalUrl: null,
    robotsIndex: true,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    twitterCard: null,
    breadcrumbEnabled: true,
    customMetaTags: [],
    ...overrides,
  }
}

function renderRow(p: AdminBlogPost, trashView = false) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <table>
        <tbody>
          <BlogRow post={p} isAdmin trashView={trashView} onChanged={() => {}} onRemoved={() => {}} />
        </tbody>
      </table>
    </MemoryRouter>,
  )
}

describe('BlogRow — Scheduled indicator', () => {
  it('shows "Scheduled" for a scheduled draft', () => {
    const html = renderRow(post({ status: 'draft', scheduledAt: '2026-10-01T10:00:00.000Z' }))
    expect(html).toContain('Scheduled')
  })

  it('does not show "Scheduled" for a plain, unscheduled draft', () => {
    const html = renderRow(post({ status: 'draft', scheduledAt: null }))
    expect(html).not.toContain('Scheduled')
  })

  it('does not show "Scheduled" for a published post', () => {
    const html = renderRow(post({ status: 'published', scheduledAt: null, publishedAt: '2026-01-01T00:00:00.000Z' }))
    expect(html).not.toContain('Scheduled')
  })

  it('does not show "Scheduled" for an unpublished post', () => {
    const html = renderRow(post({ status: 'unpublished', scheduledAt: null }))
    expect(html).not.toContain('Scheduled')
  })

  it('still shows the ordinary status badge alongside the Scheduled tag', () => {
    const html = renderRow(post({ status: 'draft', scheduledAt: '2026-10-01T10:00:00.000Z' }))
    expect(html).toContain('Draft')
    expect(html).toContain('Scheduled')
  })

  it('a deleted (trash-view) scheduled post still shows Scheduled — the trash view does not hide it', () => {
    const html = renderRow(
      post({ status: 'draft', scheduledAt: '2026-10-01T10:00:00.000Z', deletedAt: '2026-02-01T00:00:00.000Z' }),
      true,
    )
    expect(html).toContain('Scheduled')
    // Trash view shows Restore, not the normal Publish/Edit actions.
    expect(html).toContain('Restore')
  })

  it('shows the publish time visibly (not only as a hover tooltip) for a scheduled post', () => {
    const html = renderRow(post({ status: 'draft', scheduledAt: '2026-10-01T10:00:00.000Z' }))
    expect(html).toContain('Publishes')
  })

  it('does not show a publish time for an unscheduled post', () => {
    const html = renderRow(post({ status: 'draft', scheduledAt: null }))
    expect(html).not.toContain('Publishes')
  })
})

/**
 * Full BlogList component tests (Phase 16) — the API client and admin
 * auth context are mocked so these exercise the real fetch/filter
 * wiring (which query gets sent for which UI interaction) rather than
 * just markup, without a live backend. Fake timers throughout: the
 * component's own 400ms search debounce and the "reset to page 1 on
 * filter change" effect both need deterministic time control, same
 * approach established in Phase 15's scheduler tests (advance time
 * explicitly rather than relying on vi.waitFor's own polling).
 */
describe('BlogList — Scheduled filter (Phase 16)', () => {
  let container: HTMLDivElement | null = null
  let root: Root | null = null

  function emptyResult() {
    return { items: [], page: 1, limit: 10, total: 0, totalPages: 0 }
  }

  function findButton(el: HTMLElement, label: string): HTMLButtonElement {
    const button = [...el.querySelectorAll('button')].find((b) => b.textContent === label)
    if (!button) throw new Error(`No <button> with text "${label}"`)
    return button
  }

  async function mount(initialEntries = ['/admin/blogs']) {
    container = document.createElement('div')
    document.body.appendChild(container)
    await act(async () => {
      root = createRoot(container!)
      root!.render(
        <MemoryRouter initialEntries={initialEntries}>
          <BlogList />
        </MemoryRouter>,
      )
      await vi.advanceTimersByTimeAsync(0)
    })
    return container
  }

  function setInputValue(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  beforeEach(() => {
    vi.useFakeTimers()
    listBlogPostsMock.mockReset()
    listBlogPostsMock.mockResolvedValue(emptyResult())
  })

  afterEach(() => {
    if (root) act(() => root?.unmount())
    container?.remove()
    container = null
    root = null
    vi.useRealTimers()
  })

  it('renders a Scheduled filter button alongside the existing status filters', async () => {
    const el = await mount()
    expect(() => findButton(el, 'Scheduled')).not.toThrow()
    expect(() => findButton(el, 'Draft')).not.toThrow()
  })

  it('selecting Scheduled queries scheduled:true with no status', async () => {
    const el = await mount()
    listBlogPostsMock.mockClear()

    await act(async () => {
      findButton(el, 'Scheduled').click()
      await vi.advanceTimersByTimeAsync(0)
    })

    const call = listBlogPostsMock.mock.calls.at(-1)![0]
    expect(call.scheduled).toBe(true)
    expect(call.status).toBeUndefined()
  })

  it('selecting a normal status filter after Scheduled clears the scheduled param (mutually exclusive selection)', async () => {
    const el = await mount()
    await act(async () => {
      findButton(el, 'Scheduled').click()
      await vi.advanceTimersByTimeAsync(0)
    })
    listBlogPostsMock.mockClear()

    await act(async () => {
      findButton(el, 'Draft').click()
      await vi.advanceTimersByTimeAsync(0)
    })

    const call = listBlogPostsMock.mock.calls.at(-1)![0]
    expect(call.scheduled).toBeUndefined()
    expect(call.status).toBe('draft')
  })

  it('pagination retains the Scheduled filter', async () => {
    // Pagination controls only render once there's at least one item
    // to show alongside them — an empty page, even with totalPages
    // reported, wouldn't render a Next button to click.
    listBlogPostsMock.mockResolvedValue({ items: [post()], page: 1, limit: 10, total: 25, totalPages: 3 })
    const el = await mount()
    await act(async () => {
      findButton(el, 'Scheduled').click()
      await vi.advanceTimersByTimeAsync(0)
    })
    listBlogPostsMock.mockClear()

    await act(async () => {
      findButton(el, 'Next').click()
      await vi.advanceTimersByTimeAsync(0)
    })

    const call = listBlogPostsMock.mock.calls.at(-1)![0]
    expect(call.scheduled).toBe(true)
    expect(call.page).toBe(2)
  })

  it('search composes with the Scheduled filter ("Scheduled + SEO")', async () => {
    const el = await mount()
    await act(async () => {
      findButton(el, 'Scheduled').click()
      await vi.advanceTimersByTimeAsync(0)
    })
    listBlogPostsMock.mockClear()

    const searchInput = el.querySelector<HTMLInputElement>('#blog-search')!
    await act(async () => {
      setInputValue(searchInput, 'SEO')
      await vi.advanceTimersByTimeAsync(500) // past the 400ms debounce
    })

    const call = listBlogPostsMock.mock.calls.at(-1)![0]
    expect(call.scheduled).toBe(true)
    expect(call.search).toBe('SEO')
  })

  it('reads ?scheduled=true from the URL on mount (Dashboard click-through)', async () => {
    await mount(['/admin/blogs?scheduled=true'])
    const call = listBlogPostsMock.mock.calls.at(-1)![0]
    expect(call.scheduled).toBe(true)
  })
})
