import { describe, expect, it } from 'vitest'
import { buildRobotsTxt } from './robots.js'

describe('buildRobotsTxt', () => {
  const body = buildRobotsTxt('https://brandworks.com')

  it('disallows the admin SPA route', () => {
    expect(body).toContain('Disallow: /admin')
  })

  it('disallows the admin API', () => {
    expect(body).toContain('Disallow: /api/admin')
  })

  it('does not disallow /blog', () => {
    expect(body).not.toMatch(/Disallow:\s*\/blog\b/)
  })

  it('does not disallow the public blog API', () => {
    expect(body).not.toMatch(/Disallow:\s*\/api\/blogs?\b/)
  })

  it('allows crawling generally', () => {
    expect(body).toContain('Allow: /')
  })

  it('points to the sitemap at the given public origin', () => {
    expect(body).toContain('Sitemap: https://brandworks.com/sitemap.xml')
  })

  it('is deterministic — same input, same output', () => {
    expect(buildRobotsTxt('https://brandworks.com')).toBe(body)
  })

  it('never hardcodes a domain — reflects whatever origin it is given', () => {
    const other = buildRobotsTxt('https://staging.example.com')
    expect(other).toContain('Sitemap: https://staging.example.com/sitemap.xml')
    expect(other).not.toContain('brandworks.com')
  })
})
