import { describe, expect, it } from 'vitest'
import { buildRobotsTxt } from './robots'

describe('robots.txt',()=>{
  it('preserves crawl rules and uses only the supplied public origin',()=>{
    expect(buildRobotsTxt('https://site.example.test')).toBe([
      'User-agent: *','Allow: /','Disallow: /admin','Disallow: /api/admin','',
      'Sitemap: https://site.example.test/sitemap.xml','',
    ].join('\n'))
  })
})
