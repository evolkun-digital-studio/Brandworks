import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Link as RouterLink, MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PerformanceMarketingPage, { RENDERED_SECTION_IDS, SERVICE_INDEX } from './PerformanceMarketingPage'
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
          <Route
            path="/services/performance-marketing"
            element={<>
              <PerformanceMarketingPage />
              {/* Same router Link a service-index entry renders, used to drive real in-page hash navigation. */}
              <nav data-test-nav>{[...RENDERED_SECTION_IDS].map(id => <RouterLink key={id} to={`#${id}`}>{id}</RouterLink>)}</nav>
            </>}
          />
          <Route path="/contact" element={<h1>Contact</h1>} />
          <Route path="/services/seo" element={<h1>SEO</h1>} />
        </Routes>
      </ViteNavigationProvider>
    </MemoryRouter>,
  ))
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

  it('supports direct links to a section on load', () => {
    mount('#pm-approach')
    expect(document.activeElement?.id).toBe('pm-approach')
  })

  it('RENDERED_SECTION_IDS matches the sections the page actually renders', () => {
    mount()
    const rendered = Array.from(container.querySelectorAll<HTMLElement>('main > section[id]')).map(section => section.id)
    expect(new Set(rendered)).toEqual(RENDERED_SECTION_IDS)
  })

  it('in-page hash navigation scrolls to and focuses each rendered section', () => {
    mount()
    for (const id of RENDERED_SECTION_IDS) {
      const link = container.querySelector<HTMLAnchorElement>(`[data-test-nav] a[href$="#${id}"]`)!
      act(() => link.click())
      expect(document.activeElement?.id).toBe(id)
      expect(document.activeElement?.tagName).toBe('SECTION')
    }
  })

  it('lists all 16 offerings in order, linking only those whose section is rendered', () => {
    mount()
    const items = Array.from(container.querySelectorAll<HTMLLIElement>('.pm-service-index > li'))
    expect(items).toHaveLength(16)
    expect(SERVICE_INDEX).toHaveLength(16)
    SERVICE_INDEX.forEach(({ label, target }, index) => {
      const item = items[index]
      expect(item.textContent).toContain(String(index + 1).padStart(2, '0'))
      expect(item.textContent).toContain(label)
      const link = item.querySelector<HTMLAnchorElement>('a')
      if (RENDERED_SECTION_IDS.has(target)) {
        expect(link?.hash).toBe(`#${target}`)
      } else {
        // Accessible, non-interactive text: no link, nothing focusable, no "go" arrow.
        expect(link).toBeNull()
        expect(item.querySelector('[href], [tabindex], [role="link"], button')).toBeNull()
        expect(item.querySelector('.pm-index-arrow')).toBeNull()
        expect(item.querySelector('.pm-index-item')).not.toBeNull()
      }
    })
  })

  it('every service-index link resolves and navigates to its section', () => {
    mount()
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('.pm-service-index a'))
    // Currently zero: every offering's section is retired (see RENDERED_SECTION_IDS).
    expect(links).toHaveLength(SERVICE_INDEX.filter(({ target }) => RENDERED_SECTION_IDS.has(target)).length)
    for (const link of links) {
      const target = container.querySelector<HTMLElement>(link.hash)
      expect(target).not.toBeNull()
      act(() => link.click())
      expect(document.activeElement).toBe(target)
    }
  })

  // The creative lab (section 06), landing-page comparison (09) and FAQ (23)
  // were retired from the page in commit de6ad02 — see
  // docs/decisions/2026-11-06-performance-marketing-retired-sections.md.
  // These replace the two tests that exercised them.
  it('the retired creative lab, landing-page comparison and FAQ leave no orphaned controls or copy', () => {
    mount()
    expect(container.querySelector('button[aria-pressed]')).toBeNull()
    expect(container.querySelectorAll('details')).toHaveLength(0)
    for (const selector of ['.pm-creative-preview', '.pm-variant', '.pm-wireframe', '.pm-faq-list']) {
      expect(container.querySelector(selector)).toBeNull()
    }
    expect(container.textContent).not.toContain('Do you guarantee results?')
    expect(container.textContent).not.toContain('advertising outcomes should not be guaranteed')
  })

  it('the performance system lists every stage in order, starting on Research', () => {
    mount()
    const stages = Array.from(container.querySelectorAll<HTMLElement>('#pm-system [data-pm-stage]')).map(stage => stage.dataset.pmStage)
    expect(stages).toEqual(['Research', 'Offer', 'Audience', 'Creative', 'Media', 'Landing Page', 'Tracking', 'Conversion', 'Optimization', 'Scale'])
    expect(container.querySelector('#pm-system [data-pm-active-stage]')?.textContent).toBe('Research')
  })
})
