// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KeyPageCheck, PagesData, SiteScanDetail as Detail } from '../../server/site-scan/types'

const ID = '6ad9b9f9a0236f993c866e77'
const api = vi.hoisted(() => ({ getSiteScan: vi.fn(), rescanSiteScan: vi.fn(), deleteSiteScan: vi.fn() }))
const auth = vi.hoisted(() => ({ role: 'admin' }))

vi.mock('../api/siteScanAdminApi', () => api)
vi.mock('../context/useAdminAuth', () => ({ useAdminAuth: () => ({ admin: { id: '1', username: 'x', role: auth.role } }) }))

const { default: SiteScanDetail } = await import('./SiteScanDetail')
const { ViteNavigationProvider } = await import('../../routing/vite')

const at = '2026-10-20T00:00:00.000Z'
const check = (over: Partial<KeyPageCheck> = {}): KeyPageCheck => ({
  htmlTruncated: false,
  title: { text: 'A title', length: 7 },
  metaDescription: { text: 'A description', length: 13 },
  h1Count: 1,
  canonical: 'https://chaico.in/about',
  noindex: false,
  wordCount: 300,
  images: { total: 3, missingAlt: 1 },
  jsonLdTypes: [],
  hasForm: true,
  contactLinks: { email: ['a@chaico.in'], phone: [], whatsapp: [] },
  ctaTexts: ['Book a call'],
  ...over,
})
const pages: PagesData = {
  homepage: { url: 'https://chaico.in/', statusCode: 200, check: check() },
  pages: [
    { group: 'about', url: 'https://chaico.in/about', finalUrl: 'https://chaico.in/about', statusCode: 200, error: null, check: check({ title: { text: '<img src=x onerror=alert(1)>', length: 28 }, h1Count: 2, noindex: true }) },
    { group: 'blog', url: 'https://chaico.in/blog', finalUrl: null, statusCode: null, error: 'Timed out reading the page', check: null },
    { group: 'services', url: 'javascript:alert(1)', finalUrl: null, statusCode: 200, error: null, check: check() },
  ],
  discovery: { homepageLinks: 12, sitemapUrls: 4 },
  summary: {
    groupsFound: ['about'],
    groupsNotFound: ['contact'],
    groupsNotChecked: ['pricing'],
    duplicateTitles: [{ text: 'Same title', urls: ['https://chaico.in/a', 'https://chaico.in/b'] }],
    duplicateMetaDescriptions: [],
    noindex: [],
    missingTitle: [],
    missingMetaDescription: [],
    missingH1: [],
    contactMethods: { form: true, phone: false, email: true, whatsapp: false },
    pagesCrawled: 2,
    pagesFailed: 1,
    pagesChecked: 3,
    blockedByRobots: [],
    truncated: false,
    note: null,
  },
}
const ok = <T,>(source: string, data: T) => ({ status: 'ok' as const, source, fetchedAt: at, data })
const skipped = (source: string, reason: string) => ({ status: 'skipped' as const, source, fetchedAt: at, data: null, reason })

const scan = (over: Partial<Detail> = {}): Detail => ({
  id: ID,
  domain: 'chaico.in',
  url: 'https://chaico.in/',
  status: 'done',
  stale: false,
  createdAt: at,
  updatedAt: at,
  cachedUntil: '2026-10-27T00:00:00.000Z',
  expiresAt: '2026-10-28T00:00:00.000Z',
  paidSources: true,
  error: null,
  analysis: { headline: 'The headline', strengths: ['Strong'], issues: [{ title: 'Issue', evidence: 'Proof', impact: 'Matters' }], opportunities: ['Chance'], customerTeaser: 'The teaser', ai: true, droppedItems: 2 },
  submissions: [{ id: 's1', name: 'Asha', email: 'a@chaico.in', company: 'Chai Co', submittedAt: at, branch: 'redesign' }],
  results: {
    url: 'https://chaico.in/',
    domain: 'chaico.in',
    onPage: skipped('Homepage HTML', 'site unreachable'),
    pages: ok('Key pages', pages),
    performance: skipped('Google PageSpeed Insights', 'quota reached'),
    authority: ok('Moz API', { provider: 'moz' as const, domainAuthority: 45, pageAuthority: 30, spamScore: 1, linkingRootDomains: 20, externalLinks: 90 }),
    traffic: ok('DataForSEO Labs (estimated)', { estimatedOrganicTraffic: 1200, rankingKeywords: 80, locationCode: 2356, location: 'India', languageCode: 'en' }),
  },
  ...over,
})

let container: HTMLDivElement | null = null
let root: Root | null = null

async function mount(detail: Detail) {
  api.getSiteScan.mockResolvedValue({ scan: detail })
  container = document.createElement('div')
  document.body.appendChild(container)
  await act(async () => {
    root = createRoot(container!)
    root!.render(
      <MemoryRouter initialEntries={[`/admin/site-scans/${ID}`]}>
        <ViteNavigationProvider>
          <Routes><Route path="/admin/site-scans/:id" element={<SiteScanDetail />} /></Routes>
        </ViteNavigationProvider>
      </MemoryRouter>,
    )
  })
  return container
}

const buttons = (el: HTMLElement) => [...el.querySelectorAll('button')].map((button) => button.textContent)

beforeEach(() => {
  auth.role = 'admin'
  Object.values(api).forEach((fn) => fn.mockReset())
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  container?.remove()
  container = null
  root = null
})

describe('SiteScanDetail', () => {
  it('uses Moz labels for Moz data', async () => {
    const el = await mount(scan())
    expect(el.textContent).toContain('Domain Authority (DA)')
    expect(el.textContent).not.toContain('Domain Rank')
  })

  it('uses DataForSEO labels for DataForSEO data', async () => {
    const detail = scan()
    detail.results = {
      ...detail.results!,
      url: 'https://chaico.in/',
      domain: 'chaico.in',
      authority: ok('DataForSEO Backlinks API', { provider: 'dataforseo' as const, domainRank: 320, domainRankScale: 1000 as const, backlinks: 9, referringDomains: 8, referringMainDomains: 7, brokenBacklinks: 0, backlinksSpamScore: 2 }),
    }
    const el = await mount(detail)
    expect(el.textContent).toContain('Domain Rank /1000')
    expect(el.textContent).not.toContain('Domain Authority')
    expect(el.textContent).not.toContain('(DA)')
  })

  it('shows "Not available" with the reason for skipped sections, and for sections with no result', async () => {
    const el = await mount(scan())
    expect(el.textContent).toContain('Not available: site unreachable')
    expect(el.textContent).toContain('Not available: quota reached')

    act(() => root?.unmount())
    container?.remove()
    const old = scan()
    delete old.results!.pages
    const again = await mount(old)
    expect(again.textContent).toContain('Not available: this scan was stored before the key-page crawl existed')
  })

  it('words missing groups as not found from links or sitemap, never as not existing', async () => {
    const el = await mount(scan())
    expect(el.textContent).toContain('Not found from links or sitemap')
    expect(el.textContent).not.toMatch(/doesn.t exist/i)
    expect(el.textContent).toContain('Pricing. A candidate existed')
  })

  it('shows failed pages with their error and warns on bad page checks', async () => {
    const el = await mount(scan())
    expect(el.textContent).toContain('Timed out reading the page')
    expect(el.textContent).toContain('Same title')
    expect(el.querySelectorAll('[aria-label="Warning"]').length).toBeGreaterThan(0)
  })

  it('renders scanned-site text as text, and never links a non-http URL', async () => {
    const el = await mount(scan())
    expect(el.querySelector('img')).toBeNull()
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>')
    expect(el.querySelector('a[href^="javascript"]')).toBeNull()
    for (const link of el.querySelectorAll('a[target="_blank"]')) {
      expect(link.getAttribute('rel')).toBe('noopener noreferrer nofollow')
    }
  })

  it('shows the analysis, removed-item count, traffic estimate label and linked submissions', async () => {
    const el = await mount(scan())
    expect(el.textContent).toContain('The teaser')
    expect(el.textContent).toContain('2 AI items removed for citing numbers not in the data')
    expect(el.textContent).toContain('Estimate from DataForSEO, not analytics')
    expect(el.textContent).toContain('Chai Co')
  })

  it('gives admins rescan, delete and raw JSON', async () => {
    const el = await mount(scan())
    expect(buttons(el)).toEqual(expect.arrayContaining(['Rescan free checks', 'Delete']))
    expect(el.textContent).toContain('Raw JSON')
  })

  it('hides rescan, delete and raw JSON from sub-admins', async () => {
    auth.role = 'sub_admin'
    const el = await mount(scan())
    expect(el.textContent).toContain('The headline')
    expect(buttons(el)).not.toContain('Rescan free checks')
    expect(buttons(el)).not.toContain('Delete')
    expect(el.textContent).not.toContain('Raw JSON')
  })

  it('asks before deleting, and warns the next scan bills again', async () => {
    const el = await mount(scan())
    const remove = [...el.querySelectorAll('button')].find((button) => button.textContent === 'Delete')!
    await act(async () => { remove.click() })
    expect(api.deleteSiteScan).not.toHaveBeenCalled()
    expect(el.querySelector('[role="alertdialog"]')?.textContent).toContain('bills the paid data sources again')
  })

  it('shows the newer crawl data: sections, contact via, link health, sitemap, signals and render mode', async () => {
    const none = { found: false, via: null, pages: [], confidence: 'not-detected' as const }
    const notFound = { status: 'not-found' as const, confidence: 'not-detected' as const }
    const data: PagesData = {
      ...pages,
      homepage: { ...pages.homepage, check: check({ details: {
        renderMode: 'client-shell', renderReason: '0 words and 0 links', contentConfidence: 'low', canonicalStatus: 'points-to-homepage', soft404: null,
        headings: { h2: 1, h3: 2, outline: [] }, thinContent: true, social: { ogTitle: false, ogDescription: false, ogImage: false, twitterCard: false },
        images: { missingDimensions: 0, lazy: false }, mixedContent: { count: 1, samples: ['http://x/a.png'] },
        structuredData: { organization: null, product: false, service: false, faq: false, breadcrumb: false },
        contact: { emails: [], phones: [], whatsapp: [], form: false, embeds: [] }, newestDate: null,
      } }) },
      summary: {
        ...pages.summary,
        groups: {
          about: { status: 'page', url: 'https://chaico.in/about', foundIn: 'nav', confidence: 'measured' },
          services: notFound, contact: { status: 'homepage-section', url: 'https://chaico.in/', anchor: 'contact', confidence: 'detected' },
          pricing: { status: 'blocked-by-robots', confidence: 'measured' }, work: { status: 'not-checked', confidence: 'not-detected' }, blog: notFound,
          shop: notFound, faq: notFound, testimonials: notFound, careers: notFound,
        },
        contact: {
          form: { found: true, via: 'embed', pages: ['https://chaico.in/'], providers: ['Calendly'], confidence: 'detected' },
          phone: { found: true, via: 'text', pages: ['https://chaico.in/'], values: ['+919812345678'], confidence: 'detected' },
          email: none, whatsapp: none,
        },
        findings: [{ code: 'no-org', severity: 'medium', confidence: 'not-detected', title: 'No business details', evidence: 'We didn’t find it', impact: 'x' }],
      },
      linkHealth: { candidates: 30, checked: 20, broken: [{ url: 'https://chaico.in/gone', status: 404, foundOn: 'https://chaico.in/' }], redirected: [{ url: 'https://chaico.in/a', finalUrl: 'https://chaico.in/b', foundOn: 'https://chaico.in/', type: 'permanent', httpToHttps: false }], inconclusive: 1, dropped: 3, confidence: 'low' },
      sitemap: { found: true, urlCount: 40, listedInRobotsTxt: true, hasLastmod: true, newestLastmod: at, robotsBlocksAll: true, redirects: [], errors: [{ url: 'https://chaico.in/x', status: 404 }], soft404s: [], noindex: [] },
      signals: {
        tags: { ga4: ['G-ABC123'], gtm: [], googleAds: [], metaPixel: ['123456'], linkedinInsight: [], hotjar: [], clarity: [] },
        social: { instagram: ['https://instagram.com/chai'], facebook: [], linkedin: [], youtube: [], x: [], pinterest: ['javascript:alert(1)'], threads: [] },
        instagramHandle: 'chai',
        trust: { testimonials: true, clientLogos: false, googleMaps: true, address: 'schema', googleReviews: false },
        headers: { server: 'nginx', cdn: 'Cloudflare', hsts: true, compression: 'br', cacheControl: 'no-store' },
        latestPost: { date: at, source: 'sitemap' },
      },
    }
    const detail = scan()
    detail.results = { ...detail.results!, url: 'https://chaico.in/', domain: 'chaico.in', pages: ok('Key pages', data) }
    const text = (await mount(detail)).textContent!
    for (const expected of [
      'Section on the homepage (#contact)', 'Blocked by robots.txt', 'Own page, linked from nav', 'Not found from links or sitemap',
      'Found via embedded tool (Calendly)', 'Found via plain text: +919812345678', 'We didn’t find one',
      '20 of 30 known links', '404', 'Low confidence: an app shell',
      '40', 'G-ABC123', 'Meta Pixel: 123456', '@chai', 'Google Maps embed', 'Cloudflare',
      'Built by JavaScript', 'This site builds its content with JavaScript', 'Not detected, may still exist', 'Thin content', 'points-to-homepage', '1 insecure resources',
    ]) expect(text, expected).toContain(expected)
    expect(text).not.toMatch(/page is empty/i)
    expect(container!.querySelector('a[href^="javascript"]')).toBeNull()
  })

  it('renders a stored scan without any of the newer fields, adding nothing that wasn’t checked', async () => {
    const text = (await mount(scan())).textContent!
    expect(text).toContain('Groups not found')
    for (const absent of ['Internal link health', 'Sitemap quality', 'Homepage signals', 'Contact methods:Form', 'Server-rendered', 'Built by JavaScript']) expect(text, absent).not.toContain(absent)
  })

  it('starts a rescan from the button', async () => {
    api.rescanSiteScan.mockResolvedValue({ status: 'running' })
    const el = await mount(scan())
    const rescan = [...el.querySelectorAll('button')].find((button) => button.textContent === 'Rescan free checks')!
    await act(async () => { rescan.click() })
    expect(api.rescanSiteScan).toHaveBeenCalledWith(ID)
    expect(api.getSiteScan).toHaveBeenCalledTimes(2)
  })
})
