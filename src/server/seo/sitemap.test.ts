import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only',()=>({}))
import { buildSitemapXml, composeSitemapEntries, resolveSitemapLoc } from './sitemap'

describe('sitemap composition',()=>{
  const origin='https://site.example.test'
  const updatedAt=new Date('2026-01-02T03:04:05.000Z')
  it('includes static routes and eligible supplied posts, deduplicating canonical URLs',()=>{
    const entries=composeSitemapEntries([
      {slug:'one',canonicalUrl:null,updatedAt},
      {slug:'two',canonicalUrl:origin+'/blog/custom',updatedAt},
      {slug:'duplicate',canonicalUrl:origin+'/blog/custom',updatedAt},
    ],origin)
    expect(entries).toEqual([
      {loc:origin+'/'},{loc:origin+'/blog'},
      {loc:origin+'/blog/one',lastmod:updatedAt.toISOString()},
      {loc:origin+'/blog/custom',lastmod:updatedAt.toISOString()},
    ])
  })
  it('excludes foreign canonicals and falls back for malformed canonicals',()=>{
    expect(resolveSitemapLoc({slug:'foreign',canonicalUrl:'https://elsewhere.example/a'},origin)).toBeNull()
    expect(resolveSitemapLoc({slug:'bad',canonicalUrl:'not a url'},origin)).toBe(origin+'/blog/bad')
  })
  it('serializes escaped XML with the established declaration and namespace',()=>{
    const xml=buildSitemapXml([{loc:origin+'/blog/a?x=1&y=2',lastmod:updatedAt.toISOString()}])
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
    expect(xml).toContain('&amp;')
    expect(xml).toContain('<lastmod>2026-01-02T03:04:05.000Z</lastmod>')
  })
})
