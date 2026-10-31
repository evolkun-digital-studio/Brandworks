/**
 * A small crawl of the pages that matter for a business (About, Services,
 * Contact...), found from the homepage's links and sitemap.xml. Every request
 * goes through safeFetch, at most two at a time, inside an overall time budget;
 * when it runs out, whatever finished comes back as a partial result.
 *
 * "Not found" only ever means no link or sitemap entry matched. A page we
 * know of but couldn't read is "not checked", never "not found".
 */
import { SafeFetchError, TIMEOUT_MS, USER_AGENT, domainOf, safeFetch as defaultSafeFetch, type SafeResponse } from '../safeFetch'
import {
  KEY_PAGE_GROUPS,
  envOf,
  failed,
  ok,
  skipped,
  type CollectorDeps,
  type CollectorResult,
  type CrawledPage,
  type DuplicateText,
  type Env,
  type KeyPageCheck,
  type KeyPageGroup,
  type PagesData,
  type PagesSummary,
} from '../types'
import { looksLikeHtml, parsePage } from './onPage'

export const PAGES_SOURCE = 'Key pages HTML (homepage links + sitemap.xml)'

type PagesDeps = CollectorDeps & { safeFetch?: (url: string | URL) => Promise<SafeResponse>; budgetMs?: number }

const DEFAULT_MAX_PAGES = 5
const MAX_PAGES_CEILING = 10
const BUDGET_MS = 25_000
const CONCURRENCY = 2
const MAX_ROOT_SITEMAPS = 3
const MAX_CHILD_SITEMAPS = 5
const MAX_SITEMAP_URLS = 5_000
const MAX_BLOCKED_LISTED = 10

/** How many key pages to crawl. The homepage isn't counted; onPage already covers it. */
export function maxPages(env: Env = process.env): number {
  const n = Number.parseInt(env.SITE_SCAN_MAX_PAGES ?? '', 10)
  return Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_PAGES_CEILING) : DEFAULT_MAX_PAGES
}

/* -------------------------------------------------------------------------- */
/*  robots.txt                                                                */
/* -------------------------------------------------------------------------- */

type RobotsRule = { allow: boolean; pattern: string }
export type Robots = { rules: RobotsRule[]; sitemaps: string[] }

const OUR_AGENT = USER_AGENT.split('/')[0].toLowerCase()

/** Rules addressed to us AND to '*' both count: being more careful than a strict parser costs nothing. */
export function parseRobots(text: string): Robots {
  const robots: Robots = { rules: [], sitemaps: [] }
  let agents: string[] = []
  let inRules = false
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split('#')[0]
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim().toLowerCase()
    const value = line.slice(colon + 1).trim()
    if (key === 'sitemap') {
      if (value) robots.sitemaps.push(value)
    } else if (key === 'user-agent') {
      if (inRules) { agents = []; inRules = false }
      agents.push(value.toLowerCase())
    } else if (key === 'allow' || key === 'disallow') {
      inRules = true
      if (value && agents.some((a) => a === '*' || a === OUR_AGENT)) robots.rules.push({ allow: key === 'allow', pattern: value })
    }
  }
  return robots
}

/** `*` and a trailing `$`, matched with indexOf rather than a regex: the pattern comes from the site being scanned. */
function robotsPatternMatches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith('$')
  const parts = (anchored ? pattern.slice(0, -1) : pattern).split('*')
  if (!path.startsWith(parts[0])) return false
  if (parts.length === 1) return !anchored || path === parts[0]
  let at = parts[0].length
  for (const part of parts.slice(1, -1)) {
    const found = path.indexOf(part, at)
    if (found === -1) return false
    at = found + part.length
  }
  const last = parts[parts.length - 1]
  if (anchored) return path.endsWith(last) && path.length - last.length >= at
  return path.indexOf(last, at) !== -1
}

/** The longest matching rule wins; on a tie, Allow wins (RFC 9309). */
export function robotsAllows(robots: Robots, path: string): boolean {
  let best: RobotsRule | null = null
  for (const rule of robots.rules) {
    if (!robotsPatternMatches(rule.pattern, path)) continue
    if (!best || rule.pattern.length > best.pattern.length || (rule.pattern.length === best.pattern.length && rule.allow)) best = rule
  }
  return best ? best.allow : true
}

/* -------------------------------------------------------------------------- */
/*  Discovery                                                                 */
/* -------------------------------------------------------------------------- */

export type Candidate = { url: URL; texts: string[]; fromHomepage: boolean }

const FILE = /\.(pdf|jpe?g|png|gif|webp|avif|svg|ico|bmp|tiff?|zip|rar|7z|gz|tar|docx?|xlsx?|pptx?|csv|mp[34]|mov|avi|webm|wav|css|js|json|xml|rss|txt|woff2?|ttf|eot|exe|dmg|apk)$/i
const PRIVATE_AREA = /(^|\/)(log-?in|sign-?in|log-?out|sign-?out|cart|checkout|my-?account|accounts?|wp-admin|wp-login(\.php)?)(\/|$)/i

const sameSite = (url: URL, domain: string) =>
  domainOf(url) === domain && (url.port === '' || url.port === '80' || url.port === '443')

const isExcludedPath = (path: string) => FILE.test(path) || PRIVATE_AREA.test(path)
const pathKey = (path: string) => path.replace(/\/+$/, '').toLowerCase() || '/'

function parseUrl(raw: string, base: URL): URL | null {
  try {
    const url = new URL(raw, base)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

/**
 * Crawlable pages of this site, one per path: same host (www or not), without
 * the query string or fragment, without files and login/cart-type areas. Each
 * comes back on the homepage's own origin.
 */
export function collectCandidates(
  links: Array<{ href: string; text: string }>,
  sitemapUrls: string[],
  home: URL,
  domain: string,
): Candidate[] {
  const byPath = new Map<string, Candidate>()
  const add = (raw: string, text: string | null, fromHomepage: boolean) => {
    const url = parseUrl(raw, home)
    if (!url || url.username || url.password || !sameSite(url, domain) || isExcludedPath(url.pathname)) return
    const key = pathKey(url.pathname)
    if (key === pathKey(home.pathname) || key === '/') return
    // Set on a copy of the origin, not resolved against it: a path like "//other.com/x" would change the host.
    const onHome = new URL(home.origin)
    onHome.pathname = url.pathname
    const known = byPath.get(key) ?? { url: onHome, texts: [], fromHomepage }
    known.fromHomepage ||= fromHomepage
    if (text) known.texts.push(text)
    byPath.set(key, known)
  }
  for (const link of links) add(link.href, link.text, true)
  for (const raw of sitemapUrls) add(raw, null, false)
  return [...byPath.values()]
}

const locsOf = (xml: string) =>
  [...xml.matchAll(/<loc\b[^>]{0,200}>([\s\S]{0,2048}?)<\/loc>/gi)]
    .map((m) => m[1].replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '').replace(/&amp;/g, '&').trim())
    .filter(Boolean)

/* -------------------------------------------------------------------------- */
/*  Choosing the pages                                                        */
/* -------------------------------------------------------------------------- */

const GROUP_KEYWORDS: Record<KeyPageGroup, string> = {
  about: 'about|aboutus',
  services: 'services?|products?|solutions?',
  contact: 'contact|contactus',
  pricing: 'pricing|plans?',
  work: 'work|portfolio|case stud(y|ies)',
  blog: 'blog|news',
}

/** Words that can sit around a keyword in a page's address: "/our-services", "/contact-us". */
const PATH_FILLER = new Set(['our', 'the', 'my', 'us', 'page', 'pages', 'all'])
/** A nav label, not a sentence: "About Chai & Co" but not "We'd love to tell you about us". */
const MAX_LINK_TEXT_WORDS = 3

/** "Terms of service" is not the Services page. */
const LEGAL = /\b(terms|privacy|cookies?|legal|polic(y|ies)|disclaimer)\b/
/** Posts can be about anything: "/blog/how-we-work" isn't the Work page. */
const CONTENT_SECTION = /\b(blog|news|posts?|articles?)\b/

const wordsOf = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const segmentsOf = (path: string) => path.split('/').filter(Boolean).map(wordsOf)

export function matchesGroup(candidate: Candidate, group: KeyPageGroup): boolean {
  const segments = segmentsOf(candidate.url.pathname)
  if (segments.some((s) => LEGAL.test(s))) return false
  // A whole segment must be the keyword: sitemaps are full of slugs like "/projects/new-product-line".
  const wholeSegment = new RegExp(`^(${GROUP_KEYWORDS[group]})$`)
  const withoutFiller = (segment: string) => segment.split(' ').filter((w) => !PATH_FILLER.has(w)).join(' ')
  const pathMatch = (group === 'blog' || !CONTENT_SECTION.test(segments[0] ?? '')) && segments.slice(0, 2).some((s) => wholeSegment.test(withoutFiller(s)))
  if (pathMatch) return true
  const inText = new RegExp(`\\b(${GROUP_KEYWORDS[group]})\\b`)
  return candidate.texts.some((text) => {
    const words = wordsOf(text)
    return words.split(' ').length <= MAX_LINK_TEXT_WORDS && !LEGAL.test(words) && !/^work with\b/.test(words) && inText.test(words)
  })
}

export type Selection = {
  picks: Array<{ group: KeyPageGroup; url: URL }>
  /** No candidate matched at all. */
  notFound: KeyPageGroup[]
  blockedByRobots: string[]
}

/** In priority order, at most one page per group and one group per page. Shallow pages and homepage links win. */
export function selectKeyPages(candidates: Candidate[], robots: Robots, limit: number): Selection {
  const selection: Selection = { picks: [], notFound: [], blockedByRobots: [] }
  const taken = new Set<string>()
  for (const group of KEY_PAGE_GROUPS) {
    const matching = candidates
      .filter((c) => matchesGroup(c, group) && !taken.has(c.url.href))
      .sort((a, b) => segmentsOf(a.url.pathname).length - segmentsOf(b.url.pathname).length || Number(b.fromHomepage) - Number(a.fromHomepage))
    if (matching.length === 0) { selection.notFound.push(group); continue }
    if (selection.picks.length >= limit) continue
    const allowed = matching.find((c) => robotsAllows(robots, c.url.pathname))
    for (const c of matching) {
      if (c === allowed) break
      if (selection.blockedByRobots.length < MAX_BLOCKED_LISTED) selection.blockedByRobots.push(c.url.href)
    }
    if (allowed) {
      taken.add(allowed.url.href)
      selection.picks.push({ group, url: allowed.url })
    }
  }
  return selection
}

/* -------------------------------------------------------------------------- */
/*  Reading a page                                                            */
/* -------------------------------------------------------------------------- */

function checkOf(html: string, truncated: boolean): { check: KeyPageCheck; links: Array<{ href: string; text: string }> } {
  const p = parsePage(html)
  return {
    links: p.links,
    check: {
      htmlTruncated: truncated,
      title: p.title,
      metaDescription: p.metaDescription,
      h1Count: p.h1Count,
      canonical: p.canonical,
      noindex: p.noindex,
      wordCount: p.wordCount,
      images: p.images,
      jsonLdTypes: p.jsonLdTypes,
      hasForm: p.hasForm,
      contactLinks: p.contactLinks,
      ctaTexts: p.ctaTexts,
    },
  }
}

type Get = (url: string | URL) => Promise<SafeResponse>

async function readPage(pick: Selection['picks'][number], get: Get, home: URL, domain: string): Promise<CrawledPage> {
  const page = { group: pick.group, url: pick.url.href }
  let response: SafeResponse
  try {
    response = await get(pick.url)
  } catch (error) {
    return { ...page, finalUrl: null, statusCode: null, error: error instanceof Error ? error.message : 'Page fetch failed', check: null }
  }
  const final = new URL(response.url)
  const reached = { ...page, finalUrl: response.url, statusCode: response.status }
  const contentType = response.headers['content-type']
  const problem = response.status >= 400 ? `Responded ${response.status}`
    : !sameSite(final, domain) ? 'Redirected to another site'
    : pathKey(final.pathname) === pathKey(home.pathname) ? 'Redirected to the homepage'
    : isExcludedPath(final.pathname) ? 'Redirected to a login or account page'
    : contentType && !/html/i.test(contentType) ? 'Not an HTML page'
    : null
  return problem
    ? { ...reached, error: problem, check: null }
    : { ...reached, error: null, check: checkOf(response.text, response.truncated).check }
}

/* -------------------------------------------------------------------------- */
/*  Site-level summary                                                        */
/* -------------------------------------------------------------------------- */

function duplicatesOf(pages: Array<{ url: string; text: string | null }>): DuplicateText[] {
  const seen = new Map<string, DuplicateText>()
  for (const { url, text } of pages) {
    if (!text) continue
    const key = text.trim().toLowerCase()
    const entry = seen.get(key) ?? { text, urls: [] }
    entry.urls.push(url)
    seen.set(key, entry)
  }
  return [...seen.values()].filter((d) => d.urls.length > 1)
}

export function summarisePages(
  homepage: PagesData['homepage'],
  pages: CrawledPage[],
  selection: Selection | null,
  truncated: boolean,
): PagesSummary {
  const read = pages.filter((p): p is CrawledPage & { check: KeyPageCheck } => p.check !== null)
  const groupsFound = KEY_PAGE_GROUPS.filter((g) => read.some((p) => p.group === g))
  const groupsNotFound = KEY_PAGE_GROUPS.filter((g) => selection?.notFound.includes(g))
  // Two links that redirect to the same page are one page, not a duplicate.
  const finals = new Set<string>([homepage.url])
  const distinct = read.filter((p) => {
    if (finals.has(p.finalUrl ?? p.url)) return false
    finals.add(p.finalUrl ?? p.url)
    return true
  })
  const all = [{ url: homepage.url, check: homepage.check }, ...distinct.map((p) => ({ url: p.finalUrl ?? p.url, check: p.check }))]
  const urlsWhere = (test: (check: KeyPageCheck) => boolean) => all.filter((p) => test(p.check)).map((p) => p.url)
  return {
    groupsFound,
    groupsNotFound,
    groupsNotChecked: KEY_PAGE_GROUPS.filter((g) => !groupsFound.includes(g) && !groupsNotFound.includes(g)),
    duplicateTitles: duplicatesOf(all.map((p) => ({ url: p.url, text: p.check.title.text }))),
    duplicateMetaDescriptions: duplicatesOf(all.map((p) => ({ url: p.url, text: p.check.metaDescription.text }))),
    noindex: urlsWhere((c) => c.noindex),
    missingTitle: urlsWhere((c) => !c.title.text),
    missingMetaDescription: urlsWhere((c) => !c.metaDescription.text),
    missingH1: urlsWhere((c) => c.h1Count === 0 && c.wordCount > 0),
    contactMethods: {
      form: all.some((p) => p.check.hasForm),
      phone: all.some((p) => p.check.contactLinks.phone.length > 0),
      email: all.some((p) => p.check.contactLinks.email.length > 0),
      whatsapp: all.some((p) => p.check.contactLinks.whatsapp.length > 0),
    },
    pagesCrawled: read.length,
    pagesFailed: pages.length - read.length,
    pagesChecked: read.length + 1,
    blockedByRobots: selection?.blockedByRobots ?? [],
    truncated,
    note: truncated ? 'The time budget ran out, so this is a partial result.' : null,
  }
}

/* -------------------------------------------------------------------------- */
/*  The crawl                                                                 */
/* -------------------------------------------------------------------------- */

type Progress = {
  stopped: boolean
  homepage: PagesData['homepage'] | null
  discovery: PagesData['discovery']
  selection: Selection | null
  pages: CrawledPage[]
}

async function inPool<T>(items: T[], progress: Progress, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0
  const worker = async () => {
    while (next < items.length && !progress.stopped) await work(items[next++])
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker))
}

/** Null = robots.txt couldn't be read at all, so we don't know what we may crawl. A site that has none has no rules. */
async function readRobots(home: URL, get: Get): Promise<Robots | null> {
  const none: Robots = { rules: [], sitemaps: [] }
  let response: SafeResponse
  try {
    response = await get(new URL('/robots.txt', home))
  } catch (error) {
    const brokenBySite = error instanceof SafeFetchError && (error.code === 'redirects' || error.code === 'invalid' || error.code === 'blocked')
    return brokenBySite ? none : null
  }
  if (response.status >= 500) return null
  return response.status === 200 && !looksLikeHtml(response.text) ? parseRobots(response.text) : none
}

/** The page URLs from sitemap.xml or the robots.txt sitemaps, following index files one level deep. */
async function readSitemaps(home: URL, domain: string, robots: Robots, get: Get, progress: Progress): Promise<string[]> {
  const onThisSite = (raw: string) => {
    const url = parseUrl(raw, home)
    return url && sameSite(url, domain) ? url : null
  }
  const listed = robots.sitemaps.map(onThisSite).filter((u): u is URL => u !== null).slice(0, MAX_ROOT_SITEMAPS)
  const roots = listed.length > 0 ? listed : [new URL('/sitemap.xml', home)]
  const fetchXml = async (url: URL) => {
    try {
      const response = await get(url)
      return response.status === 200 ? response.text : null
    } catch {
      return null
    }
  }
  const pageUrls: string[] = []
  const children: URL[] = []
  await inPool(roots, progress, async (root) => {
    const xml = await fetchXml(root)
    if (!xml) return
    if (/<sitemapindex\b/i.test(xml)) children.push(...locsOf(xml).map(onThisSite).filter((u): u is URL => u !== null))
    else pageUrls.push(...locsOf(xml))
  })
  // Sites often split posts from pages; the pages sitemap is the one we want.
  const ordered = [...children].sort((a, b) => Number(/page/i.test(b.pathname)) - Number(/page/i.test(a.pathname)))
  await inPool(ordered.slice(0, MAX_CHILD_SITEMAPS), progress, async (child) => {
    const xml = await fetchXml(child)
    if (xml && !/<sitemapindex\b/i.test(xml)) pageUrls.push(...locsOf(xml))
  })
  return pageUrls.slice(0, MAX_SITEMAP_URLS)
}

type Outcome = { failure: string } | { skip: string } | null

async function crawl(url: URL, get: Get, limit: number, progress: Progress): Promise<Outcome> {
  const domain = domainOf(url)
  let response: SafeResponse
  try {
    response = await get(url)
  } catch (error) {
    return { failure: error instanceof Error ? error.message : 'Homepage fetch failed' }
  }
  if (response.status >= 400) return { failure: `Homepage responded ${response.status}` }
  const home = new URL(response.url)
  if (!sameSite(home, domain)) return { skip: `The homepage redirects to another site (${home.hostname})` }

  const { check, links } = checkOf(response.text, response.truncated)
  progress.homepage = { url: response.url, statusCode: response.status, check }

  const robots = await readRobots(home, get)
  if (!robots) return { failure: 'robots.txt could not be read, so the crawl did not run' }

  const sitemapUrls = await readSitemaps(home, domain, robots, get, progress)
  const candidates = collectCandidates(links, sitemapUrls, home, domain)
  progress.discovery = { homepageLinks: links.length, sitemapUrls: sitemapUrls.length }
  progress.selection = selectKeyPages(candidates, robots, limit)

  await inPool(progress.selection.picks, progress, async (pick) => {
    const page = await readPage(pick, get, home, domain)
    if (!progress.stopped) progress.pages.push(page)
  })
  return null
}

export async function collectPages(url: URL, deps: PagesDeps = {}): Promise<CollectorResult<PagesData>> {
  const budgetMs = deps.budgetMs ?? BUDGET_MS
  const deadline = Date.now() + budgetMs
  const progress: Progress = { stopped: false, homepage: null, discovery: { homepageLinks: 0, sitemapUrls: 0 }, selection: null, pages: [] }
  // Requests in flight when the budget ends time out with it; none start after.
  const fetchPage: Get = deps.safeFetch ?? ((u) => defaultSafeFetch(u, { timeoutMs: Math.max(1, Math.min(TIMEOUT_MS, deadline - Date.now())) }))
  const get: Get = (u) => (progress.stopped ? Promise.reject(new Error('Out of time')) : fetchPage(u))

  let timer: ReturnType<typeof setTimeout> | undefined
  const outOfTime = new Promise<'out-of-time'>((resolve) => { timer = setTimeout(() => resolve('out-of-time'), budgetMs) })
  const outcome = await Promise.race([crawl(url, get, maxPages(envOf(deps)), progress), outOfTime]).finally(() => clearTimeout(timer))
  const truncated = outcome === 'out-of-time'
  progress.stopped = true

  if (outcome && outcome !== 'out-of-time') {
    return 'skip' in outcome ? skipped(PAGES_SOURCE, outcome.skip, deps) : failed(PAGES_SOURCE, outcome.failure, deps)
  }
  if (!progress.homepage) return failed(PAGES_SOURCE, 'Ran out of time before the homepage responded', deps)

  const pages = [...progress.pages].sort((a, b) => KEY_PAGE_GROUPS.indexOf(a.group) - KEY_PAGE_GROUPS.indexOf(b.group))
  return ok(PAGES_SOURCE, {
    homepage: progress.homepage,
    pages,
    discovery: progress.discovery,
    summary: summarisePages(progress.homepage, pages, progress.selection, truncated),
  }, deps)
}
