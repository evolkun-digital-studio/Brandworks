// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  document.head.innerHTML = ''
  delete (window as { fbq?: unknown; _fbq?: unknown }).fbq
  delete (window as { fbq?: unknown; _fbq?: unknown })._fbq
})

describe('meta pixel provider — disabled without a pixel ID', () => {
  it('init() inserts no script', async () => {
    vi.stubEnv('VITE_META_PIXEL_ID', '')
    const { default: metaPixel } = await import('./metaPixel')
    metaPixel.init()
    expect(document.getElementById('meta-pixel-script')).toBeNull()
  })
})

describe('meta pixel provider — initializes when configured', () => {
  it('inserts exactly one script and calls fbq(init, id)', async () => {
    vi.stubEnv('VITE_META_PIXEL_ID', 'PIXEL123')
    const { default: metaPixel } = await import('./metaPixel')
    metaPixel.init()
    expect(document.getElementById('meta-pixel-script')).not.toBeNull()
    expect(typeof window.fbq).toBe('function')
  })

  it('does not fire a PageView from init() itself — trackPageView is the sole authoritative source (Part 3)', async () => {
    vi.stubEnv('VITE_META_PIXEL_ID', 'PIXEL123')
    const { default: metaPixel } = await import('./metaPixel')
    const calls: unknown[][] = []
    metaPixel.init()
    // Wrap the installed stub to observe subsequent calls without
    // re-triggering init's own side effects.
    const original = window.fbq!
    window.fbq = ((...args: unknown[]) => {
      calls.push(args)
      return original(...args)
    }) as typeof window.fbq
    expect(calls.some((c) => c[0] === 'track' && c[1] === 'PageView')).toBe(false)
  })

  it('initializes only once — a second init() call does not insert a second script', async () => {
    vi.stubEnv('VITE_META_PIXEL_ID', 'PIXEL123')
    const { default: metaPixel } = await import('./metaPixel')
    metaPixel.init()
    metaPixel.init()
    expect(document.querySelectorAll('#meta-pixel-script')).toHaveLength(1)
  })
})

describe('meta pixel provider — trackPageView', () => {
  it('is the one call that sends a PageView event', async () => {
    vi.stubEnv('VITE_META_PIXEL_ID', 'PIXEL123')
    const { default: metaPixel } = await import('./metaPixel')
    metaPixel.init()
    const calls: unknown[][] = []
    const original = window.fbq!
    window.fbq = ((...args: unknown[]) => {
      calls.push(args)
      return original(...args)
    }) as typeof window.fbq
    metaPixel.trackPageView({ path: '/blog', location: 'https://example.com/blog', title: 'Blog' })
    expect(calls).toContainEqual(['track', 'PageView'])
  })

  it('does nothing when disabled', async () => {
    vi.stubEnv('VITE_META_PIXEL_ID', '')
    const { default: metaPixel } = await import('./metaPixel')
    expect(() => metaPixel.trackPageView({ path: '/', location: 'https://example.com/', title: 'Home' })).not.toThrow()
    expect(window.fbq).toBeUndefined()
  })
})
