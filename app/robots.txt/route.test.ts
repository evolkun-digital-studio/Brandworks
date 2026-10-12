import { describe, expect, it, vi } from 'vitest'

vi.mock('../../src/server/config/env',()=>({resolvePublicOrigin:()=> 'https://site.example.test'}))
import { GET } from './route'

describe('GET /robots.txt',()=>{
  it('returns the reference robots rules and cache semantics',async()=>{
    const response=await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600')
    expect(await response.text()).toContain('Disallow: /api/admin\n')
    expect(await (await GET()).text()).toContain('Sitemap: https://site.example.test/sitemap.xml')
  })
})
