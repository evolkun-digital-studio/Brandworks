import { describe, expect, it, vi } from 'vitest'
import { SafeFetchError, safeFetch as realSafeFetch, type HopResponse, type SafeResponse, type Transport } from '../safeFetch'
import { parseHomepage, parsePage } from './onPage'
import {
  canonicalStatus,
  detectRenderMode,
  detectSoft404,
  emailsInText,
  inlinePaths,
  instagramHandleOf,
  parseDetails,
  parseMarketing,
  phonesInText,
  scriptsOf,
  targetIdsOf,
} from './pageDetails'
import {
  collectCandidates,
  collectPages,
  homepageSections,
  matchesGroup,
  maxPages,
  pagesBudgetMs,
  parseRobots,
  redirectInfo,
  robotsAllows,
  selectKeyPages,
  summarisePages,
  type Candidate,
} from './pages'
import type { KeyPageCheck, PagesData } from '../types'

const now = () => new Date('2026-10-22T10:00:00Z')
const res = (url: string, status: number, text: string, extra: Partial<SafeResponse> = {}): SafeResponse =>
  ({ url, status, text, headers: {}, truncated: false, redirects: [], elapsedMs: 100, ...extra })

const NO_RULES = parseRobots('')
const HOME = new URL('https://chaico.in/')

const htmlPage = (title: string, body = '<h1>Hello</h1><p>Some words here.</p>', description = `About ${title}`) =>
  `<!doctype html><html><head><title>${title}</title><meta name="description" content="${description}"></head><body>${body}</body></html>`

/** A fake website: a path → HTML map (or a whole response); everything else is a 404. */
function fakeSite(pages: Record<string, string | ((url: URL) => SafeResponse | Promise<SafeResponse>)>) {
  return vi.fn(async (u: string | URL) => {
    const url = new URL(String(u))
    const page = pages[url.pathname]
    if (typeof page === 'function') return page(url)
    return page === undefined ? res(url.href, 404, 'not found') : res(url.href, 200, page)
  })
}
const pathsFetched = (site: ReturnType<typeof fakeSite>) => site.mock.calls.map(([u]) => new URL(String(u)).pathname)
const candidate = (path: string, texts: string[] = [], fromHomepage = true): Candidate =>
  ({ url: new URL(path, HOME), texts, fromHomepage })

describe('parsePage', () => {
  it('keeps the homepage fields and adds links, form, contact links and CTAs', () => {
    const html = htmlPage('Chai', `
      <!-- <a href="/commented-out">Contact</a> -->
      <script>var x = '<a href="/in-script">Buy</a>'</script>
      <a href="/about"><span>About</span> us</a>
      <a href="/menu" class="btn">Get a quote</a>
      <a href="/menu">GET A QUOTE</a>
      <button type="button">Book a table</button>
      <input type="submit" value="Enquire now">
      <a href="mailto:hello@chaico.in?subject=Hi">Mail</a>
      <a href="tel:+919800000000">Call</a>
      <a href="https://wa.me/919800000000">WhatsApp</a>
      <a href="https://api.whatsapp.com/send?phone=91">Chat</a>
      <a href="https://notwa.me/x">Other</a>
      <form action="/send"><input name="q"></form>`)
    const p = parsePage(html)
    expect(p.title).toEqual(parseHomepage(html).title)
    expect(p.links.map((l) => l.href)).not.toContain('/commented-out')
    expect(p.links.map((l) => l.href)).not.toContain('/in-script')
    expect(p.links).toContainEqual({ href: '/about', text: 'About us' })
    expect(p.hasForm).toBe(true)
    expect(p.contactLinks).toEqual({
      email: ['hello@chaico.in'],
      phone: ['+919800000000'],
      whatsapp: ['https://wa.me/919800000000', 'https://api.whatsapp.com/send?phone=91'],
    })
    expect(p.ctaTexts).toEqual(['Get a quote', 'Book a table', 'Enquire now'])
  })

  it('caps CTAs at 5, ignores long text and does not mistake Facebook for "book"', () => {
    const buttons = ['Contact', 'Buy', 'Book', 'Order', 'Hire us', 'Get started'].map((t) => `<button>${t}</button>`).join('')
    const p = parsePage(htmlPage('x', `${buttons}<a href="/f">Facebook</a><a href="/l">Please contact our friendly team whenever you need anything at all</a>`))
    expect(p.ctaTexts).toEqual(['Contact', 'Buy', 'Book', 'Order', 'Hire us'])
    expect(parsePage(htmlPage('x', '<a href="/f">Facebook</a><a href="/s">WordCamp schedule</a><a href="/c">Our contact details</a>')).ctaTexts).toEqual([])
    expect(parsePage(htmlPage('x', '<a href="/q">Free quote</a>')).ctaTexts).toEqual(['Free quote'])
  })

  it('does not count a search box as a contact form', () => {
    for (const form of ['<form role="search">', '<form action="/search">', '<form class="site-search">', '<form id="searchform">']) {
      expect(parsePage(htmlPage('x', `${form}</form>`)).hasForm, form).toBe(false)
    }
  })

  it('stays fast on hostile HTML full of unclosed tags', () => {
    for (const unit of ['<a href="x" ', '<a href="y">', '<!--', '<script>', '<svg>', '<title>', '<head>', '<body>', '<img ', '<', '<script type="application/ld+json">', '<button>']) {
      const hostile = `<html><head></head><body>${unit.repeat(Math.ceil(1_500_000 / unit.length))}`
      const started = Date.now()
      parsePage(hostile)
      expect(Date.now() - started, unit).toBeLessThan(1_500)
    }
  })

  it('reads the same page whether or not the code in it is well formed', () => {
    expect(parseHomepage('<body><p>One two</p><script>var skipped = 1</script><!-- nope --><style>a{}</style><p>three</p></body>').wordCount).toBe(3)
    expect(parseHomepage('<body><p>One two</p><script>never closed words').wordCount).toBe(2)
    expect(parseHomepage('<head><script type="application/ld+json">{"@type":"A"}</script><script type=\'application/ld+json\'>{"@type":"B"}</script></head>').jsonLdTypes).toEqual(['A', 'B'])
    expect(parseHomepage('<title>No head here</title>').title.text).toBe('No head here')
    expect(parseHomepage('<HEAD><TITLE>Upper</TITLE></HEAD>').title.text).toBe('Upper')
    expect(parseHomepage('<head></head>').title).toEqual({ text: null, length: 0 })
  })
})

describe('link discovery', () => {
  it('merges homepage links with sitemap URLs, one entry per path', () => {
    const found = collectCandidates(
      [{ href: '/about', text: 'About' }, { href: 'about/', text: 'Our story' }],
      ['https://chaico.in/about', 'https://chaico.in/services'],
      HOME,
      'chaico.in',
    )
    expect(found.map((c) => c.url.href)).toEqual(['https://chaico.in/about', 'https://chaico.in/services'])
    expect(found[0]).toMatchObject({ texts: ['About', 'Our story'], fromHomepage: true })
    expect(found[1]).toMatchObject({ texts: [], fromHomepage: false })
  })

  it('accepts www and non-www, and rejects other hosts, subdomains and ports', () => {
    const links = [
      'https://www.chaico.in/a', 'http://chaico.in/b', 'https://CHAICO.in/c',
      'https://blog.chaico.in/d', 'https://chaico.in.evil.com/e', 'https://other.com/f', 'https://chaico.in:8080/g',
      '//other.com/h', 'mailto:a@chaico.in', 'javascript:void(0)', 'tel:123',
    ].map((href) => ({ href, text: '' }))
    expect(collectCandidates(links, [], HOME, 'chaico.in').map((c) => c.url.pathname)).toEqual(['/a', '/b', '/c'])
  })

  it('stays on the homepage origin even for a path that looks like another host', () => {
    const [found] = collectCandidates([{ href: 'https://chaico.in//evil.com/x', text: 'About' }], [], HOME, 'chaico.in')
    expect(found.url.hostname).toBe('chaico.in')
  })

  it('drops fragments, query-string duplicates and the homepage itself', () => {
    const links = ['/#contact', '/?page_id=2', '/about?ref=nav', '/about?ref=footer', '/about#team', '/'].map((href) => ({ href, text: '' }))
    expect(collectCandidates(links, [], HOME, 'chaico.in').map((c) => c.url.href)).toEqual(['https://chaico.in/about'])
  })

  it('excludes files and login, cart, checkout, account and admin URLs', () => {
    const bad = ['/brochure.pdf', '/logo.PNG', '/menu.jpg', '/backup.zip', '/feed.xml', '/login', '/account/orders', '/my-account', '/cart', '/checkout/', '/wp-admin/edit.php', '/wp-login.php', '/sign-in']
    expect(collectCandidates(bad.map((href) => ({ href, text: 'Contact' })), [], HOME, 'chaico.in')).toEqual([])
    expect(collectCandidates([{ href: '/cart-accessories', text: '' }], [], HOME, 'chaico.in')).toHaveLength(1)
  })
})

describe('choosing key pages', () => {
  it('matches by URL path', () => {
    expect(matchesGroup(candidate('/about-us'), 'about')).toBe(true)
    expect(matchesGroup(candidate('/en/services'), 'services')).toBe(true)
    expect(matchesGroup(candidate('/our_products'), 'services')).toBe(true)
    expect(matchesGroup(candidate('/case-studies'), 'work')).toBe(true)
    expect(matchesGroup(candidate('/plans'), 'pricing')).toBe(true)
    expect(matchesGroup(candidate('/news'), 'blog')).toBe(true)
    expect(matchesGroup(candidate('/our-services'), 'services')).toBe(true)
    expect(matchesGroup(candidate('/contact-us/'), 'contact')).toBe(true)
    expect(matchesGroup(candidate('/company/about'), 'about')).toBe(true)
    expect(matchesGroup(candidate('/services/web-design'), 'services')).toBe(true)
  })

  it('does not take a slug that merely mentions a keyword', () => {
    expect(matchesGroup(candidate('/projects/new-product-line'), 'services')).toBe(false)
    expect(matchesGroup(candidate('/projects/design-agency-client-work'), 'work')).toBe(false)
    expect(matchesGroup(candidate('/gettingreal/13.3-ride-the-blog-wave'), 'blog')).toBe(false)
    expect(matchesGroup(candidate('/work-with-us'), 'work')).toBe(false)
    expect(matchesGroup(candidate('/careers', ['Work with us']), 'work')).toBe(false)
  })

  it('matches by link text', () => {
    expect(matchesGroup(candidate('/reach-out', ['Contact us']), 'contact')).toBe(true)
    expect(matchesGroup(candidate('/company', ['About']), 'about')).toBe(true)
    expect(matchesGroup(candidate('/showcase', ['Portfolio']), 'work')).toBe(true)
  })

  it('needs whole words, and ignores legal pages, blog posts and long link text', () => {
    expect(matchesGroup(candidate('/network'), 'work')).toBe(false)
    expect(matchesGroup(candidate('/newsletter'), 'blog')).toBe(false)
    expect(matchesGroup(candidate('/terms-of-service'), 'services')).toBe(false)
    expect(matchesGroup(candidate('/tos', ['Terms of Service']), 'services')).toBe(false)
    expect(matchesGroup(candidate('/blog/how-we-work'), 'work')).toBe(false)
    expect(matchesGroup(candidate('/x', ['We would love to tell you all about our company']), 'about')).toBe(false)
  })

  it('picks in priority order, one page per group and one group per page', () => {
    const { picks, notFound } = selectKeyPages(
      [candidate('/blog'), candidate('/contact'), candidate('/products'), candidate('/services'), candidate('/about')],
      NO_RULES,
      5,
    )
    expect(picks.map((p) => [p.group, p.url.pathname])).toEqual([
      ['about', '/about'], ['services', '/products'], ['contact', '/contact'], ['blog', '/blog'],
    ])
    expect(notFound).toEqual(['pricing', 'work'])
    const single = selectKeyPages([candidate('/offer', ['Services', 'Pricing'])], NO_RULES, 5)
    expect(single.picks.map((p) => p.group)).toEqual(['services'])
  })

  it('prefers shallow pages, then homepage links over sitemap entries', () => {
    const shallow = selectKeyPages([candidate('/services/web-design'), candidate('/services', [], false)], NO_RULES, 5)
    expect(shallow.picks[0].url.pathname).toBe('/services')
    const linked = selectKeyPages([candidate('/contact-form', [], false), candidate('/contact')], NO_RULES, 5)
    expect(linked.picks[0].url.pathname).toBe('/contact')
  })

  it('leaves groups over the limit as "not checked" rather than "not found"', () => {
    const { picks, notFound } = selectKeyPages([candidate('/about'), candidate('/services'), candidate('/contact')], NO_RULES, 2)
    expect(picks.map((p) => p.group)).toEqual(['about', 'services'])
    expect(notFound).not.toContain('contact')
  })
})

describe('robots.txt', () => {
  const allows = (text: string, path: string) => robotsAllows(parseRobots(text), path)

  it('honours Disallow for "*" and for our own user agent, and ignores other agents', () => {
    expect(allows('User-agent: *\nDisallow: /private', '/private/x')).toBe(false)
    expect(allows('User-agent: BrandWorksSiteCheck\nDisallow: /a', '/a')).toBe(false)
    expect(allows('User-agent: brandworkssitecheck\nDisallow: /a', '/a')).toBe(false)
    expect(allows('User-agent: Googlebot\nDisallow: /', '/a')).toBe(true)
    expect(allows('User-agent: Googlebot\nUser-agent: *\nDisallow: /a', '/a')).toBe(false)
    const both = 'User-agent: *\nDisallow: /a\n\nUser-agent: BrandWorksSiteCheck\nDisallow: /b'
    expect(allows(both, '/a')).toBe(false)
    expect(allows(both, '/b')).toBe(false)
    expect(allows(both, '/c')).toBe(true)
  })

  it('supports an empty Disallow, Allow, wildcards and $', () => {
    expect(allows('User-agent: *\nDisallow:', '/a')).toBe(true)
    expect(allows('User-agent: *\nDisallow: /\nAllow: /about', '/about')).toBe(true)
    expect(allows('User-agent: *\nDisallow: /\nAllow: /about', '/contact')).toBe(false)
    expect(allows('User-agent: *\nDisallow: /*/secret', '/a/secret/b')).toBe(false)
    expect(allows('User-agent: *\nDisallow: /*.php$', '/a.php')).toBe(false)
    expect(allows('User-agent: *\nDisallow: /*.php$', '/a.php/b')).toBe(true)
    expect(allows('User-agent: *\nDisallow: /a$', '/a')).toBe(false)
    expect(allows('User-agent: *\nDisallow: /a$', '/ab')).toBe(true)
    expect(allows('# comment\nUser-agent: * # all\nDisallow: /a # no', '/a')).toBe(false)
  })

  it('stays fast on a hostile wildcard pattern', () => {
    const started = Date.now()
    allows(`User-agent: *\nDisallow: /${'*a'.repeat(5_000)}b`, `/${'a'.repeat(50_000)}`)
    expect(Date.now() - started).toBeLessThan(1_000)
  })

  it('never fetches a disallowed page, and reports the group as not checked', async () => {
    const site = fakeSite({
      '/': htmlPage('Home', '<h1>Hi</h1><a href="/about">About</a><a href="/contact">Contact</a>'),
      '/robots.txt': 'User-agent: *\nDisallow: /contact',
      '/about': htmlPage('About'),
      '/contact': htmlPage('Contact'),
    })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(pathsFetched(site)).toContain('/about')
    expect(pathsFetched(site)).not.toContain('/contact')
    expect(data?.summary.groupsNotChecked).toContain('contact')
    expect(data?.summary.groupsNotFound).not.toContain('contact')
    expect(data?.summary.blockedByRobots).toEqual(['https://chaico.in/contact'])
  })

  it('does not crawl when robots.txt is unreachable, since we cannot know the rules', async () => {
    for (const robots of [
      (u: URL) => res(u.href, 503, 'down'),
      () => { throw new SafeFetchError('timeout', 'slow') },
    ]) {
      const site = fakeSite({ '/': htmlPage('Home', '<a href="/about">About</a>'), '/robots.txt': robots, '/about': htmlPage('About') })
      expect(await collectPages(HOME, { safeFetch: site, env: {}, now })).toMatchObject({ status: 'error', data: null })
      expect(pathsFetched(site)).not.toContain('/about')
    }
  })

  it('treats a missing robots.txt or an HTML page served in its place as no rules', async () => {
    const site = fakeSite({ '/': htmlPage('Home', '<a href="/about">About</a>'), '/robots.txt': htmlPage('Soft 404', 'Disallow: /about'), '/about': htmlPage('About') })
    expect((await collectPages(HOME, { safeFetch: site, env: {}, now })).data?.summary.groupsFound).toEqual(['about'])
  })
})

describe('SITE_SCAN_MAX_PAGES', () => {
  it('defaults to 5, can be overridden and stops at the hard ceiling of 10', () => {
    expect(maxPages({})).toBe(5)
    expect(maxPages({ SITE_SCAN_MAX_PAGES: '3' })).toBe(3)
    expect(maxPages({ SITE_SCAN_MAX_PAGES: '10' })).toBe(10)
    expect(maxPages({ SITE_SCAN_MAX_PAGES: '500' })).toBe(10)
    for (const bad of ['0', '-2', 'lots', '']) expect(maxPages({ SITE_SCAN_MAX_PAGES: bad }), bad).toBe(5)
  })

  const everyGroup = {
    '/': htmlPage('Home', ['about', 'services', 'contact', 'pricing', 'work', 'blog'].map((p) => `<a href="/${p}">${p}</a>`).join('')),
    '/about': htmlPage('About'), '/services': htmlPage('Services'), '/contact': htmlPage('Contact'),
    '/pricing': htmlPage('Pricing'), '/work': htmlPage('Work'), '/blog': htmlPage('Blog'),
  }

  it('limits the crawl without counting the homepage', async () => {
    const byDefault = await collectPages(HOME, { safeFetch: fakeSite(everyGroup), env: {}, now })
    expect(byDefault.data?.pages.map((p) => p.group)).toEqual(['about', 'services', 'contact', 'pricing', 'work'])
    expect(byDefault.data?.summary).toMatchObject({ pagesCrawled: 5, pagesChecked: 6, groupsNotChecked: ['blog'], groupsNotFound: [] })
    const two = await collectPages(HOME, { safeFetch: fakeSite(everyGroup), env: { SITE_SCAN_MAX_PAGES: '2' }, now })
    expect(two.data?.pages.map((p) => p.group)).toEqual(['about', 'services'])
    const lots = await collectPages(HOME, { safeFetch: fakeSite(everyGroup), env: { SITE_SCAN_MAX_PAGES: '500' }, now })
    expect(lots.data?.pages).toHaveLength(6) // one page per group, so never more than the six groups
  })
})

describe('sitemaps', () => {
  const urlset = (...paths: string[]) => `<?xml version="1.0"?><urlset>${paths.map((p) => `<url><loc>https://chaico.in${p}</loc></url>`).join('')}</urlset>`

  it('finds pages from /sitemap.xml when the homepage has no links', async () => {
    const site = fakeSite({ '/': htmlPage('Home'), '/sitemap.xml': urlset('/about', '/contact'), '/about': htmlPage('About'), '/contact': htmlPage('Contact') })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(data?.summary.groupsFound).toEqual(['about', 'contact'])
    expect(data?.discovery).toEqual({ homepageLinks: 0, sitemapUrls: 2 })
  })

  it('follows a sitemap index one level deep, and no deeper', async () => {
    const site = fakeSite({
      '/': htmlPage('Home'),
      '/sitemap.xml': '<sitemapindex><sitemap><loc><![CDATA[https://chaico.in/pages.xml]]></loc></sitemap><sitemap><loc>https://chaico.in/nested.xml</loc></sitemap><sitemap><loc>https://other.com/x.xml</loc></sitemap></sitemapindex>',
      '/pages.xml': urlset('/about'),
      '/nested.xml': '<sitemapindex><sitemap><loc>https://chaico.in/too-deep.xml</loc></sitemap></sitemapindex>',
      '/too-deep.xml': urlset('/contact'),
      '/about': htmlPage('About'),
    })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(data?.summary.groupsFound).toEqual(['about'])
    expect(pathsFetched(site)).not.toContain('/too-deep.xml')
    expect(site.mock.calls.some(([u]) => String(u).includes('other.com'))).toBe(false)
  })

  it('reads the sitemap named in robots.txt instead of guessing the address', async () => {
    const site = fakeSite({
      '/': htmlPage('Home'),
      '/robots.txt': 'User-agent: *\nSitemap: https://chaico.in/map.xml\nSitemap: https://other.com/map.xml',
      '/map.xml': urlset('/about'),
      '/about': htmlPage('About'),
    })
    expect((await collectPages(HOME, { safeFetch: site, env: {}, now })).data?.summary.groupsFound).toEqual(['about'])
    expect(pathsFetched(site)).not.toContain('/sitemap.xml')
    expect(site.mock.calls.some(([u]) => String(u).includes('other.com'))).toBe(false)
  })
})

describe('site-level summary', () => {
  const check = (over: Partial<KeyPageCheck> = {}): KeyPageCheck => ({
    htmlTruncated: false, title: { text: 'A title', length: 7 }, metaDescription: { text: 'A description', length: 13 }, h1Count: 1, canonical: null,
    noindex: false, wordCount: 100, images: { total: 0, missingAlt: 0 }, jsonLdTypes: [], hasForm: false,
    contactLinks: { email: [], phone: [], whatsapp: [] }, ctaTexts: [], ...over,
  })
  const homepage = (over: Partial<KeyPageCheck> = {}): PagesData['homepage'] => ({ url: 'https://chaico.in/', statusCode: 200, check: check({ title: { text: 'Home', length: 4 }, metaDescription: { text: 'Home text', length: 9 }, ...over }) })
  const page = (path: string, over: Partial<KeyPageCheck> = {}) =>
    ({ group: 'about' as const, url: `https://chaico.in${path}`, finalUrl: `https://chaico.in${path}`, statusCode: 200, error: null, check: check(over) })

  it('finds duplicate titles and descriptions across the homepage and crawled pages, ignoring case', () => {
    const s = summarisePages(
      homepage({ title: { text: 'Chai & Co', length: 9 } }),
      [page('/a', { title: { text: 'CHAI & CO', length: 9 } }), page('/b', { metaDescription: { text: 'Same', length: 4 } }), page('/c', { metaDescription: { text: 'same', length: 4 } }), page('/d', { title: { text: 'Unique', length: 6 } })],
      null,
      false,
    )
    expect(s.duplicateTitles).toEqual([
      { text: 'Chai & Co', urls: ['https://chaico.in/', 'https://chaico.in/a'] },
      { text: 'A title', urls: ['https://chaico.in/b', 'https://chaico.in/c'] },
    ])
    expect(s.duplicateMetaDescriptions).toEqual([
      { text: 'A description', urls: ['https://chaico.in/a', 'https://chaico.in/d'] },
      { text: 'Same', urls: ['https://chaico.in/b', 'https://chaico.in/c'] },
    ])
  })

  it('does not count two links redirecting to one page as duplicates', () => {
    const same = { ...page('/a'), finalUrl: 'https://chaico.in/final' }
    expect(summarisePages(homepage(), [same, { ...page('/b'), finalUrl: 'https://chaico.in/final' }], null, false).duplicateTitles).toEqual([])
  })

  it('never counts a missing title or description as a duplicate, and lists what is missing', () => {
    const none = { title: { text: null, length: 0 }, metaDescription: { text: null, length: 0 } }
    const s = summarisePages(homepage(), [page('/a', { ...none, noindex: true, h1Count: 0 }), page('/b', { ...none, h1Count: 0, wordCount: 0 })], null, false)
    expect(s.duplicateTitles).toEqual([])
    expect(s.missingTitle).toEqual(['https://chaico.in/a', 'https://chaico.in/b'])
    expect(s.missingMetaDescription).toEqual(['https://chaico.in/a', 'https://chaico.in/b'])
    expect(s.noindex).toEqual(['https://chaico.in/a'])
    // /b has no words in its HTML: rendered by JavaScript, so no H1 proves nothing.
    expect(s.missingH1).toEqual(['https://chaico.in/a'])
  })

  it('detects each contact method on any page, including the homepage', () => {
    const none = summarisePages(homepage(), [page('/a')], null, false).contactMethods
    expect(none).toEqual({ form: false, phone: false, email: false, whatsapp: false })
    expect(summarisePages(homepage({ hasForm: true }), [], null, false).contactMethods.form).toBe(true)
    expect(summarisePages(homepage(), [page('/a', { contactLinks: { email: [], phone: ['+91'], whatsapp: [] } })], null, false).contactMethods.phone).toBe(true)
    expect(summarisePages(homepage(), [page('/a', { contactLinks: { email: ['a@b.c'], phone: [], whatsapp: [] } })], null, false).contactMethods.email).toBe(true)
    expect(summarisePages(homepage(), [page('/a', { contactLinks: { email: [], phone: [], whatsapp: ['https://wa.me/1'] } })], null, false).contactMethods.whatsapp).toBe(true)
  })

  it('works end to end from real HTML', async () => {
    const site = fakeSite({
      '/': htmlPage('Chai & Co', '<h1>Chai</h1><a href="/about">About</a><a href="/contact">Contact</a>'),
      '/about': htmlPage('Chai & Co'),
      '/contact': htmlPage('Say hello', '<h1>Hello</h1><form action="/send"></form><a href="tel:+91">Call</a>'),
    })
    const { data, status } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(status).toBe('ok')
    expect(data?.summary).toMatchObject({
      groupsFound: ['about', 'contact'],
      groupsNotFound: ['services', 'pricing', 'work', 'blog'],
      groupsNotChecked: [],
      contactMethods: { form: true, phone: true, email: false, whatsapp: false },
      pagesCrawled: 2, pagesFailed: 0, pagesChecked: 3, truncated: false, note: null,
    })
    expect(data?.summary.duplicateTitles[0].urls).toEqual(['https://chaico.in/', 'https://chaico.in/about'])
    expect(data?.pages[1]).toMatchObject({ group: 'contact', url: 'https://chaico.in/contact', finalUrl: 'https://chaico.in/contact', statusCode: 200, error: null })
    expect(data?.pages[1].check).toMatchObject({ hasForm: true, h1Count: 1, contactLinks: { phone: ['+91'] } })
  })
})

describe('failures', () => {
  const home = htmlPage('Home', '<a href="/about">About</a><a href="/contact">Contact</a><a href="/services">Services</a><a href="/blog">Blog</a>')

  it('records a page that fails with its error, without failing the collector', async () => {
    const site = fakeSite({
      '/': home,
      '/about': () => { throw new SafeFetchError('timeout', 'The website took too long to respond.') },
      '/contact': (u) => res(u.href, 500, 'oops'),
      '/services': htmlPage('Services'),
    })
    const result = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(result.status).toBe('ok')
    expect(result.data?.pages.find((p) => p.group === 'about')).toMatchObject({ finalUrl: null, statusCode: null, error: 'The website took too long to respond.', check: null })
    expect(result.data?.pages.find((p) => p.group === 'contact')).toMatchObject({ statusCode: 500, error: 'Responded 500', check: null })
    expect(result.data?.summary).toMatchObject({ pagesCrawled: 1, pagesFailed: 3, groupsFound: ['services'] })
    // We know these exist; a failed read must never turn into "not found".
    expect(result.data?.summary.groupsNotChecked).toEqual(['about', 'contact', 'blog'])
    expect(result.data?.summary.groupsNotFound).toEqual(['pricing', 'work'])
  })

  it('does not read a page that redirected away, home or to a login', async () => {
    const site = fakeSite({
      '/': home,
      '/about': () => res('https://other.com/about', 200, htmlPage('Foreign')),
      '/contact': () => res('https://chaico.in/', 200, home),
      '/services': () => res('https://chaico.in/login', 200, htmlPage('Log in')),
      '/blog': (u) => res(u.href, 200, 'binary', { headers: { 'content-type': 'application/pdf' } }),
    })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(data?.pages.map((p) => p.error)).toEqual(['Redirected to another site', 'Redirected to a login or account page', 'Redirected to the homepage', 'Not an HTML page'])
    expect(data?.summary.groupsFound).toEqual([])
  })

  it('reports an error when the homepage fails', async () => {
    const blocked = vi.fn(async () => { throw new SafeFetchError('blocked', 'private network') })
    expect(await collectPages(HOME, { safeFetch: blocked, env: {}, now })).toMatchObject({ status: 'error', data: null, reason: 'private network' })
    const down = fakeSite({ '/': (u) => res(u.href, 503, '') })
    expect(await collectPages(HOME, { safeFetch: down, env: {}, now })).toMatchObject({ status: 'error', reason: 'Homepage responded 503' })
  })

  it('is skipped, claiming nothing is missing, when the homepage redirects to another site', async () => {
    const site = fakeSite({ '/': () => res('https://other.com/', 200, home) })
    const result = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(result).toMatchObject({ status: 'skipped', data: null })
    expect(result.reason).toContain('other.com')
    expect(site).toHaveBeenCalledTimes(1)
  })
})

describe('budget and concurrency', () => {
  const home = htmlPage('Home', ['about', 'services', 'contact', 'pricing', 'work'].map((p) => `<a href="/${p}">${p}</a>`).join(''))

  it('returns what finished as a partial result when the time budget runs out, and starts nothing after', async () => {
    const hang = () => new Promise<never>(() => undefined)
    const site = fakeSite({ '/': home, '/about': htmlPage('About'), '/services': hang, '/contact': hang, '/pricing': htmlPage('Pricing') })
    const result = await collectPages(HOME, { safeFetch: site, env: {}, now, budgetMs: 40 })
    expect(result.status).toBe('ok')
    expect(result.data?.pages.map((p) => p.group)).toEqual(['about'])
    expect(result.data?.summary).toMatchObject({
      truncated: true,
      note: 'The time budget ran out, so this is a partial result.',
      groupsFound: ['about'],
      groupsNotChecked: ['services', 'contact', 'pricing', 'work'],
    })
    expect(pathsFetched(site)).not.toContain('/pricing')
  })

  it('says nothing is "not found" if the budget runs out during discovery', async () => {
    const site = fakeSite({ '/': home, '/sitemap.xml': () => new Promise<never>(() => undefined) })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now, budgetMs: 40 })
    expect(data?.summary).toMatchObject({ truncated: true, groupsNotFound: [], groupsFound: [] })
    expect(data?.summary.groupsNotChecked).toHaveLength(6)
  })

  it('fails rather than hanging if the homepage never responds', async () => {
    const site = fakeSite({ '/': () => new Promise<never>(() => undefined) })
    expect(await collectPages(HOME, { safeFetch: site, env: {}, now, budgetMs: 20 })).toMatchObject({ status: 'error', data: null })
  })

  it('never makes more than two requests at once', async () => {
    let active = 0
    let peak = 0
    const slow = (html: string) => async (u: URL) => {
      peak = Math.max(peak, ++active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active--
      return res(u.href, 200, html)
    }
    const site = fakeSite({
      '/': slow(home),
      '/sitemap.xml': slow(`<sitemapindex>${[1, 2, 3, 4].map((n) => `<sitemap><loc>https://chaico.in/s${n}.xml</loc></sitemap>`).join('')}</sitemapindex>`),
      '/s1.xml': slow('<urlset></urlset>'), '/s2.xml': slow('<urlset></urlset>'), '/s3.xml': slow('<urlset></urlset>'), '/s4.xml': slow('<urlset></urlset>'),
      '/about': slow(htmlPage('About')), '/services': slow(htmlPage('Services')), '/contact': slow(htmlPage('Contact')), '/pricing': slow(htmlPage('Pricing')), '/work': slow(htmlPage('Work')),
    })
    expect((await collectPages(HOME, { safeFetch: site, env: {}, now })).data?.summary.pagesCrawled).toBe(5)
    expect(peak).toBe(2)
  })
})

describe('one-page sites', () => {
  it('reports a homepage section as found, not as not found', async () => {
    const site = fakeSite({ '/': htmlPage('Home', '<nav><a href="#contact">Say hi</a><a href="/#services">What we do</a></nav><section id="contact"><h2>Reach us</h2></section><section id="our-services"></section><div id="pricing-section"></div>') })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(data?.summary.groups?.contact).toEqual({ status: 'homepage-section', url: 'https://chaico.in/', anchor: 'contact', confidence: 'detected' })
    expect(data?.summary.groups?.services).toMatchObject({ status: 'homepage-section', anchor: 'our-services' })
    expect(data?.summary.groups?.pricing).toMatchObject({ status: 'homepage-section', anchor: 'pricing-section' })
    expect(data?.summary.groups?.about).toMatchObject({ status: 'not-found', confidence: 'not-detected' })
    expect(data?.summary.groupsFound).toEqual(['services', 'contact', 'pricing'])
    expect(data?.summary.groupsNotFound).toEqual(['about', 'work', 'blog'])
  })

  it('takes a same-page link by its text only when its target exists', () => {
    const home = HOME
    expect(homepageSections([{ href: '#sec-3', text: 'Contact' }], ['sec-3'], home)).toEqual([{ group: 'contact', anchor: 'sec-3' }])
    expect(homepageSections([{ href: '#sec-3', text: 'Contact' }], [], home)).toEqual([])
    expect(homepageSections([{ href: '#contact', text: 'x' }], [], home)).toEqual([{ group: 'contact', anchor: 'contact' }])
  })

  it('does not take ids that only mention a group, or a link to another page', () => {
    expect(homepageSections([{ href: '/other#contact', text: '' }], ['services-menu', 'how-we-work', 'contact-modal-trigger'], HOME)).toEqual([])
  })

  it('prefers a real page over a section', async () => {
    const site = fakeSite({ '/': htmlPage('Home', '<a href="/contact">Contact</a><div id="contact"></div>'), '/contact': htmlPage('Contact') })
    expect((await collectPages(HOME, { safeFetch: site, env: {}, now })).data?.summary.groups?.contact).toMatchObject({ status: 'page', url: 'https://chaico.in/contact' })
  })
})

describe('client-rendered sites', () => {
  const SHELL = `<!doctype html><html><head><title>App</title><script type="module" src="/assets/index-abc.js"></script></head><body><div id="root"></div><noscript>Enable JavaScript to use this app and read many many words here</noscript></body></html>`
  const NEXT_SHELL = `<html><head><title>App</title></head><body><div id="__next"></div><script id="__NEXT_DATA__" type="application/json">{"props":{"links":[{"href":"/about"},{"href":"/_next/static/x"},{"href":"/pricing"}]}}</script><script src="/app.js"></script></body></html>`

  it('recognises a shell, and not a real page that also uses an app root', () => {
    expect(detectRenderMode(SHELL, 0, 0, 1).mode).toBe('client-shell')
    expect(detectRenderMode('<body><div id="__next">words</div><script></script></body>', 400, 30, 2).mode).toBe('server')
    expect(detectRenderMode('<body><div id="main"></div><script></script></body>', 3, 0, 1).mode).toBe('unknown')
    expect(detectRenderMode('<body><p>Short page.</p></body>', 2, 0, 0).mode).toBe('server')
    expect(detectRenderMode('<div data-reactroot=""></div>', 0, 0, 1).mode).toBe('client-shell')
  })

  it('still discovers pages from the sitemap and marks content as low confidence', async () => {
    const site = fakeSite({
      '/': SHELL,
      '/sitemap.xml': '<urlset><url><loc>https://chaico.in/about</loc></url></urlset>',
      '/about': SHELL,
    })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(data?.homepage.check.details).toMatchObject({ renderMode: 'client-shell', contentConfidence: 'low' })
    expect(data?.summary.groups?.about).toMatchObject({ status: 'page', foundIn: 'sitemap', confidence: 'low' })
    expect(data?.summary.groups?.contact).toMatchObject({ status: 'not-found', confidence: 'low' })
    expect(data?.summary.contact?.phone.confidence).toBe('low')
    const titles = data?.summary.findings?.map((f) => f.code)
    expect(titles).toContain('client-rendered')
    expect(titles).not.toContain('no-contact-method')
    expect(titles).not.toContain('thin-content')
    expect(data?.summary.findings?.find((f) => f.code === 'client-rendered')?.evidence).toBe('This site builds its content with JavaScript; the HTML we read before JavaScript runs is mostly empty, so content checks are unreliable and Google may also see less content.')
    expect(JSON.stringify(data?.summary.findings)).not.toMatch(/page is empty/i)
    expect(data?.linkHealth?.confidence).toBe('low')
  })

  it('takes hints from inline JSON, capped and clearly marked', async () => {
    const site = fakeSite({ '/': NEXT_SHELL, '/about': NEXT_SHELL, '/pricing': NEXT_SHELL })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(data?.discovery.inlineHints).toBe(2)
    expect(data?.summary.groups?.about).toMatchObject({ status: 'page', foundIn: 'inline-script', confidence: 'low' })
    expect(pathsFetched(site)).not.toContain('/_next/static/x')
    const many = `<script>${Array.from({ length: 500 }, (_, i) => `{path:"/p${i}"}`).join(',')}</script>`
    expect(inlinePaths(scriptsOf(many))).toHaveLength(100)
    expect(inlinePaths(scriptsOf('<script src="/x.js">{path:"/about"}</script>'))).toEqual([])
    expect(inlinePaths(scriptsOf('<script>self.__next_f.push([1,"{\\"href\\":\\"/contact\\"}"])</script>'))).toEqual(['/contact'])
  })

  it('ignores inline hints on a server-rendered site', async () => {
    const words = 'word '.repeat(80)
    const site = fakeSite({ '/': htmlPage('Home', `<p>${words}</p><script>var r={path:"/about"}</script>`) })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(pathsFetched(site)).not.toContain('/about')
    expect(data?.discovery.inlineHints).toBeUndefined()
  })
})

describe('contact methods', () => {
  it('finds Indian phone formats in plain text, normalised and deduped', () => {
    expect(phonesInText('Call +91 98123 45678 or +91-98123-45678')).toEqual(['+919812345678'])
    expect(phonesInText('Mobile: 09812345678')).toEqual(['+919812345678'])
    expect(phonesInText('Reach 8123456789 today')).toEqual(['+918123456789'])
    expect(phonesInText('Office 011-23456789')).toEqual(['+911123456789'])
    expect(phonesInText('Office (022) 2345 6789')).toEqual(['+912223456789'])
    expect(phonesInText('Call us: 98123 45678')).toEqual(['+919812345678'])
    expect(phonesInText('US office +1 415 555 2671')).toEqual(['+14155552671'])
    expect(phonesInText('Toll free 1800-123-4567')).toEqual(['18001234567'])
  })

  it('does not take numbers that only look like phones', () => {
    for (const text of ['Priced 60000 70000 for two', 'Founded 2024-01-15', 'Version 9.81.234.5678', 'Price 1,00,000 only', 'Order 12345', 'GSTIN 27AAPFU0939F1ZV', '5123456789', 'x9812345678y']) {
      expect(phonesInText(text), text).toEqual([])
    }
  })

  it('ignores placeholder numbers and emails', () => {
    for (const text of ['Call 1234567890', 'Call 9999999999', 'Call +91 9876543210', 'Call 0000000000']) expect(phonesInText(text), text).toEqual([])
    expect(emailsInText('Write to you@example.com or name@domain.com or test@yourdomain.in')).toEqual([])
    const p = parsePage(htmlPage('x', '<a href="tel:1234567890">Call</a><a href="mailto:you@example.com">Mail</a>'))
    expect(p.contactLinks).toMatchObject({ phone: [], email: [] })
  })

  it('finds emails in text, without mistaking image filenames for them', () => {
    expect(emailsInText('Mail Hello@ChaiCo.in, or sales@chaico.co.in.')).toEqual(['hello@chaico.in', 'sales@chaico.co.in'])
    expect(emailsInText('logo@2x.png hero@3x.webp icon@2x.jpg')).toEqual([])
    expect(emailsInText('no at sign here, and @ alone, and a@b')).toEqual([])
  })

  const contactOf = async (body: string) => (await collectPages(HOME, { safeFetch: fakeSite({ '/': htmlPage('Home', body) }), env: {}, now })).data!.summary

  it('says how each method was found, on which pages', async () => {
    const s = await contactOf('<p>Call us: 98123 45678. Mail hello@chaico.in</p><a href="mailto:team@chaico.in">Mail</a><a href="whatsapp://send?phone=919812345678">Chat</a><form action="/send"></form>')
    expect(s.contact?.phone).toEqual({ found: true, via: 'text', pages: ['https://chaico.in/'], values: ['+919812345678'], confidence: 'detected' })
    expect(s.contact?.email).toMatchObject({ found: true, via: 'link', values: ['team@chaico.in', 'hello@chaico.in'] })
    expect(s.contact?.whatsapp).toMatchObject({ found: true, via: 'link' })
    expect(s.contact?.form).toMatchObject({ found: true, via: 'form' })
    expect(s.contactMethods).toEqual({ form: true, phone: true, email: true, whatsapp: true })
  })

  it('reads WhatsApp from every kind of link', () => {
    for (const href of ['https://wa.me/91', 'https://api.whatsapp.com/send', 'https://web.whatsapp.com/send', 'whatsapp://send?phone=91']) {
      expect(parsePage(htmlPage('x', `<a href="${href}">Chat</a>`)).contactLinks.whatsapp, href).toEqual([href])
    }
  })

  it('counts embedded forms and booking tools, naming the provider', async () => {
    for (const [body, provider] of [
      ['<iframe src="https://docs.google.com/forms/d/e/abc/viewform?embedded=true"></iframe>', 'Google Forms'],
      ['<iframe src="https://calendly.com/chai/30min"></iframe>', 'Calendly'],
      ['<script src="https://assets.calendly.com/assets/external/widget.js"></script>', 'Calendly'],
      ['<iframe src="https://tally.so/embed/abc"></iframe>', 'Tally'],
      ['<script src="//js.hsforms.net/forms/embed/v2.js"></script>', 'HubSpot Forms'],
      ['<iframe src="https://form.jotform.com/123"></iframe>', 'Jotform'],
      ['<iframe src="https://forms.zohopublic.in/x/form/y"></iframe>', 'Zoho Forms'],
      ['<iframe src="https://cal.com/chai"></iframe>', 'Cal.com'],
      ['<iframe src="https://chai.typeform.com/to/abc"></iframe>', 'Typeform'],
      ['<iframe src="https://outlook.office365.com/owa/calendar/chai/bookings/"></iframe>', 'Microsoft Bookings'],
    ] as const) {
      const s = await contactOf(body)
      expect(s.contact?.form, provider).toMatchObject({ found: true, via: 'embed', providers: [provider] })
      expect(s.contactMethods.form).toBe(true)
    }
    expect((await contactOf('<iframe src="https://local.com/x"></iframe><script src="https://notcalendly.com/x.js"></script>')).contact?.form.found).toBe(false)
  })

  it('describes a real form as a form, even when another page links out to a booking tool', async () => {
    const s = await contactOf('<form action="/send"></form><a href="https://calendly.com/chai/demo">Book a demo</a>')
    expect(s.contact?.form).toMatchObject({ found: true, via: 'form', providers: ['Calendly'] })
    expect((await contactOf('<a href="https://calendly.com/chai/demo">Book a demo</a>')).contact?.form).toMatchObject({ via: 'link', providers: ['Calendly'] })
  })

  it('reads Cloudflare-protected emails', async () => {
    const key = 0x42
    const encoded = key.toString(16).padStart(2, '0') + [...'hi@chaico.in'].map((c) => (c.charCodeAt(0) ^ key).toString(16).padStart(2, '0')).join('')
    expect((await contactOf(`<a class="__cf_email__" data-cfemail="${encoded}">[email protected]</a>`)).contact?.email.values).toEqual(['hi@chaico.in'])
  })

  it('stores at most three of each', async () => {
    const s = await contactOf(['a', 'b', 'c', 'd', 'e'].map((x) => `${x}@chaico.in`).join(' '))
    expect(s.contact?.email.values).toHaveLength(3)
  })
})

describe('key page matching', () => {
  it('knows the synonyms, in addresses and link text', () => {
    for (const [path, group] of [
      ['/who-we-are', 'about'], ['/our-story', 'about'], ['/team', 'about'], ['/company', 'about'],
      ['/what-we-do', 'services'], ['/offerings', 'services'], ['/expertise', 'services'],
      ['/get-in-touch', 'contact'], ['/reach-us', 'contact'], ['/enquiry', 'contact'], ['/support', 'contact'],
      ['/packages', 'pricing'], ['/rates', 'pricing'], ['/fees', 'pricing'],
      ['/projects', 'work'], ['/clients', 'work'], ['/showcase', 'work'],
      ['/insights', 'blog'], ['/articles', 'blog'], ['/journal', 'blog'], ['/resources', 'blog'],
      ['/shop', 'shop'], ['/collections', 'shop'], ['/catalogue', 'shop'], ['/faq', 'faq'], ['/faqs', 'faq'], ['/reviews', 'testimonials'], ['/testimonials', 'testimonials'], ['/careers', 'careers'],
    ] as const) {
      expect(matchesGroup(candidate(path), group), path).toBe(true)
    }
    expect(matchesGroup(candidate('/x', ['Get in touch']), 'contact')).toBe(true)
    expect(matchesGroup(candidate('/x', ['Who we are']), 'about')).toBe(true)
  })

  it('does not take a page below a synonym, or a slug that mentions one', () => {
    expect(matchesGroup(candidate('/projects/new-site'), 'work')).toBe(false)
    expect(matchesGroup(candidate('/team-building-tips'), 'about')).toBe(false)
    expect(matchesGroup(candidate('/resources/our-team'), 'about')).toBe(false)
  })

  it('matches Hindi link text, keeping its vowel signs', () => {
    for (const [text, group] of [
      ['हमारे बारे में', 'about'], ['संपर्क', 'contact'], ['संपर्क करें', 'contact'], ['सेवाएं', 'services'], ['सेवाएँ', 'services'], ['ब्लॉग', 'blog'],
    ] as const) {
      expect(matchesGroup(candidate('/p1', [text]), group), text).toBe(true)
    }
    expect(matchesGroup(candidate('/p1', ['ब्लॉगर']), 'blog')).toBe(false)
    expect(matchesGroup(candidate(`/${encodeURIComponent('संपर्क')}`), 'contact')).toBe(true)
  })

  it('prefers a nav link over a footer link, then body, then sitemap, and records where it was', async () => {
    const pick = (candidates: Candidate[]) => selectKeyPages(candidates, NO_RULES, 5).picks[0]
    const nav: Candidate = { url: new URL('/contact-us', HOME), texts: [], fromHomepage: true, foundIn: 'nav' }
    const footer: Candidate = { url: new URL('/contact', HOME), texts: [], fromHomepage: true, foundIn: 'footer' }
    const body: Candidate = { url: new URL('/contact-form', HOME), texts: ['Contact'], fromHomepage: true, foundIn: 'body' }
    const sitemap: Candidate = { url: new URL('/contactus', HOME), texts: [], fromHomepage: false, foundIn: 'sitemap' }
    expect(pick([sitemap, body, footer, nav])).toMatchObject({ url: nav.url, foundIn: 'nav' })
    expect(pick([sitemap, body, footer])).toMatchObject({ url: footer.url, foundIn: 'footer' })
    expect(pick([sitemap, body])).toMatchObject({ url: body.url, foundIn: 'body' })

    const site = fakeSite({
      '/': htmlPage('Home', '<footer><a href="/contact-old">Contact</a></footer><header><nav><a href="/contact-new">Contact</a></nav></header>'),
      '/contact-new': htmlPage('New'), '/contact-old': htmlPage('Old'),
    })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(data?.summary.groups?.contact).toMatchObject({ url: 'https://chaico.in/contact-new', foundIn: 'nav' })
  })

  it('lets the group’s real word beat a synonym, even from a weaker place', () => {
    const support: Candidate = { url: new URL('/support', HOME), texts: [], fromHomepage: true, foundIn: 'nav' }
    const contact: Candidate = { url: new URL('/contact', HOME), texts: [], fromHomepage: true, foundIn: 'footer' }
    expect(selectKeyPages([support, contact], NO_RULES, 5).picks[0].url.pathname).toBe('/contact')
  })

  it('crawls extra groups only with slots to spare, and never lists them as missing', async () => {
    const site = fakeSite({ '/': htmlPage('Home', '<a href="/about">About</a><a href="/faq">FAQ</a><a href="/shop">Shop</a>'), '/about': htmlPage('About'), '/faq': htmlPage('FAQ'), '/shop': htmlPage('Shop') })
    const roomy = (await collectPages(HOME, { safeFetch: site, env: {}, now })).data!
    expect(roomy.pages.map((p) => p.group)).toEqual(['about', 'shop', 'faq'])
    expect(roomy.summary.groupsNotFound).toEqual(['services', 'contact', 'pricing', 'work', 'blog'])
    expect(roomy.summary.groups?.careers.status).toBe('not-found')
    const tight = (await collectPages(HOME, { safeFetch: site, env: { SITE_SCAN_MAX_PAGES: '1' }, now })).data!
    expect(tight.pages.map((p) => p.group)).toEqual(['about'])
    expect(tight.summary.groups?.shop.status).toBe('not-checked')
  })

  it('reports a group whose every candidate robots.txt disallows', async () => {
    const site = fakeSite({ '/': htmlPage('Home', '<a href="/contact">Contact</a>'), '/robots.txt': 'User-agent: *\nDisallow: /contact' })
    expect((await collectPages(HOME, { safeFetch: site, env: {}, now })).data?.summary.groups?.contact).toEqual({ status: 'blocked-by-robots', confidence: 'measured' })
  })
})

describe('soft 404s and redirects', () => {
  it('treats a 200 page that says it was not found as an error', async () => {
    const site = fakeSite({
      '/': htmlPage('Home', '<a href="/about">About</a><a href="/services">Services</a><a href="/contact">Contact</a>'),
      '/about': htmlPage('Page not found | Chai'),
      '/services': htmlPage('Services', '<h1>404</h1><p>Oops</p>'),
      '/contact': htmlPage('Contact', '<p>Sorry, nothing here. Try the menu.</p>'),
      '/sitemap.xml': '<urlset><url><loc>https://chaico.in/about</loc></url></urlset>',
    })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(data?.pages.map((p) => p.soft404)).toEqual([true, true, true])
    expect(data?.pages[0]).toMatchObject({ statusCode: 200, check: null, error: expect.stringContaining('Soft 404') })
    expect(data?.summary.groupsFound).toEqual([])
    expect(data?.summary.soft404s).toHaveLength(3)
    expect(data?.summary.findings?.find((f) => f.code === 'soft-404')?.severity).toBe('high')
    expect(data?.sitemap?.soft404s).toEqual(['https://chaico.in/about'])
  })

  it('does not call a real article about 404 errors a soft 404', () => {
    const long = 'word '.repeat(600)
    expect(detectSoft404('How to fix a page not found error', null, long, 600)).toBeNull()
    expect(detectSoft404('Services', 'Our services', `We build sites. ${long}`, 600)).toBeNull()
    expect(detectSoft404('Services', 'Our services', 'We have 404 happy clients', 6)).toBeNull()
  })

  it('records the redirect chain and its type', async () => {
    const site = fakeSite({
      '/': htmlPage('Home', '<a href="/about">About</a><a href="/services">Services</a>'),
      '/about': () => res('https://chaico.in/about-us', 200, htmlPage('About'), { redirects: ['https://chaico.in/about-2', 'https://chaico.in/about-us'], redirectStatuses: [301, 308] }),
      '/services': () => res('https://chaico.in/svc', 200, htmlPage('Services'), { redirects: ['https://chaico.in/svc'], redirectStatuses: [302] }),
    })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(data?.pages[0].redirect).toEqual({ count: 2, type: 'permanent', httpToHttps: false, chain: ['https://chaico.in/about-2', 'https://chaico.in/about-us'] })
    expect(data?.pages[1].redirect?.type).toBe('temporary')
  })

  it('classifies mixed chains and http to https hops', () => {
    expect(redirectInfo({ url: 'https://a.in/', redirects: ['https://a.in/x', 'https://a.in/'], redirectStatuses: [301, 302] }, 'http://a.in/')).toMatchObject({ type: 'mixed', httpToHttps: true })
    expect(redirectInfo({ url: 'https://a.in/', redirects: [] }, 'https://a.in/')).toBeUndefined()
  })

  it('records the homepage’s own hop to https, and http:// internal links', async () => {
    const site = fakeSite({ '/': () => res('https://chaico.in/', 200, htmlPage('Home', '<a href="http://chaico.in/x">X</a>'), { redirects: ['https://chaico.in/'], redirectStatuses: [301] }) })
    const { data } = await collectPages(new URL('http://chaico.in/'), { safeFetch: site, env: {}, now })
    expect(data?.homepage.redirect).toMatchObject({ httpToHttps: true, type: 'permanent' })
    expect(data?.insecureInternalLinks).toEqual(['http://chaico.in/x'])
  })
})

describe('canonical validation', () => {
  const page = new URL('https://chaico.in/about')
  it('names every case', () => {
    expect(canonicalStatus(null, page, HOME)).toBe('missing')
    expect(canonicalStatus('  ', page, HOME)).toBe('missing')
    expect(canonicalStatus('https://chaico.in/about/', page, HOME)).toBe('self')
    expect(canonicalStatus('https://www.chaico.in/about', page, HOME)).toBe('self')
    expect(canonicalStatus('https://chaico.in/', page, HOME)).toBe('points-to-homepage')
    expect(canonicalStatus('/', page, HOME)).toBe('points-to-homepage')
    expect(canonicalStatus('https://chaico.in/other', page, HOME)).toBe('points-to-other-page')
    expect(canonicalStatus('https://other.com/about', page, HOME)).toBe('cross-domain')
    expect(canonicalStatus('http://chaico.in/about', page, HOME)).toBe('http-on-https-site')
    expect(canonicalStatus('/about', page, HOME)).toBe('relative')
    expect(canonicalStatus('https://chaico.in/', HOME, HOME)).toBe('self')
  })

  it('raises only the three real problems, canonical-to-homepage as critical', async () => {
    const withCanonical = (href: string) => `<!doctype html><html><head><title>T${href}</title><link rel="canonical" href="${href}"></head><body><h1>x</h1></body></html>`
    const site = fakeSite({
      '/': htmlPage('Home', '<a href="/about">About</a><a href="/services">Services</a><a href="/contact">Contact</a><a href="/pricing">Pricing</a>'),
      '/about': withCanonical('https://chaico.in/'),
      '/services': withCanonical('https://other.com/s'),
      '/contact': withCanonical('/contact'),
      '/pricing': withCanonical('https://chaico.in/other'),
    })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(data?.pages.map((p) => p.check?.details?.canonicalStatus)).toEqual(['points-to-homepage', 'cross-domain', 'relative', 'points-to-other-page'])
    const f = data?.summary.findings
    expect(f?.[0]).toMatchObject({ code: 'canonical-to-homepage', severity: 'critical', pages: ['https://chaico.in/about'] })
    expect(f?.find((x) => x.code === 'canonical-wrong-target')?.pages).toEqual(['https://chaico.in/services'])
    expect(JSON.stringify(f?.filter((x) => x.code.startsWith('canonical')))).not.toContain('/pricing')
  })
})

describe('link health', () => {
  const home = htmlPage('Home', '<a href="/about">About</a><a href="/gone">Old page</a><a href="/moved">Moved</a><a href="/secret">Hidden</a><a href="/members">Members</a><a href="/flaky">Flaky</a><a href="/nohead">No HEAD</a><a href="/doc.pdf">PDF</a>')

  it('reports broken and redirected links with the page they were on, using HEAD first', async () => {
    const methods: Array<[string, string | undefined]> = []
    const inner = fakeSite({
      '/': home,
      '/robots.txt': 'User-agent: *\nDisallow: /secret',
      '/about': htmlPage('About', '<a href="/deep-gone">Deep</a>'),
      '/moved': () => res('https://chaico.in/new', 200, '', { redirects: ['https://chaico.in/new'], redirectStatuses: [301] }),
      '/members': (u) => res(u.href, 403, ''),
      '/flaky': () => { throw new SafeFetchError('timeout', 'slow') },
      '/nohead': (u) => res(u.href, 200, ''),
    })
    const site = vi.fn(async (u: string | URL, options?: { method?: 'GET' | 'HEAD' }) => {
      const path = new URL(String(u)).pathname
      methods.push([path, options?.method])
      if (path === '/nohead' && options?.method === 'HEAD') return res(String(u), 405, '')
      return inner(u)
    })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    const h = data!.linkHealth!
    expect(h.broken).toEqual(expect.arrayContaining([
      { url: 'https://chaico.in/gone', status: 404, foundOn: 'https://chaico.in/' },
      { url: 'https://chaico.in/deep-gone', status: 404, foundOn: 'https://chaico.in/about' },
    ]))
    expect(h.broken).toHaveLength(2)
    expect(h.redirected).toEqual([{ url: 'https://chaico.in/moved', finalUrl: 'https://chaico.in/new', foundOn: 'https://chaico.in/', type: 'permanent', httpToHttps: false }])
    expect(h.inconclusive).toBe(2) // 403 and a timeout prove nothing
    expect(h).toMatchObject({ dropped: 0, confidence: 'measured' })
    expect(methods).toContainEqual(['/nohead', 'HEAD'])
    expect(methods).toContainEqual(['/nohead', undefined])
    // Not robots-disallowed links, not files, and nothing crawled anyway.
    const paths = methods.map(([p]) => p)
    expect(paths).not.toContain('/secret')
    expect(paths).not.toContain('/doc.pdf')
    expect(paths.filter((p) => p === '/about')).toHaveLength(1)
    expect(data?.summary.findings?.find((f) => f.code === 'broken-links')).toMatchObject({ severity: 'high', confidence: 'measured' })
  })

  it('checks at most 20 links', async () => {
    const many = Array.from({ length: 40 }, (_, i) => `<a href="/p${i}">P${i}</a>`).join('')
    const site = fakeSite({ '/': htmlPage('Home', many) })
    const h = (await collectPages(HOME, { safeFetch: site, env: {}, now })).data!.linkHealth!
    expect(h.candidates).toBe(40)
    expect(h.checked).toBe(20)
  })

  it('drops link checks first when time runs out, leaving the crawl whole', async () => {
    const hang = () => new Promise<never>(() => undefined)
    const site = fakeSite({
      '/': htmlPage('Home', '<a href="/about">About</a><a href="/ok">OK</a><a href="/slow1">1</a><a href="/slow2">2</a><a href="/slow3">3</a>'),
      '/about': htmlPage('About'),
      '/ok': htmlPage('OK'),
      '/slow1': hang, '/slow2': hang, '/slow3': hang,
    })
    const { data, status } = await collectPages(HOME, { safeFetch: site, env: {}, now, budgetMs: 40 })
    expect(status).toBe('ok')
    expect(data?.summary).toMatchObject({ truncated: false, note: null, groupsFound: ['about'], pagesCrawled: 1 })
    expect(data?.linkHealth?.dropped).toBeGreaterThan(0)
    expect(data?.linkHealth?.checked).toBeLessThan(4)
  })

  it('has no link results when time runs out before the crawl finishes', async () => {
    const site = fakeSite({ '/': htmlPage('Home', '<a href="/about">About</a>'), '/about': () => new Promise<never>(() => undefined) })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now, budgetMs: 30 })
    expect(data?.summary.truncated).toBe(true)
    expect(data?.linkHealth).toBeNull()
  })
})

describe('SITE_SCAN_PAGES_BUDGET_MS', () => {
  it('defaults to 35 s and stops at the 45 s ceiling', () => {
    expect(pagesBudgetMs({})).toBe(35_000)
    expect(pagesBudgetMs({ SITE_SCAN_PAGES_BUDGET_MS: '20000' })).toBe(20_000)
    expect(pagesBudgetMs({ SITE_SCAN_PAGES_BUDGET_MS: '999999' })).toBe(45_000)
    for (const bad of ['0', '-5', 'soon', '']) expect(pagesBudgetMs({ SITE_SCAN_PAGES_BUDGET_MS: bad }), bad).toBe(35_000)
  })
})

describe('sitemap quality', () => {
  const entry = (path: string, lastmod?: string) => `<url><loc>https://chaico.in${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`

  it('reports count, robots listing and newest lastmod, ignoring dates in the future', async () => {
    const site = fakeSite({
      '/': htmlPage('Home'),
      '/robots.txt': 'Sitemap: https://chaico.in/map.xml',
      '/map.xml': `<urlset>${entry('/a', '2026-01-02')}${entry('/b', '2026-03-04T10:00:00Z')}${entry('/c', '2099-01-01')}${entry('/d')}</urlset>`,
    })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(data?.sitemap).toMatchObject({ found: true, urlCount: 4, listedInRobotsTxt: true, hasLastmod: true, newestLastmod: '2026-03-04T10:00:00.000Z', robotsBlocksAll: false })
  })

  it('says when there is no sitemap or no lastmod', async () => {
    const none = await collectPages(HOME, { safeFetch: fakeSite({ '/': htmlPage('Home') }), env: {}, now })
    expect(none.data?.sitemap).toMatchObject({ found: false, urlCount: 0, listedInRobotsTxt: false, hasLastmod: false, newestLastmod: null })
    const bare = await collectPages(HOME, { safeFetch: fakeSite({ '/': htmlPage('Home'), '/sitemap.xml': `<urlset>${entry('/a')}</urlset>` }), env: {}, now })
    expect(bare.data?.sitemap).toMatchObject({ found: true, hasLastmod: false })
  })

  it('flags sitemap URLs we fetched that redirect, error, read as not found or are noindex', async () => {
    const noindex = '<html><head><title>Hidden</title><meta name="robots" content="noindex"></head><body><h1>x</h1></body></html>'
    const site = fakeSite({
      '/': htmlPage('Home'),
      '/sitemap.xml': `<urlset>${entry('/about')}${entry('/services')}${entry('/contact')}${entry('/pricing')}</urlset>`,
      '/about': () => res('https://chaico.in/about-us', 200, htmlPage('About'), { redirects: ['https://chaico.in/about-us'], redirectStatuses: [301] }),
      '/services': (u) => res(u.href, 404, ''),
      '/contact': noindex,
      '/pricing': htmlPage('Page not found'),
    })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(data?.sitemap).toMatchObject({
      redirects: [{ url: 'https://chaico.in/about', finalUrl: 'https://chaico.in/about-us' }],
      errors: [{ url: 'https://chaico.in/services', status: 404 }],
      noindex: ['https://chaico.in/contact'],
      soft404s: ['https://chaico.in/pricing'],
    })
    expect(data?.summary.findings?.find((f) => f.code === 'sitemap-bad-urls')?.severity).toBe('medium')
  })

  it('flags "Disallow: /" for all agents as critical, and only that', async () => {
    expect(parseRobots('User-agent: *\nDisallow: /').blocksAll).toBe(true)
    expect(parseRobots('User-agent: *\nDisallow: /\nAllow: /about').blocksAll).toBe(false)
    expect(parseRobots('User-agent: Googlebot\nDisallow: /').blocksAll).toBe(false)
    expect(parseRobots('User-agent: *\nDisallow: /private').blocksAll).toBe(false)
    const site = fakeSite({ '/': htmlPage('Home', '<a href="/about">About</a><form action="/s"></form>'), '/robots.txt': 'User-agent: *\nDisallow: /', '/about': htmlPage('About') })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    expect(data?.summary.findings?.[0]).toMatchObject({ code: 'robots-blocks-all', severity: 'critical', confidence: 'measured' })
    expect(pathsFetched(site)).not.toContain('/about')
  })
})

describe('page structure', () => {
  const details = async (path: string, html: string, group = 'about') => {
    const site = fakeSite({ '/': htmlPage('Home', `<a href="${path}">${group}</a>`), [path]: html })
    return (await collectPages(HOME, { safeFetch: site, env: {}, now })).data!.pages[0].check!.details!
  }

  it('counts headings and keeps the first ten as an outline', async () => {
    const h = `<h1>Top</h1>${Array.from({ length: 12 }, (_, i) => `<h2>Two <b>${i}</b></h2>`).join('')}<h3>Three</h3>`
    const d = await details('/about', htmlPage('About', h))
    expect(d.headings).toMatchObject({ h2: 12, h3: 1 })
    expect(d.headings.outline).toHaveLength(10)
    expect(d.headings.outline[0]).toEqual({ level: 1, text: 'Top' })
    expect(d.headings.outline[1]).toEqual({ level: 2, text: 'Two 0' })
  })

  it('flags thin about and services pages only', async () => {
    expect((await details('/about', htmlPage('About', '<p>Short.</p>'))).thinContent).toBe(true)
    expect((await details('/contact', htmlPage('Contact', '<p>Short.</p>'), 'contact')).thinContent).toBe(false)
    expect((await details('/about', htmlPage('About', `<p>${'word '.repeat(320)}</p>`))).thinContent).toBe(false)
  })

  it('reads Open Graph, Twitter card and image details', async () => {
    const html = `<html><head><title>A</title><meta property="og:title" content="A"><meta property="og:description" content="B"><meta property="og:image" content="c.png"><meta name="twitter:card" content="summary"></head><body><img src="a.png" width="1" height="1" loading="lazy" alt="x"><img src="b.png"></body></html>`
    const d = await details('/about', html)
    expect(d.social).toEqual({ ogTitle: true, ogDescription: true, ogImage: true, twitterCard: true })
    expect(d.images).toEqual({ missingDimensions: 1, lazy: true })
  })

  it('finds mixed content on https pages only, ignoring plain links', async () => {
    const html = htmlPage('About', '<img src="http://cdn.x/a.png"><script src="http://cdn.x/a.js"></script><iframe src="http://x/f"></iframe><a href="http://other.com">Out</a><img src="https://cdn.x/ok.png"><link rel="stylesheet" href="http://cdn.x/a.css"><link rel="canonical" href="http://chaico.in/about">')
    const d = await details('/about', html)
    expect(d.mixedContent.count).toBe(4)
    expect(d.mixedContent.samples).toEqual(expect.arrayContaining(['http://cdn.x/a.png', 'http://cdn.x/a.js', 'http://x/f', 'http://cdn.x/a.css']))

    const plain = fakeSite({ '/': htmlPage('Home', '<img src="http://cdn.x/a.png">') })
    const { data } = await collectPages(new URL('http://chaico.in/'), { safeFetch: plain, env: {}, now })
    expect(data?.homepage.check.details?.mixedContent.count).toBe(0)
  })

  it('reports which Organization fields are present, and the other types', async () => {
    const ld = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`
    const html = htmlPage('About', ld({ '@graph': [
      { '@type': 'LocalBusiness', name: 'Chai', telephone: '+91', address: { streetAddress: 'x' } },
      { '@type': 'FAQPage' }, { '@type': 'BreadcrumbList' }, { '@type': 'Product' }, { '@type': 'Service' },
    ] }))
    expect((await details('/about', html)).structuredData).toEqual({
      organization: { type: 'LocalBusiness', name: true, logo: false, url: false, telephone: true, address: true, sameAs: false },
      product: true, service: true, faq: true, breadcrumb: true,
    })
  })

  it('stores extracted fields only, never the page HTML', async () => {
    const secret = 'A-very-distinctive-sentence-from-the-page-body'
    const site = fakeSite({ '/': htmlPage('Home', `<p>${secret}</p><a href="/about">About</a>`), '/about': htmlPage('About', `<p>${secret}</p>`) })
    expect(JSON.stringify((await collectPages(HOME, { safeFetch: site, env: {}, now })).data)).not.toContain(secret)
  })
})

describe('marketing and tech signals', () => {
  const HOME_HTML = htmlPage('Home', `
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ"></script>
    <script>gtag('config', 'G-ABC123XYZ'); gtag('config', 'AW-123456789');</script>
    <script>(function(w,d,s,l,i){})(window,document,'script','dataLayer','GTM-AB12CD');</script>
    <script>fbq('init', '1234567890123');</script>
    <noscript><img src="https://www.facebook.com/tr?id=1234567890123&ev=PageView"></noscript>
    <script>_linkedin_partner_id = "556677";</script>
    <script>(function(h,o,t,j,a,r){h._hjSettings={hjid:778899,hjsv:6};})()</script>
    <script>(function(c,l,a,r,i,t,y){})(window, document, "clarity", "script", "abcd1234ef");</script>
    <a href="https://www.instagram.com/chai.co/?hl=en">Insta</a>
    <a href="https://www.instagram.com/p/xyz/">A post</a>
    <a href="https://www.facebook.com/chaico">FB</a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=x">Share</a>
    <a href="https://www.linkedin.com/company/chaico">In</a>
    <a href="https://youtube.com/@chaico">YT</a>
    <a href="https://twitter.com/intent/tweet?text=x">Tweet</a>
    <a href="https://x.com/chaico">X</a>
    <a href="https://in.pinterest.com/chaico/">Pin</a>
    <a href="https://www.threads.net/@chaico">Threads</a>
    <section id="testimonials"><h2>What our clients say</h2></section>
    <h2>Trusted by</h2>
    <iframe src="https://www.google.com/maps/embed?pb=abc"></iframe>
    <p>12 MG Road, Bengaluru, Karnataka 560001</p>`)

  it('extracts tag IDs and the Instagram handle, skipping share and post links', async () => {
    const site = fakeSite({ '/': () => res('https://chaico.in/', 200, HOME_HTML, { headers: { 'cf-ray': 'x', server: 'cloudflare', 'strict-transport-security': 'max-age=1', 'content-encoding': 'br', 'cache-control': 'no-store' } }) })
    const s = (await collectPages(HOME, { safeFetch: site, env: {}, now })).data!.signals!
    expect(s.tags).toEqual({ ga4: ['G-ABC123XYZ'], gtm: ['GTM-AB12CD'], googleAds: ['AW-123456789'], metaPixel: ['1234567890123'], linkedinInsight: ['556677'], hotjar: ['778899'], clarity: ['abcd1234ef'] })
    expect(s.instagramHandle).toBe('chai.co')
    expect(s.social.instagram).toEqual(['https://www.instagram.com/chai.co'])
    expect(s.social.facebook).toEqual(['https://www.facebook.com/chaico'])
    expect(s.social.x).toEqual(['https://x.com/chaico'])
    expect(s.social.pinterest).toHaveLength(1)
    expect(s.social.threads).toHaveLength(1)
    expect(s.social.youtube).toHaveLength(1)
    expect(s.trust).toEqual({ testimonials: true, clientLogos: true, googleMaps: true, address: 'text', googleReviews: false })
    expect(s.headers).toEqual({ server: 'cloudflare', cdn: 'Cloudflare', hsts: true, compression: 'br', cacheControl: 'no-store' })
  })

  it('counts one profile once, however it is linked', async () => {
    const site = fakeSite({ '/': htmlPage('Home', '<a href="https://instagram.com/chai/">A</a><a href="https://instagram.com/chai">B</a>') })
    expect((await collectPages(HOME, { safeFetch: site, env: {}, now })).data?.signals?.social.instagram).toEqual(['https://instagram.com/chai'])
  })

  it('finds nothing on a plain page, without guessing', async () => {
    const s = (await collectPages(HOME, { safeFetch: fakeSite({ '/': htmlPage('Home', '<p>G-FORCE is a band. Pin 560001 on the wall.</p>') }), env: {}, now })).data!.signals!
    expect(Object.values(s.tags).flat()).toEqual([])
    expect(Object.values(s.social).flat()).toEqual([])
    expect(s.instagramHandle).toBeNull()
    expect(s.trust).toEqual({ testimonials: false, clientLogos: false, googleMaps: false, address: null, googleReviews: false })
    expect(s.headers.cdn).toBeNull()
  })

  it('takes the handle from JSON-LD sameAs too, and rejects reserved paths', () => {
    expect(instagramHandleOf('https://instagram.com/@Chai_Co/')).toBe('chai_co')
    expect(instagramHandleOf('https://instagram.com/explore/')).toBeNull()
  })

  it('reports the latest post from the blog page, then from sitemap dates', async () => {
    const onPage = fakeSite({
      '/': htmlPage('Home', '<a href="/blog">Blog</a>'),
      '/blog': htmlPage('Blog', '<time datetime="2026-02-01">Feb</time><time datetime="2026-05-20">May</time><time datetime="2099-01-01">Later</time>'),
      '/sitemap.xml': '<urlset><url><loc>https://chaico.in/blog/a</loc><lastmod>2026-09-09</lastmod></url></urlset>',
    })
    expect((await collectPages(HOME, { safeFetch: onPage, env: {}, now })).data?.signals?.latestPost).toEqual({ date: '2026-05-20T00:00:00.000Z', source: 'blog page' })

    const fromSitemap = fakeSite({
      '/': htmlPage('Home', '<a href="/blog">Blog</a>'),
      '/blog': htmlPage('Blog'),
      '/sitemap.xml': '<urlset><url><loc>https://chaico.in/blog/a</loc><lastmod>2026-09-09</lastmod></url><url><loc>https://chaico.in/about</loc><lastmod>2026-10-01</lastmod></url></urlset>',
    })
    expect((await collectPages(HOME, { safeFetch: fromSitemap, env: {}, now })).data?.signals?.latestPost).toEqual({ date: '2026-09-09T00:00:00.000Z', source: 'sitemap' })
  })
})

describe('confidence on findings', () => {
  it('words what was not detected as "we did not find", and gives every finding a confidence', async () => {
    const site = fakeSite({ '/': htmlPage('Home', `<p>${'word '.repeat(80)}</p>`) })
    const { data } = await collectPages(HOME, { safeFetch: site, env: {}, now })
    const findings = data!.summary.findings!
    expect(findings.length).toBeGreaterThan(0)
    for (const f of findings) {
      expect(['measured', 'detected', 'not-detected', 'low'], f.code).toContain(f.confidence)
      expect(f.evidence, f.code).not.toMatch(/you (don.t|do not) have/i)
    }
    const contact = findings.find((f) => f.code === 'no-contact-method')!
    expect(contact).toMatchObject({ severity: 'critical', confidence: 'not-detected' })
    expect(contact.evidence).toMatch(/^We didn’t find/)
  })
})

describe('hostile HTML in the deeper parse', () => {
  it('stays fast whatever a page repeats', () => {
    for (const unit of ['<h2>', '<h1 x="', '@', 'a@', '@b.', '1', '+91 ', '<div id="x" ', '<div id="contact">', '<iframe src="x">', '<script src="http://x">', '<time datetime="x">', 'G-', 'GTM-', '"href":"/', '<a href="https://instagram.com/x">', 'href:"/a",', '<!--', 'id="']) {
      const hostile = `<html><head></head><body>${unit.repeat(Math.ceil(1_500_000 / unit.length))}`
      const started = Date.now()
      const page = parsePage(hostile)
      const parsed = parseDetails(hostile, page, now())
      parseMarketing(hostile, parsed, page.links, {})
      targetIdsOf(parsed.content)
      inlinePaths(parsed.scripts)
      expect(Date.now() - started, unit).toBeLessThan(2_500)
    }
  }, 60_000)
})

describe('every request goes through safeFetch', () => {
  const PUBLIC_IP = '93.184.215.14'
  const page = (status: number, headers: Record<string, string> = {}, text = ''): HopResponse =>
    ({ status, headers, body: new TextEncoder().encode(text), truncated: false })

  it('never connects to a private address, from a link or from a redirect', async () => {
    const contacted: string[] = []
    const transport = vi.fn<Transport>(async (url) => {
      contacted.push(url.href)
      if (url.pathname === '/') return page(200, {}, htmlPage('Home', `
        <a href="http://169.254.169.254/about">About</a>
        <a href="http://10.0.0.5/services">Services</a>
        <a href="http://localhost/pricing">Pricing</a>
        <a href="/contact">Contact</a>`))
      if (url.pathname === '/contact') return page(302, { location: 'http://169.254.169.254/latest/meta-data/' })
      return page(404)
    })
    const safeFetch = (u: string | URL) => realSafeFetch(u, { resolve: async () => [PUBLIC_IP], transport })
    const result = await collectPages(HOME, { safeFetch, env: {}, now })

    expect(result.status).toBe('ok')
    expect(contacted.every((u) => new URL(u).hostname === 'chaico.in')).toBe(true)
    expect(result.data?.pages).toEqual([expect.objectContaining({ group: 'contact', finalUrl: null, check: null, error: expect.stringContaining('private network') })])
  })
})
