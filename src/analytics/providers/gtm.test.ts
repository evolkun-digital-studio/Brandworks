// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  document.head.innerHTML = ''
  delete (window as { dataLayer?: unknown }).dataLayer
})

function stubAllEnvsEmpty() {
  vi.stubEnv('VITE_GTM_CONTAINER_ID', '')
  vi.stubEnv('VITE_GA_MEASUREMENT_ID', '')
}

describe('gtm provider — disabled without a container ID', () => {
  it('init() inserts no script and pushes nothing', async () => {
    stubAllEnvsEmpty()
    const { default: gtm } = await import('./gtm')
    gtm.init()
    expect(document.getElementById('gtm-script')).toBeNull()
    expect(window.dataLayer).toBeUndefined()
  })
})

describe('gtm provider — initializes when configured', () => {
  it('inserts exactly one script pointed at the configured container ID', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GTM_CONTAINER_ID', 'GTM-TEST')
    const { default: gtm } = await import('./gtm')
    gtm.init()
    const script = document.getElementById('gtm-script') as HTMLScriptElement | null
    expect(script).not.toBeNull()
    expect(script?.src).toContain('GTM-TEST')
  })

  it('initializes only once — a second init() call does not insert a second script or push gtm.start twice', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GTM_CONTAINER_ID', 'GTM-TEST')
    const { default: gtm } = await import('./gtm')
    gtm.init()
    gtm.init()
    expect(document.querySelectorAll('#gtm-script')).toHaveLength(1)
    const dataLayer = window.dataLayer as unknown[]
    const startEvents = dataLayer.filter(
      (entry) => typeof entry === 'object' && entry !== null && (entry as { event?: string }).event === 'gtm.js',
    )
    expect(startEvents).toHaveLength(1)
  })
})

describe('gtm provider — trackPageView pushes to dataLayer', () => {
  it('pushes a page_view event object', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GTM_CONTAINER_ID', 'GTM-TEST')
    const { default: gtm } = await import('./gtm')
    gtm.init()
    gtm.trackPageView({ path: '/blog', location: 'https://example.com/blog', title: 'Blog' })
    const dataLayer = window.dataLayer as Record<string, unknown>[]
    const pv = dataLayer.find((entry) => entry.event === 'page_view')
    expect(pv).toEqual({
      event: 'page_view',
      page_location: 'https://example.com/blog',
      page_path: '/blog',
      page_title: 'Blog',
    })
  })
})

describe('GTM does not duplicate direct GA4 (Part 8)', () => {
  it('when both VITE_GTM_CONTAINER_ID and VITE_GA_MEASUREMENT_ID are set, only the GTM script is inserted — never a second, direct ga4-script', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GTM_CONTAINER_ID', 'GTM-TEST')
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')

    const { default: gtm } = await import('./gtm')
    const { default: ga4 } = await import('./ga4')

    gtm.init()
    ga4.init()

    expect(document.getElementById('gtm-script')).not.toBeNull()
    expect(document.getElementById('ga4-script')).toBeNull()
  })
})
