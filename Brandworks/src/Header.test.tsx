// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Header from './Header'

/**
 * The logo previously had href="#" despite its aria-label already
 * claiming "Brandworks home" — a real, crawlable link back to / is
 * what makes any page reachable from every other public page (Phase
 * 13, Part 9). Real rendered output (not source-text inspection),
 * since react-router's <Link> is what actually needs to be exercised
 * here to confirm it renders a genuine <a href="/">.
 */
describe('Header — logo link', () => {
  it('renders a real anchor with href="/" for the logo, not a bare "#" placeholder', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )
    const match = html.match(/<a[^>]*aria-label="Brandworks home"[^>]*>/)
    expect(match).not.toBeNull()
    expect(match?.[0]).toContain('href="/"')
  })

  it('still renders a real, crawlable link to /blog in the primary nav', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )
    expect(html).toContain('href="/blog"')
  })
})
