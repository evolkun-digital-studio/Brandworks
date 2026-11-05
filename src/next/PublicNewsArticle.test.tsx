// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { ViteNavigationProvider } from '../routing/vite'
import PublicNewsArticle from './PublicNewsArticle'
import { legacyEditorialRecords } from '../server/services/public-blog-migration'

vi.mock('server-only', () => ({}))

describe('CMS newsroom content rendering', () => {
  it('renders Markdown and uploaded images while stripping executable HTML', () => {
    const post = { ...legacyEditorialRecords().find((p) => p.contentType === 'newsroom')!, content: '## Real heading\n\n**Real body**\n\n<script>alert(1)</script>\n\n<img src="https://example.test/photo.jpg" onerror="alert(2)">\n\n[Unsafe](javascript:alert(3))' }
    const html = renderToStaticMarkup(<MemoryRouter><ViteNavigationProvider><PublicNewsArticle post={post} related={[]} /></ViteNavigationProvider></MemoryRouter>)
    expect(html).toContain('Real heading')
    expect(html).toContain('<strong>Real body</strong>')
    expect(html).toContain('https://example.test/photo.jpg')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('javascript:')
    expect(html).toContain('href="/news"')
  })
})
