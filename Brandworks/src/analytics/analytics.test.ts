// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  document.head.innerHTML = ''
  delete (window as { dataLayer?: unknown }).dataLayer
})

function enableGtmOnly() {
  vi.stubEnv('VITE_GTM_CONTAINER_ID', 'GTM-TEST')
  vi.stubEnv('VITE_GA_MEASUREMENT_ID', '')
  vi.stubEnv('VITE_CLARITY_PROJECT_ID', '')
  vi.stubEnv('VITE_META_PIXEL_ID', '')
}

function disableAll() {
  vi.stubEnv('VITE_GTM_CONTAINER_ID', '')
  vi.stubEnv('VITE_GA_MEASUREMENT_ID', '')
  vi.stubEnv('VITE_CLARITY_PROJECT_ID', '')
  vi.stubEnv('VITE_META_PIXEL_ID', '')
}

describe('initAnalytics', () => {
  it('does nothing when no provider is configured', async () => {
    disableAll()
    const { initAnalytics } = await import('./analytics')
    initAnalytics()
    expect(document.head.children.length).toBe(0)
  })

  it('initializes the enabled provider exactly once, even if called twice', async () => {
    enableGtmOnly()
    const { initAnalytics } = await import('./analytics')
    initAnalytics()
    initAnalytics()
    expect(document.querySelectorAll('#gtm-script')).toHaveLength(1)
  })
})

describe('trackBlogArticleView — allowlisted fields only (Phase 12, Part 4/12)', () => {
  it('sends only slug/title/category/author/content_type/content_intent — nothing else', async () => {
    enableGtmOnly()
    const { initAnalytics, trackBlogArticleView } = await import('./analytics')
    initAnalytics()
    trackBlogArticleView({
      slug: 'my-post',
      title: 'My Post',
      category: 'Branding',
      author: 'Jane Doe',
      contentType: 'How-to',
      contentIntent: 'Informational',
    })
    const dataLayer = window.dataLayer as Record<string, unknown>[]
    const event = dataLayer.find((e) => e.event === 'blog_article_view')
    expect(event).toBeDefined()
    const { event: _discard, ...params } = event!
    expect(params).toEqual({
      slug: 'my-post',
      title: 'My Post',
      category: 'Branding',
      author: 'Jane Doe',
      content_type: 'How-to',
      content_intent: 'Informational',
    })
  })

  it('omits null optional fields rather than sending null', async () => {
    enableGtmOnly()
    const { initAnalytics, trackBlogArticleView } = await import('./analytics')
    initAnalytics()
    trackBlogArticleView({
      slug: 'my-post',
      title: 'My Post',
      category: null,
      author: null,
      contentType: null,
      contentIntent: null,
    })
    const dataLayer = window.dataLayer as Record<string, unknown>[]
    const event = dataLayer.find((e) => e.event === 'blog_article_view')
    const { event: _discard, ...params } = event!
    expect(Object.keys(params).sort()).toEqual(['slug', 'title'])
  })

  it('article content is never sent', async () => {
    enableGtmOnly()
    const { initAnalytics, trackBlogArticleView } = await import('./analytics')
    initAnalytics()
    trackBlogArticleView({
      slug: 'my-post',
      title: 'My Post',
      category: null,
      author: null,
      contentType: null,
      contentIntent: null,
    })
    const dataLayer = window.dataLayer as Record<string, unknown>[]
    const event = dataLayer.find((e) => e.event === 'blog_article_view')!
    expect(Object.prototype.hasOwnProperty.call(event, 'content')).toBe(false)
  })

  it('focus keyword / secondary keywords are never sent', async () => {
    enableGtmOnly()
    const { initAnalytics, trackBlogArticleView } = await import('./analytics')
    initAnalytics()
    trackBlogArticleView({
      slug: 'my-post',
      title: 'My Post',
      category: null,
      author: null,
      contentType: null,
      contentIntent: null,
    })
    const dataLayer = window.dataLayer as Record<string, unknown>[]
    const event = dataLayer.find((e) => e.event === 'blog_article_view')!
    const raw = JSON.stringify(event)
    expect(raw).not.toContain('focusKeyword')
    expect(raw).not.toContain('secondaryKeywords')
    expect(raw).not.toContain('focus_keyword')
  })

  it('no internal MongoDB id is ever sent — the event type has no id field at all', async () => {
    enableGtmOnly()
    const { initAnalytics, trackBlogArticleView } = await import('./analytics')
    initAnalytics()
    trackBlogArticleView({
      slug: 'my-post',
      title: 'My Post',
      category: null,
      author: null,
      contentType: null,
      contentIntent: null,
    })
    const dataLayer = window.dataLayer as Record<string, unknown>[]
    const event = dataLayer.find((e) => e.event === 'blog_article_view')!
    expect(Object.prototype.hasOwnProperty.call(event, 'id')).toBe(false)
  })
})

describe('trackEvent — error safety (Phase 12, Part 16)', () => {
  it('never throws into the caller even if a provider misbehaves (e.g. blocked by an extension)', async () => {
    enableGtmOnly()
    const { initAnalytics, trackEvent } = await import('./analytics')
    initAnalytics()
    window.dataLayer = {
      push: () => {
        throw new Error('blocked by an extension')
      },
    } as unknown as unknown[]
    expect(() => trackEvent({ name: 'contact_cta_click' })).not.toThrow()
  })

  it('trackPageView never throws even with no provider configured', async () => {
    disableAll()
    const { trackPageView } = await import('./analytics')
    expect(() =>
      trackPageView({ path: '/', location: 'https://example.com/', title: 'Home' }),
    ).not.toThrow()
  })
})
