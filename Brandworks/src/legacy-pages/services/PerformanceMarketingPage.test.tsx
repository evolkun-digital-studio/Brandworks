import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PerformanceMarketingPage from './PerformanceMarketingPage'
import { ViteNavigationProvider } from '../../routing/vite'

vi.mock('@gsap/react', () => ({ useGSAP: Object.assign(() => {}, { register: () => {} }) }))

const { JSDOM } = await vi.importActual<{
  JSDOM: new (html: string, options: { url: string }) => { window: Window & typeof globalThis }
}>('jsdom')

let root: Root
let container: HTMLDivElement
let testWindow: Window & typeof globalThis

beforeEach(() => {
  testWindow = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://brandworks.test' }).window
  vi.stubGlobal('window', testWindow)
  vi.stubGlobal('document', testWindow.document)
  vi.stubGlobal('HTMLElement', testWindow.HTMLElement)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  HTMLElement.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
  testWindow.close()
  vi.unstubAllGlobals()
})

function mount(hash = '') {
  act(() => root.render(
    <MemoryRouter initialEntries={[`/services/performance-marketing${hash}`]}>
      <ViteNavigationProvider>
        <Routes>
          <Route path="/services/performance-marketing" element={<PerformanceMarketingPage />} />
          <Route path="/contact" element={<h1>Contact</h1>} />
          <Route path="/services/seo" element={<h1>SEO</h1>} />
        </Routes>
      </ViteNavigationProvider>
    </MemoryRouter>,
  ))
}

function clickButton(label: string) {
  const button = Array.from(container.querySelectorAll('button')).find(item => item.textContent === label)
  expect(button).toBeDefined()
  act(() => button!.click())
  return button!
}

describe('Performance Marketing service page', () => {
  it('sets metadata and clears it when navigating to contact', () => {
    mount()
    expect(document.title).toBe('Performance Marketing Agency | BrandWorks')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('conversion optimization')
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${window.location.origin}/services/performance-marketing`)
    act(() => container.querySelector<HTMLAnchorElement>('.pm-button')!.click())
    expect(container.textContent).toBe('Contact')
    expect(document.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.querySelector('meta[property="og:title"]')).toBeNull()
  })

  it('connects all service index links to sections and supports direct approach links', () => {
    mount('#pm-approach')
    expect(document.activeElement?.id).toBe('pm-approach')
    expect(container.querySelectorAll('main > section')).toHaveLength(24)
    const links = container.querySelectorAll<HTMLAnchorElement>('.pm-service-index a')
    expect(links).toHaveLength(16)
    links.forEach(link => expect(container.querySelector(link.hash)).not.toBeNull())
    act(() => links[12].click())
    expect(document.activeElement?.id).toBe('pm-section-06')
  })

  it('updates the creative combination without resetting other choices', () => {
    mount()
    expect(clickButton('Hook C').getAttribute('aria-pressed')).toBe('true')
    clickButton('Visual B')
    clickButton('Offer B')
    clickButton('Audience 02')
    expect(container.querySelector('.pm-variant')?.textContent).toBe('Selected: H3 / V2 / O2 / A2')
    expect(container.querySelector('.pm-creative-copy h3')?.textContent).toBe('Designed for your daily rhythm.')
    expect(container.querySelector('.pm-creative-preview img')?.getAttribute('src')).toContain('photo3-720')
  })

  it('switches the landing-page concept and exposes native FAQ disclosures', () => {
    mount()
    expect(clickButton('Before / Friction').getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('.pm-wireframe h3')?.textContent).toBe('Welcome to our website.')
    clickButton('After / Clarity')
    expect(container.querySelector('.pm-wireframe')?.classList.contains('is-improved')).toBe(true)
    const disclosures = container.querySelectorAll('details')
    expect(disclosures).toHaveLength(18)
    const guarantee = disclosures[17]
    act(() => guarantee.querySelector('summary')!.click())
    expect(guarantee.open).toBe(true)
    expect(guarantee.textContent).toContain('advertising outcomes should not be guaranteed')
  })
})
