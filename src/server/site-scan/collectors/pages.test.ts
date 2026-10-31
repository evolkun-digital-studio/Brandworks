import { describe, expect, it, vi } from 'vitest'
import { SafeFetchError, safeFetch as realSafeFetch, type HopResponse, type SafeResponse, type Transport } from '../safeFetch'
import { parseHomepage, parsePage } from './onPage'
import {
  collectCandidates,
  collectPages,
  matchesGroup,
  maxPages,
  parseRobots,
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
