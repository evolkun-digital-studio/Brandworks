import { describe, expect, it, vi } from 'vitest'
import { SafeFetchError, type SafeResponse } from '../safeFetch'
import { collectAll } from './index'
import { collectAuthority, MOZ_URL } from './authority'
import { collectOnPage, detectPlatform, parseHomepage } from './onPage'
import { collectPerformance, PSI_URL } from './performance'
import { collectTraffic, INDIA_LOCATION_CODE } from './traffic'

const now = () => new Date('2026-10-22T10:00:00Z')
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const fetchReturning = (...responses: Response[]) => {
  const fn = vi.fn<typeof fetch>()
  for (const r of responses) fn.mockResolvedValueOnce(r)
  return fn
}
const callOf = (fn: ReturnType<typeof vi.fn<typeof fetch>>, i = 0) => {
  const [input, init] = fn.mock.calls[i]
  return { url: String(input), init: init as RequestInit, body: init?.body ? JSON.parse(String(init.body)) : undefined }
}

/* -------------------------------------------------------------------------- */
/*  On-page                                                                   */
/* -------------------------------------------------------------------------- */

const HOMEPAGE = `<!doctype html><html lang="en-IN"><head>
<title>Chai &amp; Co. — Kolkata café</title>
<meta name="description" content="Hand-pulled chai and snacks in Kolkata since 1998.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="index, follow">
<meta property="og:title" content="Chai &amp; Co.">
<meta property="og:image" content="https://chaico.in/og.jpg">
<meta name="generator" content="WordPress 6.6">
<link rel="canonical" href="https://chaico.in/">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"CafeOrCoffeeShop"},{"@type":["Organization","LocalBusiness"]}]}</script>
<script type="application/ld+json">{ broken json </script>
</head><body>
<h1>Chai &amp; Co.</h1><h1>Our menu</h1>
<p>Fresh chai every morning, made by hand.</p>
<img src="/a.jpg" alt="Cup of chai"><img src="/b.jpg"><img src="/c.jpg" alt="">
<script>var notCounted = "lots of words in a script";</script>
</body></html>`

const res = (url: string, status: number, text: string, extra: Partial<SafeResponse> = {}): SafeResponse =>
  ({ url, status, text, headers: {}, truncated: false, redirects: [], elapsedMs: 420, ...extra })

describe('onPage collector', () => {
  it('parses the homepage head, counts and platform', () => {
    const p = parseHomepage(HOMEPAGE)
    expect(p.title).toEqual({ text: 'Chai & Co. — Kolkata café', length: 25 })
    expect(p.metaDescription.length).toBe(50)
    expect(p).toMatchObject({ h1Count: 2, canonical: 'https://chaico.in/', lang: 'en-IN', viewport: true, noindex: false, platform: 'WordPress' })
    expect(p.openGraph).toEqual({ 'og:title': 'Chai & Co.', 'og:image': 'https://chaico.in/og.jpg' })
    expect(p.jsonLdTypes).toEqual(['CafeOrCoffeeShop', 'Organization', 'LocalBusiness'])
    expect(p.images).toEqual({ total: 3, missingAlt: 1 })
    // "Chai & Co." (the lone "&" isn't a word) + "Our menu" + the 7-word paragraph; the <script> is ignored.
    expect(p.wordCount).toBe(11)
  })

  it('detects common platforms from generator tags and asset paths', () => {
    expect(detectPlatform('<script src="https://cdn.shopify.com/s/x.js">', null)).toBe('Shopify')
    expect(detectPlatform('<img src="https://static.wixstatic.com/a.png">', null)).toBe('Wix')
    expect(detectPlatform('<html data-wf-site="1">', null)).toBe('Webflow')
    expect(detectPlatform('<img src="https://framerusercontent.com/i.png">', null)).toBe('Framer')
    expect(detectPlatform('<script src="/_next/static/chunks/main.js">', null)).toBe('Next.js')
    expect(detectPlatform('<p>hi</p>', null)).toBeNull()
  })

  it('returns ok with robots.txt and sitemap checks', async () => {
    const safeFetch = vi.fn(async (u: string | URL) => {
      const path = new URL(String(u)).pathname
      if (path === '/robots.txt') return res('https://chaico.in/robots.txt', 200, 'User-agent: *\nSitemap: https://chaico.in/sitemap_index.xml')
      if (path === '/sitemap.xml') return res('https://chaico.in/sitemap.xml', 404, 'not found')
      return res('https://chaico.in/', 200, HOMEPAGE, { redirects: ['https://chaico.in/'] })
    })
    const result = await collectOnPage(new URL('http://chaico.in'), { safeFetch, now })
    expect(result).toMatchObject({ status: 'ok', fetchedAt: '2026-10-22T10:00:00.000Z' })
    expect(result.data).toMatchObject({ https: true, responseTimeMs: 420, redirects: 1, robotsTxt: true, sitemapXml: false, sitemapInRobotsTxt: true })
  })

  it('records a robots.txt redirect loop as a site problem, and our own network trouble as unknown', async () => {
    const safeFetch = vi.fn(async (u: string | URL) => {
      const path = new URL(String(u)).pathname
      if (path === '/robots.txt') throw new SafeFetchError('redirects', 'The website redirected too many times.')
      if (path === '/sitemap.xml') throw new SafeFetchError('timeout', 'The website took too long to respond.')
      return res('https://chaico.in/', 200, HOMEPAGE)
    })
    const result = await collectOnPage(new URL('https://chaico.in'), { safeFetch, now })
    expect(result.data).toMatchObject({
      robotsTxt: false,
      robotsTxtProblem: 'robots.txt not reachable: The website redirected too many times.',
      sitemapXml: null,
      sitemapXmlProblem: null,
    })
  })

  it('reports an error (not a guess) when the homepage fails', async () => {
    const blocked = vi.fn(async () => { throw new SafeFetchError('blocked', 'private network') })
    expect(await collectOnPage(new URL('https://chaico.in'), { safeFetch: blocked, now })).toMatchObject({ status: 'error', data: null, reason: 'private network' })
    const notFound = vi.fn(async () => res('https://chaico.in/', 503, ''))
    expect(await collectOnPage(new URL('https://chaico.in'), { safeFetch: notFound, now })).toMatchObject({ status: 'error', reason: 'Homepage responded 503' })
  })
})

/* -------------------------------------------------------------------------- */
/*  Performance (PageSpeed Insights)                                          */
/* -------------------------------------------------------------------------- */

const PSI_BODY = {
  lighthouseResult: {
    categories: { performance: { score: 0.41 }, seo: { score: 0.92 }, accessibility: { score: 0.88 }, 'best-practices': { score: 0.96 } },
    audits: {
      'largest-contentful-paint': { numericValue: 4123.7 },
      'first-contentful-paint': { numericValue: 1800.2 },
      'total-blocking-time': { numericValue: 610 },
      'cumulative-layout-shift': { numericValue: 0.0823 },
      'speed-index': { numericValue: 5100 },
    },
  },
  loadingExperience: {
    overall_category: 'SLOW',
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: 4100, category: 'SLOW' },
      INTERACTION_TO_NEXT_PAINT: { percentile: 180, category: 'FAST' },
      CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5, category: 'FAST' },
    },
  },
}

describe('performance collector', () => {
  it('stores the four scores, lab metrics and real-user field data', async () => {
    const fetchImpl = fetchReturning(json(PSI_BODY))
    const result = await collectPerformance(new URL('https://chaico.in/'), { fetch: fetchImpl, env: {}, now })
    expect(result.status).toBe('ok')
    expect(result.data).toEqual({
      strategy: 'mobile',
      scores: { performance: 41, seo: 92, accessibility: 88, bestPractices: 96 },
      lab: { lcpMs: 4124, fcpMs: 1800, tbtMs: 610, cls: 0.082, speedIndexMs: 5100 },
      field: {
        scope: 'url',
        overall: 'poor',
        lcpMs: { value: 4100, category: 'poor' },
        inpMs: { value: 180, category: 'good' },
        cls: { value: 0.05, category: 'good' },
      },
    })
    const { url } = callOf(fetchImpl)
    const sent = new URL(url)
    expect(`${sent.origin}${sent.pathname}`).toBe(PSI_URL)
    expect(sent.searchParams.get('url')).toBe('https://chaico.in/')
    expect(sent.searchParams.get('strategy')).toBe('mobile')
    expect(sent.searchParams.getAll('category')).toEqual(['PERFORMANCE', 'SEO', 'ACCESSIBILITY', 'BEST_PRACTICES'])
    expect(sent.searchParams.has('key')).toBe(false)
  })

  it('sends the optional API key and leaves field data null when Google has none', async () => {
    const fetchImpl = fetchReturning(json({ lighthouseResult: PSI_BODY.lighthouseResult, loadingExperience: { id: 'x' } }))
    const result = await collectPerformance(new URL('https://chaico.in/'), { fetch: fetchImpl, env: { GOOGLE_PSI_API_KEY: 'psi-key' }, now })
    expect(result.data?.field).toBeNull()
    expect(new URL(callOf(fetchImpl).url).searchParams.get('key')).toBe('psi-key')
  })

  it('reports API errors', async () => {
    const result = await collectPerformance(new URL('https://chaico.in/'), {
      fetch: fetchReturning(json({ error: { message: 'Lighthouse returned error: FAILED_DOCUMENT_REQUEST' } }, 400)),
      env: {},
      now,
    })
    expect(result).toMatchObject({ status: 'error', data: null, reason: 'PageSpeed Insights responded 400: Lighthouse returned error: FAILED_DOCUMENT_REQUEST' })
  })

  it('times out', async () => {
    const hang = vi.fn<typeof fetch>((_input, init) => new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    }))
    expect(await collectPerformance(new URL('https://chaico.in/'), { fetch: hang, env: {}, now, timeoutMs: 10 })).toMatchObject({ status: 'error', reason: 'PageSpeed Insights timed out' })
  })
})

/* -------------------------------------------------------------------------- */
/*  Authority (Moz / DataForSEO)                                              */
/* -------------------------------------------------------------------------- */

const MOZ_BODY = {
  id: 'x',
  jsonrpc: '2.0',
  result: {
    site_query: { query: 'chaico.in', scope: 'domain' },
    site_metrics: { domain_authority: 23, page_authority: 31, spam_score: 2, root_domains_to_root_domain: 140, external_pages_to_root_domain: 2210 },
  },
}

const DFS_BACKLINKS = {
  status_code: 20000,
  status_message: 'Ok.',
  tasks: [{
    status_code: 20000,
    status_message: 'Ok.',
    result: [{ target: 'chaico.in', rank: 212, backlinks: 3120, referring_domains: 140, referring_main_domains: 128, broken_backlinks: 7, backlinks_spam_score: 4 }],
  }],
}

describe('authority collector', () => {
  it('is skipped when no provider or no key is configured', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
    expect(await collectAuthority('chaico.in', { fetch: fetchImpl, env: {}, now })).toMatchObject({ status: 'skipped', data: null })
    expect(await collectAuthority('chaico.in', { fetch: fetchImpl, env: { SEO_DATA_PROVIDER: 'moz' }, now })).toMatchObject({ status: 'skipped', reason: 'MOZ_API_TOKEN is not set' })
    expect(await collectAuthority('chaico.in', { fetch: fetchImpl, env: { SEO_DATA_PROVIDER: 'dataforseo', DATAFORSEO_LOGIN: 'me' }, now })).toMatchObject({ status: 'skipped' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('Moz: calls data.site.metrics.fetch with x-moz-token and maps the metrics', async () => {
    const fetchImpl = fetchReturning(json(MOZ_BODY))
    const result = await collectAuthority('chaico.in', { fetch: fetchImpl, env: { SEO_DATA_PROVIDER: 'moz', MOZ_API_TOKEN: 'moz-token' }, now })
    expect(result).toMatchObject({ status: 'ok', source: 'Moz API' })
    expect(result.data).toEqual({ provider: 'moz', domainAuthority: 23, pageAuthority: 31, spamScore: 2, linkingRootDomains: 140, externalLinks: 2210 })
    const call = callOf(fetchImpl)
    expect(call.url).toBe(MOZ_URL)
    expect((call.init.headers as Record<string, string>)['x-moz-token']).toBe('moz-token')
    expect(call.body).toMatchObject({ jsonrpc: '2.0', method: 'data.site.metrics.fetch', params: { data: { site_query: { query: 'chaico.in', scope: 'domain' } } } })
  })

  it('Moz: reports JSON-RPC errors', async () => {
    const fetchImpl = fetchReturning(json({ jsonrpc: '2.0', id: 'x', error: { code: -32651, status: 401, message: 'Unauthorized' } }, 401))
    expect(await collectAuthority('chaico.in', { fetch: fetchImpl, env: { SEO_DATA_PROVIDER: 'moz', MOZ_API_TOKEN: 'bad' }, now }))
      .toMatchObject({ status: 'error', data: null, reason: 'Moz responded 401: Unauthorized' })
  })

  it('DataForSEO: calls backlinks summary/live with Basic auth and maps Domain Rank (not DA)', async () => {
    const fetchImpl = fetchReturning(json(DFS_BACKLINKS))
    const env = { SEO_DATA_PROVIDER: 'dataforseo', DATAFORSEO_LOGIN: 'me@x.com', DATAFORSEO_PASSWORD: 'pw' }
    const result = await collectAuthority('chaico.in', { fetch: fetchImpl, env, now })
    expect(result.data).toEqual({
      provider: 'dataforseo', domainRank: 212, domainRankScale: 1000, backlinks: 3120,
      referringDomains: 140, referringMainDomains: 128, brokenBacklinks: 7, backlinksSpamScore: 4,
    })
    const call = callOf(fetchImpl)
    expect(call.url).toBe('https://api.dataforseo.com/v3/backlinks/summary/live')
    expect((call.init.headers as Record<string, string>).authorization).toBe(`Basic ${Buffer.from('me@x.com:pw').toString('base64')}`)
    expect(call.body).toEqual([{ target: 'chaico.in', include_subdomains: true }])
  })

  it('DataForSEO: reports task-level errors', async () => {
    const fetchImpl = fetchReturning(json({ status_code: 20000, tasks: [{ status_code: 40501, status_message: 'Invalid Field: target.' }] }))
    const env = { SEO_DATA_PROVIDER: 'dataforseo', DATAFORSEO_LOGIN: 'me', DATAFORSEO_PASSWORD: 'pw' }
    expect(await collectAuthority('chaico.in', { fetch: fetchImpl, env, now }))
      .toMatchObject({ status: 'error', reason: 'DataForSEO task error 40501: Invalid Field: target.' })
  })
})

/* -------------------------------------------------------------------------- */
/*  Traffic (DataForSEO Labs)                                                 */
/* -------------------------------------------------------------------------- */

const TRAFFIC_ENV = { SEO_DATA_PROVIDER: 'dataforseo', DATAFORSEO_LOGIN: 'me', DATAFORSEO_PASSWORD: 'pw', SITE_SCAN_TRAFFIC: 'true' }

describe('traffic collector', () => {
  it('is skipped unless dataforseo + SITE_SCAN_TRAFFIC=true + credentials', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
    for (const env of [{}, { ...TRAFFIC_ENV, SEO_DATA_PROVIDER: 'moz' }, { ...TRAFFIC_ENV, SITE_SCAN_TRAFFIC: 'false' }, { ...TRAFFIC_ENV, DATAFORSEO_PASSWORD: '' }]) {
      expect(await collectTraffic('chaico.in', { fetch: fetchImpl, env, now })).toMatchObject({ status: 'skipped', data: null })
    }
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('reads estimated organic traffic and keyword count for India', async () => {
    const fetchImpl = fetchReturning(json({
      status_code: 20000,
      tasks: [{ status_code: 20000, result: [{ items: [{ metrics: { organic: { etv: 1834.6, count: 212 } } }] }] }],
    }))
    const result = await collectTraffic('chaico.in', { fetch: fetchImpl, env: TRAFFIC_ENV, now })
    expect(result.data).toEqual({ estimatedOrganicTraffic: 1835, rankingKeywords: 212, locationCode: INDIA_LOCATION_CODE, location: 'India', languageCode: 'en' })
    const call = callOf(fetchImpl)
    expect(call.url).toBe('https://api.dataforseo.com/v3/dataforseo_labs/google/domain_rank_overview/live')
    expect(call.body).toEqual([{ target: 'chaico.in', location_code: 2356, language_code: 'en' }])
  })

  it('reports "not available" (null), not zero, when there are no items', async () => {
    const fetchImpl = fetchReturning(json({ status_code: 20000, tasks: [{ status_code: 20000, result: [{ items: [] }] }] }))
    expect((await collectTraffic('chaico.in', { fetch: fetchImpl, env: TRAFFIC_ENV, now })).data).toMatchObject({ estimatedOrganicTraffic: null, rankingKeywords: null })
  })

  it('reports API errors', async () => {
    const fetchImpl = fetchReturning(json({ status_code: 40100, status_message: 'You are not authorized.' }, 200))
    expect(await collectTraffic('chaico.in', { fetch: fetchImpl, env: TRAFFIC_ENV, now }))
      .toMatchObject({ status: 'error', reason: 'DataForSEO error 40100: You are not authorized.' })
  })
})

/* -------------------------------------------------------------------------- */
/*  collectAll                                                                */
/* -------------------------------------------------------------------------- */

describe('collectAll', () => {
  it('skips paid sources over the daily cap and never lets one failure break the rest', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      if (String(input).startsWith(PSI_URL)) throw new Error('boom')
      return json(MOZ_BODY)
    })
    const env = { SEO_DATA_PROVIDER: 'moz', MOZ_API_TOKEN: 'moz-token' }
    const capped = await collectAll(new URL('https://www.chaico.in/'), { allowPaid: false, deps: { fetch: fetchImpl, env, now } })
    expect(capped.domain).toBe('chaico.in')
    expect(capped.authority).toMatchObject({ status: 'skipped' })
    expect(capped.traffic).toMatchObject({ status: 'skipped' })
    expect(capped.performance).toMatchObject({ status: 'error' })
    expect(fetchImpl.mock.calls.some(([u]) => String(u) === MOZ_URL)).toBe(false)

    const paid = await collectAll(new URL('https://www.chaico.in/'), { allowPaid: true, deps: { fetch: fetchImpl, env, now } })
    expect(paid.authority).toMatchObject({ status: 'ok', data: { domainAuthority: 23 } })
  })

  it('reuses earlier paid results instead of re-billing when only the free checks are retried', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json(PSI_BODY))
    const env = { SEO_DATA_PROVIDER: 'moz', MOZ_API_TOKEN: 'moz-token' }
    const earlier = { status: 'ok' as const, source: 'Moz API', fetchedAt: '2026-10-20T00:00:00.000Z', data: { provider: 'moz' as const, domainAuthority: 23, pageAuthority: 31, spamScore: 2, linkingRootDomains: 140, externalLinks: 2210 } }
    const result = await collectAll(new URL('https://chaico.in/'), {
      allowPaid: true,
      deps: { fetch: fetchImpl, env, now },
      paid: { authority: earlier, traffic: { status: 'skipped', source: 'x', fetchedAt: earlier.fetchedAt, data: null } },
    })
    expect(result.authority).toBe(earlier)
    expect(result.performance.status).toBe('ok')
    expect(fetchImpl.mock.calls.some(([u]) => String(u) === MOZ_URL)).toBe(false)
  })
})
