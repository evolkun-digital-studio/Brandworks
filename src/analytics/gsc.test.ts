// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  document.head.innerHTML = ''
})

describe('GSC verification meta tag — absent without a token', () => {
  it('emits no meta[name="google-site-verification"] tag', async () => {
    vi.stubEnv('VITE_GSC_VERIFICATION', '')
    const { applyGscVerification } = await import('./gsc')
    applyGscVerification()
    expect(document.querySelector('meta[name="google-site-verification"]')).toBeNull()
  })
})

describe('GSC verification meta tag — present with a token', () => {
  it('emits the tag with the configured token as its content', async () => {
    vi.stubEnv('VITE_GSC_VERIFICATION', 'my-verification-token')
    const { applyGscVerification } = await import('./gsc')
    applyGscVerification()
    const meta = document.querySelector('meta[name="google-site-verification"]')
    expect(meta?.getAttribute('content')).toBe('my-verification-token')
  })

  it('is never duplicated — calling it more than once (e.g. React StrictMode) leaves exactly one tag', async () => {
    vi.stubEnv('VITE_GSC_VERIFICATION', 'my-verification-token')
    const { applyGscVerification } = await import('./gsc')
    applyGscVerification()
    applyGscVerification()
    applyGscVerification()
    expect(document.querySelectorAll('meta[name="google-site-verification"]')).toHaveLength(1)
  })
})
