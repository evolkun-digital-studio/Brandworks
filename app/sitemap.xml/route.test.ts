import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/server/config/env',()=>({resolvePublicOrigin:()=> 'https://site.example.test'}))
vi.mock('../../src/server/seo/sitemap',()=>({
  buildSitemapEntries:vi.fn(async()=>[{loc:'https://site.example.test/',lastmod:'2026-01-01T00:00:00.000Z'}]),
  buildSitemapXml:vi.fn(()=>'<urlset>fixture</urlset>\n'),
}))
import { GET } from './route'
import { buildSitemapEntries, buildSitemapXml } from '../../src/server/seo/sitemap'

describe('GET /sitemap.xml',()=>{
  beforeEach(()=>vi.clearAllMocks())
  it('returns XML with the reference cache and content-type semantics',async()=>{
    const response=await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/xml; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('public, max-age=300')
    expect(await response.text()).toBe('<urlset>fixture</urlset>\n')
    expect(buildSitemapEntries).toHaveBeenCalledWith('https://site.example.test')
    expect(buildSitemapXml).toHaveBeenCalledOnce()
  })
})
