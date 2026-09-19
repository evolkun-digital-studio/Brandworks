// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  document.head.innerHTML = ''
  delete (window as { dataLayer?: unknown }).dataLayer
})

function stubAllEnvsEmpty() {
  for (const key of ['VITE_GA_MEASUREMENT_ID', 'VITE_GTM_CONTAINER_ID']) {
    vi.stubEnv(key, '')
  }
}

describe('ga4 provider — disabled without a measurement ID', () => {
  it('init() inserts no script', async () => {
    stubAllEnvsEmpty()
    const { default: ga4 } = await import('./ga4')
    ga4.init()
    expect(document.getElementById('ga4-script')).toBeNull()
  })
})

describe('ga4 provider — initializes when configured', () => {
  it('inserts exactly one script pointed at the configured measurement ID', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    const { default: ga4 } = await import('./ga4')
    ga4.init()
    const script = document.getElementById('ga4-script') as HTMLScriptElement | null
    expect(script).not.toBeNull()
    expect(script?.src).toContain('G-TEST123')
  })

  it('configures gtag with send_page_view: false — this codebase owns page_view timing, not gtag.js', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    const { default: ga4 } = await import('./ga4')
    ga4.init()
    const dataLayer = window.dataLayer as unknown[]
    const configCall = dataLayer.find((entry) => Array.isArray(entry) && entry[0] === 'config')
    expect(configCall).toEqual(['config', 'G-TEST123', { send_page_view: false }])
  })

  it('initializes only once — a second init() call does not insert a second script or push a second config', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    const { default: ga4 } = await import('./ga4')
    ga4.init()
    ga4.init()
    expect(document.querySelectorAll('#ga4-script')).toHaveLength(1)
    const dataLayer = window.dataLayer as unknown[]
    const configCalls = dataLayer.filter((entry) => Array.isArray(entry) && entry[0] === 'config')
    expect(configCalls).toHaveLength(1)
  })

  it('is disabled (no script, no config) when a GTM container also owns GA4 delivery', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    vi.stubEnv('VITE_GTM_CONTAINER_ID', 'GTM-TEST')
    const { default: ga4 } = await import('./ga4')
    ga4.init()
    expect(document.getElementById('ga4-script')).toBeNull()
  })
})

describe('ga4 provider — trackPageView', () => {
  it('pushes a page_view event with page_location/page_path/page_title', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    const { default: ga4 } = await import('./ga4')
    ga4.init()
    ga4.trackPageView({ path: '/blog', location: 'https://example.com/blog', title: 'Blog | BRANDWORKS' })
    const dataLayer = window.dataLayer as unknown[]
    const eventCall = dataLayer.find((entry) => Array.isArray(entry) && entry[0] === 'event' && entry[1] === 'page_view')
    expect(eventCall).toEqual([
      'event',
      'page_view',
      { page_location: 'https://example.com/blog', page_path: '/blog', page_title: 'Blog | BRANDWORKS' },
    ])
  })

  it('does nothing when disabled', async () => {
    stubAllEnvsEmpty()
    const { default: ga4 } = await import('./ga4')
    ga4.trackPageView({ path: '/', location: 'https://example.com/', title: 'Home' })
    expect(window.dataLayer).toBeUndefined()
  })
})

describe('ga4 provider — error safety', () => {
  it('trackEvent never throws even if the DOM/window state is unusable', async () => {
    stubAllEnvsEmpty()
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123')
    const { default: ga4 } = await import('./ga4')
    ga4.init()
    expect(() => ga4.trackEvent({ name: 'custom_event', params: { foo: 'bar' } })).not.toThrow()
  })
})
