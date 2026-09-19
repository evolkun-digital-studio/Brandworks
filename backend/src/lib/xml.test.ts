import { describe, expect, it } from 'vitest'
import { buildSitemapXml, escapeXmlText } from './xml.js'

describe('escapeXmlText', () => {
  it('escapes all five XML-significant characters', () => {
    expect(escapeXmlText(`< > & " '`)).toBe('&lt; &gt; &amp; &quot; &apos;')
  })

  it('escapes & before the entities it introduces, so nothing double-escapes', () => {
    expect(escapeXmlText('<')).toBe('&lt;')
    expect(escapeXmlText('&lt;')).toBe('&amp;lt;')
  })

  it('leaves ordinary text untouched', () => {
    expect(escapeXmlText('hello world 123')).toBe('hello world 123')
  })
})

describe('buildSitemapXml', () => {
  it('produces a valid XML declaration and urlset root with the correct namespace', () => {
    const xml = buildSitemapXml([{ loc: 'https://brandworks.com/' }])
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true)
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml.trim().endsWith('</urlset>')).toBe(true)
  })

  it('emits one <url><loc> block per entry', () => {
    const xml = buildSitemapXml([
      { loc: 'https://brandworks.com/' },
      { loc: 'https://brandworks.com/blog' },
    ])
    expect(xml.match(/<url>/g)).toHaveLength(2)
    expect(xml).toContain('<loc>https://brandworks.com/</loc>')
    expect(xml).toContain('<loc>https://brandworks.com/blog</loc>')
  })

  it('includes <lastmod> only when provided — never invents one', () => {
    const xml = buildSitemapXml([
      { loc: 'https://brandworks.com/blog/a', lastmod: '2026-09-01T00:00:00.000Z' },
      { loc: 'https://brandworks.com/blog' },
    ])
    expect(xml).toContain('<lastmod>2026-09-01T00:00:00.000Z</lastmod>')
    // The second entry has no lastmod at all — only one <lastmod> total.
    expect(xml.match(/<lastmod>/g)).toHaveLength(1)
  })

  it('escapes a dynamic value that contains XML-significant characters', () => {
    const xml = buildSitemapXml([{ loc: 'https://brandworks.com/blog/a?x=1&y=2' }])
    expect(xml).toContain('<loc>https://brandworks.com/blog/a?x=1&amp;y=2</loc>')
    expect(xml).not.toContain('x=1&y=2')
  })

  it('produces a well-formed (parseable) urlset even with an empty entry list', () => {
    const xml = buildSitemapXml([])
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>')
    expect(xml).not.toContain('<url>')
  })
})
