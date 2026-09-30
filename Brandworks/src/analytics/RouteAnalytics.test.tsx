// @vitest-environment jsdom
import { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const initAnalyticsMock = vi.fn()
const trackPageViewMock = vi.fn()
const applyGscVerificationMock = vi.fn()

vi.mock('./analytics', () => ({
  initAnalytics: () => initAnalyticsMock(),
  trackPageView: (event: unknown) => trackPageViewMock(event),
  trackEvent: vi.fn(),
  trackBlogArticleView: vi.fn(),
}))
vi.mock('./gsc', () => ({
  applyGscVerification: () => applyGscVerificationMock(),
}))

const { default: RouteAnalytics } = await import('./RouteAnalytics.tsx')

beforeEach(() => {
  initAnalyticsMock.mockClear()
  trackPageViewMock.mockClear()
  applyGscVerificationMock.mockClear()
})

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  if (root) act(() => root?.unmount())
  container?.remove()
  container = null
  root = null
})

function NavButtons() {
  const navigate = useNavigate()
  return (
    <>
      <button data-testid="go-blog" onClick={() => navigate('/blog')} />
      <button data-testid="go-article" onClick={() => navigate('/blog/my-post')} />
      <button data-testid="go-home" onClick={() => navigate('/')} />
    </>
  )
}

function TestTree({ initialPath, strict = false }: { initialPath: string; strict?: boolean }) {
  const tree = (
    <MemoryRouter initialEntries={[initialPath]}>
      <RouteAnalytics />
      <NavButtons />
      <Routes>
        <Route path="/" element={<div>home</div>} />
        <Route path="/blog" element={<div>blog</div>} />
        <Route path="/blog/:slug" element={<div>article</div>} />
      </Routes>
    </MemoryRouter>
  )
  return strict ? <StrictMode>{tree}</StrictMode> : tree
}

function mount(initialPath: string, options: { strict?: boolean } = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  act(() => {
    root = createRoot(container!)
    root!.render(<TestTree initialPath={initialPath} strict={options.strict} />)
  })
  return container
}

describe('RouteAnalytics — initial mount', () => {
  it('calls initAnalytics() and applyGscVerification() once', () => {
    mount('/')
    expect(initAnalyticsMock).toHaveBeenCalledTimes(1)
    expect(applyGscVerificationMock).toHaveBeenCalledTimes(1)
  })

  it('tracks exactly one page view for the initial public route', () => {
    mount('/blog')
    expect(trackPageViewMock).toHaveBeenCalledTimes(1)
    expect(trackPageViewMock.mock.calls[0][0]).toMatchObject({ path: '/blog' })
  })

  it('does not double-track the initial page view under React StrictMode', () => {
    mount('/', { strict: true })
    expect(trackPageViewMock).toHaveBeenCalledTimes(1)
    expect(initAnalyticsMock).toHaveBeenCalledTimes(1)
  })
})

describe('RouteAnalytics — navigation', () => {
  it('tracks a new page view when navigating to a different public route', () => {
    const el = mount('/')
    expect(trackPageViewMock).toHaveBeenCalledTimes(1)

    act(() => {
      el.querySelector<HTMLButtonElement>('[data-testid="go-blog"]')!.click()
    })

    expect(trackPageViewMock).toHaveBeenCalledTimes(2)
    expect(trackPageViewMock.mock.calls[1][0]).toMatchObject({ path: '/blog' })
  })

  it('tracks a distinct page view for a dynamic /blog/:slug route', () => {
    const el = mount('/blog')
    act(() => {
      el.querySelector<HTMLButtonElement>('[data-testid="go-article"]')!.click()
    })
    expect(trackPageViewMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: '/blog/my-post' }),
    )
  })

  it('never sends the backend origin (:4001) — location is always window.location.href on the public frontend origin', () => {
    const el = mount('/')
    act(() => {
      el.querySelector<HTMLButtonElement>('[data-testid="go-blog"]')!.click()
    })
    for (const call of trackPageViewMock.mock.calls) {
      expect((call[0] as { location: string }).location).not.toContain('4001')
    }
  })
})
