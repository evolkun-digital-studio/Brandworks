import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only',()=>({}))
vi.mock('../repositories/blog.repository',()=>({listSitemapEligibleBlogs:vi.fn()}))
import { listSitemapEligibleBlogs } from '../repositories/blog.repository'
import { SITEMAP_EXCLUDED_PATHS, STATIC_PUBLIC_PATHS, buildSitemapEntries, buildSitemapXml, composeSitemapEntries, resolveSitemapLoc } from './sitemap'

/** Static page routes under app/(public): every page.tsx outside a [dynamic] segment. */
function publicPageRoutes(root=join(process.cwd(),'app','(public)')):string[]{
  const routes:string[]=[]
  const walk=(dir:string)=>{
    for(const name of readdirSync(dir)){
      const full=join(dir,name)
      if(statSync(full).isDirectory()){if(!name.startsWith('['))walk(full);continue}
      if(name!=='page.tsx')continue
      const segments=relative(root,dir).split(sep).filter(seg=>seg&&!/^\(.*\)$/.test(seg))
      routes.push('/'+segments.join('/'))
    }
  }
  walk(root)
  return routes.sort()
}

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
      ...STATIC_PUBLIC_PATHS.map(path=>({loc:origin+path})),
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
  it('lists every public page route (add new pages to STATIC_PUBLIC_PATHS)',()=>{
    const listed=new Set<string>([...STATIC_PUBLIC_PATHS,...SITEMAP_EXCLUDED_PATHS])
    const missing=publicPageRoutes().filter(route=>!listed.has(route))
    expect(missing).toEqual([])
  })
  it('lists no route that does not exist',()=>{
    const routes=new Set(publicPageRoutes())
    expect(STATIC_PUBLIC_PATHS.filter(path=>!routes.has(path))).toEqual([])
  })
  it('serves the static pages within the timeout when the database hangs',async()=>{
    vi.mocked(listSitemapEligibleBlogs).mockReturnValueOnce(new Promise(()=>{}))
    const error=vi.spyOn(console,'error').mockImplementation(()=>{})
    const entries=await buildSitemapEntries(origin,20)
    expect(entries.map(entry=>entry.loc)).toEqual(STATIC_PUBLIC_PATHS.map(path=>origin+path))
    error.mockRestore()
  })
  it('still serves the static pages when blog posts cannot be loaded',async()=>{
    vi.mocked(listSitemapEligibleBlogs).mockRejectedValueOnce(new Error('mongo down'))
    const error=vi.spyOn(console,'error').mockImplementation(()=>{})
    const entries=await buildSitemapEntries(origin)
    expect(entries.map(entry=>entry.loc)).toEqual(STATIC_PUBLIC_PATHS.map(path=>origin+path))
    expect(error).toHaveBeenCalledOnce()
    error.mockRestore()
  })
})
