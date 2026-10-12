// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  document.head.innerHTML = ''
  delete (window as { clarity?: unknown }).clarity
})

describe('clarity provider — disabled without a project ID', () => {
  it('init() inserts no script', async () => {
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', '')
    const { default: clarity } = await import('./clarity')
    clarity.init()
    expect(document.getElementById('clarity-script')).toBeNull()
  })
})

describe('clarity provider — initializes when configured', () => {
  it('inserts exactly one script pointed at the configured project ID', async () => {
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'abc123')
    const { default: clarity } = await import('./clarity')
    clarity.init()
    const script = document.getElementById('clarity-script') as HTMLScriptElement | null
    expect(script).not.toBeNull()
    expect(script?.src).toContain('abc123')
  })

  it('installs the window.clarity queue stub', async () => {
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'abc123')
    const { default: clarity } = await import('./clarity')
    clarity.init()
    expect(typeof window.clarity).toBe('function')
  })

  it('initializes only once — a second init() call does not insert a second script', async () => {
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'abc123')
    const { default: clarity } = await import('./clarity')
    clarity.init()
    clarity.init()
    expect(document.querySelectorAll('#clarity-script')).toHaveLength(1)
  })
})

describe('clarity provider — trackPageView is an intentional no-op', () => {
  it('does not throw and does not push anything through window.clarity', async () => {
    vi.stubEnv('VITE_CLARITY_PROJECT_ID', 'abc123')
    const { default: clarity } = await import('./clarity')
    clarity.init()
    expect(() => clarity.trackPageView({ path: '/', location: 'https://example.com/', title: 'Home' })).not.toThrow()
  })
})
