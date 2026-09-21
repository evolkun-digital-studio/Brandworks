// @vitest-environment jsdom
import { act } from 'react'
import type { ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Home renders every homepage section — none of them are relevant to
// what this file tests (its own title/description/canonical effect),
// and several do real data fetching (Blog.tsx) or use
// IntersectionObserver (Hero.tsx/About.tsx/Videography.tsx's videos, unavailable in
// jsdom) — mocked out to keep this test scoped and deterministic.
for (const mod of ['Hero', 'Services', 'About', 'Work', 'Videography', 'PRReputation', 'Capabilities', 'Results', 'FAQs', 'Blog', 'Industries', 'Testimonials', 'Contact', 'CTA']) {
  vi.doMock(`./${mod}`, () => ({ default: () => null }))
}

const { Home } = await import('./App')
const { default: NotFound } = await import('./NotFound')

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  if (root) act(() => root?.unmount())
  container?.remove()
  container = null
  root = null
  document.title = ''
  document.head.innerHTML = ''
})

function mount(node: ReactElement) {
  container = document.createElement('div')
  document.body.appendChild(container)
  act(() => {
    root = createRoot(container!)
    root!.render(node)
  })
  return container
}

function canonicalHref(): string | null {
  return document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null
}

describe('Home — static SEO fallback replaced by a real per-mount effect (Phase 13, Part 5/14)', () => {
  it('sets title, description, and a canonical pointing at the origin root on mount', () => {
    mount(<Home />)
    expect(document.title).toBe('BRANDWORKS')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
      'We help brands build a stronger presence',
    )
    expect(canonicalHref()).toBe(`${window.location.origin}/`)
  })

  it('removes description and canonical on unmount, so a page that navigates away and never sets its own leaves nothing stale', () => {
    const el = mount(<Home />)
    act(() => root?.unmount())
    root = null
    el.remove()
    container = null
    expect(document.querySelector('meta[name="description"]')).toBeNull()
    expect(canonicalHref()).toBeNull()
  })
})

describe('Public catch-all route (Phase 13, Part 1/15)', () => {
  it('renders NotFound for a path that matches no real route', () => {
    const el = mount(
      <MemoryRouter initialEntries={['/this-page-does-not-exist']}>
        <Routes>
          <Route path="/blog" element={<div>blog</div>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(el.textContent).toContain('Page Not Found')
  })

  it('sets a noindex robots tag and a "Page Not Found" title', () => {
    mount(
      <MemoryRouter initialEntries={['/nope']}>
        <Routes>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(document.title).toBe('Page Not Found | BRANDWORKS')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,nofollow')
  })

  it('does not render for a real route', () => {
    const el = mount(
      <MemoryRouter initialEntries={['/blog']}>
        <Routes>
          <Route path="/blog" element={<div>the real blog page</div>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(el.textContent).toBe('the real blog page')
    expect(el.textContent).not.toContain('Page Not Found')
  })
})
