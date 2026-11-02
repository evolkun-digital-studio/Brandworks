import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ArticleMarkdown from './ArticleMarkdown'
import { imageSources } from '../lib/articleImage'

const render = (content: string) => renderToStaticMarkup(<ArticleMarkdown content={content} />).replace(/ class="[^"]*"/, '')

describe('public image rendering', () => {
  it('keeps the size, alignment, wrap, caption and link set in the editor', () => {
    const html = render('<figure data-width="50" data-align="right" data-wrap="right" data-ratio="1.5"><a href="https://example.com/"><img src="https://cdn.test/a.png" alt="Alt" width="800" height="600"></a><figcaption>Cap</figcaption></figure>')
    expect(html).toContain('<figure data-width="50" data-align="right" data-wrap="right" data-ratio="1.5" style="--rc-image-width:50%;--rc-image-ratio:1.5">')
    expect(html).toContain('<figcaption>Cap</figcaption>')
    expect(html).toContain('href="https://example.com/"')
    expect(html).toContain('alt="Alt"')
    expect(html).toContain('width="800"')
    expect(html).toContain('height="600"')
    expect(html).toContain('loading="lazy"')
    expect(html).not.toContain('node=')
  })

  it('gives media library images a responsive srcset sized to their width', () => {
    const sources = imageSources('https://brandworks.test/api/media/abc123', 50, 'next')
    expect(sources?.srcSet).toContain('/_next/image?url=%2Fapi%2Fmedia%2Fabc123&w=384&q=75 384w')
    expect(sources?.srcSet).toContain('1920w')
    expect(sources?.sizes).toBe('(max-width: 680px) 100vw, 380px')
    expect(imageSources('https://cdn.test/a.png', 50, 'next')).toBeNull()
    // Tests run under the Vite build flag, which has no optimizer.
    expect(render('<figure><img src="/api/media/abc123" alt="A"></figure>')).not.toContain('srcSet')
  })

  it('leaves SVGs out of the optimizer and drops the editor marker', () => {
    const vector = render('<figure><img src="/api/media/abc123" alt="A" data-vector=""></figure>')
    expect(vector).not.toContain('srcSet')
    expect(vector).not.toContain('data-vector')
  })

  it('drops invalid layout values and anything scriptable', () => {
    const html = render('<figure data-width="500" data-align="evil" data-wrap="x" style="position:fixed" onclick="x()"><img src="javascript:alert(1)" alt="A" onerror="x()"></figure><script>x()</script>')
    expect(html).not.toMatch(/data-width|data-align|data-wrap|position:fixed|onclick|onerror|javascript:|<script/)
  })

  it('shows the formatting the editor has always offered', () => {
    const html = render('<p data-align="center"><span data-color="red" data-font-size="20px">Text</span></p><div data-layout="media-text"><figure><img src="https://cdn.test/a.png" alt="A"></figure><div><p>Side</p></div></div>')
    expect(html).toContain('<p data-align="center">')
    expect(html).toContain('data-color="red"')
    expect(html).toContain('data-font-size="20px"')
    expect(html).toContain('data-layout="media-text"')
    expect(html).toContain('<figure')
  })

  it('still renders plain Markdown images', () => {
    expect(render('![Alt](https://cdn.test/a.png)')).toContain('alt="Alt"')
  })
})
