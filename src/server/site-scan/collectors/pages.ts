/**
 * A small crawl of the pages that matter for a business (About, Services,
 * Contact...), found from the homepage's links and sitemap.xml. Every request
 * goes through safeFetch, at most two at a time, inside an overall time budget;
 * when it runs out, whatever finished comes back as a partial result.
 *
 * "Not found" only ever means no link, sitemap entry or homepage section
 * matched. A page we know of but couldn't read is "not checked", never "not found".
 */
import { SafeFetchError, TIMEOUT_MS, USER_AGENT, domainOf, safeFetch as defaultSafeFetch, type SafeResponse } from '../safeFetch'
import { buildFindings } from '../pageFindings'
import {
  EXTRA_PAGE_GROUPS,
  KEY_PAGE_GROUPS,
  PAGE_GROUPS,
  envOf,
  failed,
  ok,
  skipped,
  type CollectorDeps,
  type CollectorResult,
  type ContactMethod,
  type ContactVia,
  type CrawledPage,
  type DuplicateText,
  type Env,
  type GroupResult,
  type KeyPageCheck,
  type KeyPageGroup,
  type LinkHealth,
  type LinkLocation,
  type MarketingSignals,
  type PageGroup,
  type PagesData,
  type PagesSummary,
  type RedirectInfo,
  type SitemapQuality,
} from '../types'
import { looksLikeHtml, parsePage } from './onPage'
import { canonicalStatus, detectSoft404, inlinePaths, isThin, newestDateIn, parseDetails, parseMarketing, targetIdsOf } from './pageDetails'

export const PAGES_SOURCE = 'Key pages HTML (homepage links + sitemap.xml)'

type FetchOptions = { method?: 'GET' | 'HEAD'; timeoutMs?: number }
type PagesDeps = CollectorDeps & { safeFetch?: (url: string | URL, options?: FetchOptions) => Promise<SafeResponse>; budgetMs?: number }

const DEFAULT_MAX_PAGES = 5
const MAX_PAGES_CEILING = 10
const BUDGET_MS = 35_000
const BUDGET_CEILING_MS = 45_000
const CONCURRENCY = 2
const MAX_ROOT_SITEMAPS = 3
const MAX_CHILD_SITEMAPS = 5
const MAX_SITEMAP_URLS = 5_000
const MAX_BLOCKED_LISTED = 10
const MAX_LINK_CHECKS = 20
const LINK_CHECK_TIMEOUT_MS = 5_000
const MAX_LISTED_PROBLEMS = 10

/** How many key pages to crawl. The homepage isn't counted; onPage already covers it. */
export function maxPages(env: Env = process.env): number {
  const n = Number.parseInt(env.SITE_SCAN_MAX_PAGES ?? '', 10)
  return Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_PAGES_CEILING) : DEFAULT_MAX_PAGES
}

/** The whole crawl's time budget. It can't go past the ceiling, whatever the env says. */
export function pagesBudgetMs(env: Env = process.env): number {
  const n = Number.parseInt(env.SITE_SCAN_PAGES_BUDGET_MS ?? '', 10)
  return Number.isFinite(n) && n >= 1 ? Math.min(n, BUDGET_CEILING_MS) : BUDGET_MS
}

/* -------------------------------------------------------------------------- */
/*  robots.txt                                                                */
/* -------------------------------------------------------------------------- */

type RobotsRule = { allow: boolean; pattern: string }
export type Robots = {
  rules: RobotsRule[]
  sitemaps: string[]
  /** "Disallow: /" for every crawler, with nothing allowed back. */
  blocksAll?: boolean
}

const OUR_AGENT = USER_AGENT.split('/')[0].toLowerCase()

/** Rules addressed to us AND to '*' both count: being more careful than a strict parser costs nothing. */
export function parseRobots(text: string): Robots {
  const robots: Robots = { rules: [], sitemaps: [] }
  let agents: string[] = []
  let inRules = false
  let allDisallowRoot = false
  let allHasAllow = false
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
      if (value && agents.includes('*')) {
        if (key === 'allow') allHasAllow = true
        else if (value === '/') allDisallowRoot = true
      }
    }
  }
  robots.blocksAll = allDisallowRoot && !allHasAllow
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

export type Candidate = { url: URL; texts: string[]; fromHomepage: boolean; foundIn?: LinkLocation }

type DiscoveredLink = { href: string; text: string; where?: 'nav' | 'footer' }

const LOCATION_RANK: Record<LinkLocation, number> = { nav: 0, footer: 1, body: 2, sitemap: 3, 'inline-script': 4 }

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
  links: DiscoveredLink[],
  sitemapUrls: string[],
  home: URL,
  domain: string,
  inlineHints: string[] = [],
): Candidate[] {
  const byPath = new Map<string, Candidate>()
  const add = (raw: string, text: string | null, fromHomepage: boolean, foundIn: LinkLocation) => {
    const url = parseUrl(raw, home)
    if (!url || url.username || url.password || !sameSite(url, domain) || isExcludedPath(url.pathname)) return
    const key = pathKey(url.pathname)
    if (key === pathKey(home.pathname) || key === '/') return
    // Set on a copy of the origin, not resolved against it: a path like "//other.com/x" would change the host.
    const onHome = new URL(home.origin)
    onHome.pathname = url.pathname
    const known = byPath.get(key) ?? { url: onHome, texts: [], fromHomepage, foundIn }
    known.fromHomepage ||= fromHomepage
    if (LOCATION_RANK[foundIn] < LOCATION_RANK[known.foundIn ?? 'sitemap']) known.foundIn = foundIn
    if (text) known.texts.push(text)
    byPath.set(key, known)
  }
  for (const link of links) add(link.href, link.text, true, link.where ?? 'body')
  for (const raw of sitemapUrls) add(raw, null, false, 'sitemap')
  for (const path of inlineHints) add(path, null, false, 'inline-script')
  return [...byPath.values()]
}

const LOC = /<loc\b[^>]{0,200}>([\s\S]{0,2048}?)<\/loc>/gi
const LASTMOD = /<lastmod\b[^>]{0,200}>([^<]{0,64})<\/lastmod>/i
const cleanLoc = (raw: string) => raw.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '').replace(/&amp;/g, '&').trim()
const locsOf = (xml: string) => [...xml.matchAll(LOC)].map((m) => cleanLoc(m[1])).filter(Boolean)

/** Each page entry's address and last-modified date, one <url> block at a time. */
function sitemapEntries(xml: string): Array<{ loc: string; lastmod: string | null }> {
  const entries: Array<{ loc: string; lastmod: string | null }> = []
  const lower = xml.toLowerCase()
  let at = lower.indexOf('<url>')
  while (at !== -1 && entries.length < MAX_SITEMAP_URLS) {
    const end = lower.indexOf('</url>', at)
    if (end === -1) break
    const block = xml.slice(at, Math.min(end, at + 4_000))
    const loc = locsOf(block)[0]
    if (loc) entries.push({ loc, lastmod: LASTMOD.exec(block)?.[1].trim() || null })
    at = lower.indexOf('<url>', end)
  }
  // A sitemap written with attributes on <url> or odd nesting still gives us its addresses.
  return entries.length > 0 ? entries : locsOf(xml).map((loc) => ({ loc, lastmod: null }))
}

/* -------------------------------------------------------------------------- */
/*  Choosing the pages                                                        */
/* -------------------------------------------------------------------------- */

/** The strong words for a group: these also match a hub's sub-pages ("/services/web-design"). */
const GROUP_KEYWORDS: Record<PageGroup, string> = {
  about: 'about|aboutus',
  services: 'services?|products?|solutions?',
  contact: 'contact|contactus',
  pricing: 'pricing|plans?',
  work: 'work|portfolio|case stud(y|ies)',
  blog: 'blog|news',
  shop: 'shop|store|collections?|catalog(ue)?',
  faq: 'faqs?',
  testimonials: 'testimonials?|reviews?',
  careers: 'careers?|jobs?',
}

/**
 * Weaker words, including Hindi link text. In an address they must be the last
 * segment: "/projects" is the Work page but "/projects/new-site" is one project.
 */
const GROUP_SYNONYMS: Record<PageGroup, string[]> = {
  about: ['who we are', 'our story', 'team', 'our team', 'company', 'हमारे बारे में', 'हमारे बारे', 'परिचय'],
  services: ['what we do', 'offerings', 'expertise', 'सेवाएं', 'सेवाएँ', 'सेवा', 'उत्पाद'],
  contact: ['contact us', 'get in touch', 'reach us', 'enquiry', 'enquire', 'inquiry', 'support', 'संपर्क', 'सम्पर्क', 'संपर्क करें'],
  pricing: ['packages', 'rates', 'fees', 'मूल्य', 'कीमत', 'प्लान'],
  work: ['projects', 'clients', 'our work', 'showcase', 'हमारा काम', 'पोर्टफोलियो'],
  blog: ['insights', 'articles', 'journal', 'resources', 'ब्लॉग', 'समाचार', 'लेख'],
  shop: ['दुकान', 'खरीदें'],
  faq: ['frequently asked questions', 'सामान्य प्रश्न'],
  testimonials: ['प्रशंसापत्र', 'समीक्षा'],
  careers: ['करियर', 'नौकरी'],
}

/** Words that can sit around a keyword in a page's address: "/our-services", "/contact-us". */
const PATH_FILLER = new Set(['our', 'the', 'my', 'us', 'page', 'pages', 'all'])
const SECTION_FILLER = new Set([...PATH_FILLER, 'section', 'sec', 'wrap', 'wrapper', 'container', 'block', 'area', 'form', 'box', 'main', 'home'])
/** A nav label, not a sentence: "About Chai & Co" but not "We'd love to tell you about us". */
const MAX_LINK_TEXT_WORDS = 3

/** "Terms of service" is not the Services page. */
const LEGAL = /\b(terms|privacy|cookies?|legal|polic(y|ies)|disclaimer)\b/
/** Posts can be about anything: "/blog/how-we-work" isn't the Work page. */
const CONTENT_SECTION = /\b(blog|news|posts?|articles?|insights|journal|resources)\b/

/** Keeps combining marks: Hindi vowel signs are part of the word, and dropping them would break it apart. */
const wordsOf = (text: string) => text.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim()
const decodedSegment = (segment: string) => {
  try { return decodeURIComponent(segment) } catch { return segment }
}
const segmentsOf = (path: string) => path.split('/').filter(Boolean).map((s) => wordsOf(decodedSegment(s)))
const withoutWords = (text: string, filler: Set<string>) => text.split(' ').filter((w) => !filler.has(w)).join(' ')
/** JavaScript's \b only knows ASCII, so a phrase is matched between spaces instead. */
const hasPhrase = (words: string, phrases: string[]) => phrases.some((phrase) => ` ${words} `.includes(` ${phrase} `))

type MatchStrength = 'keyword' | 'synonym'

export function matchStrength(candidate: Candidate, group: PageGroup): MatchStrength | null {
  const segments = segmentsOf(candidate.url.pathname)
  if (segments.some((s) => LEGAL.test(s))) return null
  // A whole segment must be the keyword: sitemaps are full of slugs like "/projects/new-product-line".
  const wholeSegment = new RegExp(`^(${GROUP_KEYWORDS[group]})$`)
  const outsideContent = group === 'blog' || !CONTENT_SECTION.test(segments[0] ?? '')
  if (outsideContent && segments.slice(0, 2).some((s) => wholeSegment.test(withoutWords(s, PATH_FILLER)))) return 'keyword'
  const inText = new RegExp(`\\b(${GROUP_KEYWORDS[group]})\\b`)
  const usableTexts = candidate.texts.map(wordsOf).filter((words) => words.split(' ').length <= MAX_LINK_TEXT_WORDS && !LEGAL.test(words) && !/^work with\b/.test(words))
  if (usableTexts.some((words) => inText.test(words))) return 'keyword'

  const last = segments[segments.length - 1]
  const phrases = GROUP_SYNONYMS[group]
  if (outsideContent && segments.length > 0 && segments.length <= 2 && (phrases.includes(last) || phrases.includes(withoutWords(last, PATH_FILLER)))) return 'synonym'
  return usableTexts.some((words) => hasPhrase(words, phrases)) ? 'synonym' : null
}

export const matchesGroup = (candidate: Candidate, group: PageGroup) => matchStrength(candidate, group) !== null

function groupOfSectionId(id: string): PageGroup | null {
  const words = withoutWords(wordsOf(id), SECTION_FILLER)
  if (!words) return null
  return PAGE_GROUPS.find((group) => new RegExp(`^(${GROUP_KEYWORDS[group]})$`).test(words) || GROUP_SYNONYMS[group].includes(words)) ?? null
}

/**
 * Sections of a one-page site: a same-page link or an element whose id names a
 * group, or a same-page link whose text does and whose target exists.
 */
export function homepageSections(links: DiscoveredLink[], ids: string[], home: URL): Array<{ group: PageGroup; anchor: string }> {
  const found = new Map<PageGroup, string>()
  const existing = new Set(ids)
  const anchors: Array<{ anchor: string; text: string }> = []
  for (const link of links) {
    const url = parseUrl(link.href, home)
    const anchor = url?.hash.slice(1)
    if (url && anchor && url.host === home.host && pathKey(url.pathname) === pathKey(home.pathname)) anchors.push({ anchor: decodedSegment(anchor), text: link.text })
  }
  // A real element first: a same-page link with nothing to land on is weaker evidence.
  for (const id of ids) {
    const group = groupOfSectionId(id)
    if (group && !found.has(group)) found.set(group, id)
  }
  for (const { anchor } of anchors) {
    const group = groupOfSectionId(anchor)
    if (group && !found.has(group)) found.set(group, anchor)
  }
  for (const { anchor, text } of anchors) {
    if (!existing.has(anchor)) continue
    const candidate: Candidate = { url: new URL(home.origin), texts: [text], fromHomepage: true }
    const group = PAGE_GROUPS.find((g) => matchesGroup(candidate, g))
    if (group && !found.has(group)) found.set(group, anchor)
  }
  return [...found.entries()].map(([group, anchor]) => ({ group, anchor }))
}

export type PagePick = { group: PageGroup; url: URL; foundIn?: LinkLocation }

export type Selection = {
  picks: PagePick[]
  /** No candidate matched at all. Main groups only. */
  notFound: KeyPageGroup[]
  extraNotFound?: PageGroup[]
  blockedByRobots: string[]
  /** Every candidate for the group is disallowed. */
  blockedGroups?: PageGroup[]
}

const locationRank = (c: Candidate) => LOCATION_RANK[c.foundIn ?? (c.fromHomepage ? 'body' : 'sitemap')]
/** Nav, then footer; below that a shallow page beats a deep one wherever it was found: "/services" over "/services/web-design". */
const regionRank = (c: Candidate) => Math.min(locationRank(c), LOCATION_RANK.body)

/**
 * In priority order, at most one page per group and one group per page. The
 * group's real word comes first (a footer "Contact" beats a nav "Support"),
 * then nav over footer over the rest, then shallow pages, then body over sitemap.
 */
export function selectKeyPages(candidates: Candidate[], robots: Robots, limit: number): Selection {
  const selection: Selection = { picks: [], notFound: [], extraNotFound: [], blockedByRobots: [], blockedGroups: [] }
  const taken = new Set<string>()
  const strengthRank = (c: Candidate, group: PageGroup) => (matchStrength(c, group) === 'keyword' ? 0 : 1)
  const choose = (group: PageGroup, onNone: () => void) => {
    const matching = candidates
      .filter((c) => matchesGroup(c, group) && !taken.has(c.url.href))
      .sort((a, b) => strengthRank(a, group) - strengthRank(b, group)
        || regionRank(a) - regionRank(b)
        || segmentsOf(a.url.pathname).length - segmentsOf(b.url.pathname).length
        || locationRank(a) - locationRank(b))
    if (matching.length === 0) { onNone(); return }
    if (selection.picks.length >= limit) return
    const allowed = matching.find((c) => robotsAllows(robots, c.url.pathname))
    for (const c of matching) {
      if (c === allowed) break
      if (selection.blockedByRobots.length < MAX_BLOCKED_LISTED) selection.blockedByRobots.push(c.url.href)
    }
    if (allowed) {
      taken.add(allowed.url.href)
      selection.picks.push({ group, url: allowed.url, ...(allowed.foundIn ? { foundIn: allowed.foundIn } : {}) })
    } else {
      selection.blockedGroups?.push(group)
    }
  }
  for (const group of KEY_PAGE_GROUPS) choose(group, () => selection.notFound.push(group))
  // Only with crawl slots to spare, so these never push out a main group.
  for (const group of EXTRA_PAGE_GROUPS) choose(group, () => selection.extraNotFound?.push(group))
  return selection
}

/* -------------------------------------------------------------------------- */
/*  Reading a page                                                            */
/* -------------------------------------------------------------------------- */

type CheckContext = { pageUrl: URL; home: URL; group: PageGroup | null; now: Date }

function checkOf(html: string, truncated: boolean, context: CheckContext) {
  const p = parsePage(html)
  const parsed = parseDetails(html, p, context.now)
  const { details } = parsed
  const check: KeyPageCheck = {
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
    details: {
      ...details,
      canonicalStatus: canonicalStatus(p.canonical, context.pageUrl, context.home),
      soft404: detectSoft404(p.title.text, parsed.h1Text, parsed.text, p.wordCount),
      thinContent: isThin(p.wordCount, details.renderMode, context.group),
      // On an http page an http resource isn't "mixed": only an https page can be downgraded.
      mixedContent: context.pageUrl.protocol === 'https:' ? details.mixedContent : { count: 0, samples: [] },
    },
  }
  return { check, links: p.links as DiscoveredLink[], parsed }
}

export function redirectInfo(response: Pick<SafeResponse, 'redirects' | 'redirectStatuses' | 'url'>, requested: string): RedirectInfo | undefined {
  if (response.redirects.length === 0) return undefined
  const statuses = response.redirectStatuses ?? []
  const permanent = statuses.filter((s) => s === 301 || s === 308).length
  const type = statuses.length === 0 ? 'unknown'
    : permanent === statuses.length ? 'permanent'
    : permanent === 0 ? 'temporary'
    : 'mixed'
  return {
    count: response.redirects.length,
    type,
    httpToHttps: requested.startsWith('http://') && response.url.startsWith('https://'),
    chain: response.redirects.slice(0, 5),
  }
}

type Get = (url: string | URL, options?: FetchOptions) => Promise<SafeResponse>

async function readPage(pick: PagePick, get: Get, home: URL, domain: string, now: Date, foundLinks: Array<{ href: string; foundOn: string }>): Promise<CrawledPage> {
  const page = { group: pick.group, url: pick.url.href, ...(pick.foundIn ? { foundIn: pick.foundIn } : {}) }
  let response: SafeResponse
  try {
    response = await get(pick.url)
  } catch (error) {
    return { ...page, finalUrl: null, statusCode: null, error: error instanceof Error ? error.message : 'Page fetch failed', check: null }
  }
  const final = new URL(response.url)
  const redirect = redirectInfo(response, pick.url.href)
  const reached = { ...page, finalUrl: response.url, statusCode: response.status, ...(redirect ? { redirect } : {}) }
  const contentType = response.headers['content-type']
  const problem = response.status >= 400 ? `Responded ${response.status}`
    : !sameSite(final, domain) ? 'Redirected to another site'
    : pathKey(final.pathname) === pathKey(home.pathname) ? 'Redirected to the homepage'
    : isExcludedPath(final.pathname) ? 'Redirected to a login or account page'
    : contentType && !/html/i.test(contentType) ? 'Not an HTML page'
    : null
  if (problem) return { ...reached, error: problem, check: null }
  const { check, links } = checkOf(response.text, response.truncated, { pageUrl: final, home, group: pick.group, now })
  for (const link of links) foundLinks.push({ href: link.href, foundOn: response.url })
  // Looks fine by status code, but tells the visitor there's nothing here: not a valid page.
  const soft404 = check.details?.soft404
  if (soft404) return { ...reached, error: `Soft 404: ${soft404}`, check: null, soft404: true }
  return { ...reached, error: null, check }
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
  const sections = homepage.sections ?? []
  const hasSection = (g: PageGroup) => sections.some((s) => s.group === g)
  const groupsFound = KEY_PAGE_GROUPS.filter((g) => read.some((p) => p.group === g) || hasSection(g))
  const groupsNotFound = KEY_PAGE_GROUPS.filter((g) => selection?.notFound.includes(g) && !hasSection(g))
  // Two links that redirect to the same page are one page, not a duplicate.
  const finals = new Set<string>([homepage.url])
  const distinct = read.filter((p) => {
    if (finals.has(p.finalUrl ?? p.url)) return false
    finals.add(p.finalUrl ?? p.url)
    return true
  })
  const all = [{ url: homepage.url, check: homepage.check }, ...distinct.map((p) => ({ url: p.finalUrl ?? p.url, check: p.check }))]
  const urlsWhere = (test: (check: KeyPageCheck) => boolean) => all.filter((p) => test(p.check)).map((p) => p.url)
  const contact = contactSummary(all)
  const homeIsShell = homepage.check.details?.renderMode === 'client-shell'

  function groupResult(group: PageGroup): GroupResult {
    const pageRead = read.find((p) => p.group === group)
    if (pageRead) {
      const low = pageRead.check.details?.renderMode === 'client-shell'
      return { status: 'page', url: pageRead.finalUrl ?? pageRead.url, ...(pageRead.foundIn ? { foundIn: pageRead.foundIn } : {}), confidence: low ? 'low' : 'measured' }
    }
    const section = sections.find((s) => s.group === group)
    if (section) return { status: 'homepage-section', url: homepage.url, anchor: section.anchor, confidence: 'detected' }
    if (selection?.blockedGroups?.includes(group)) return { status: 'blocked-by-robots', confidence: 'measured' }
    if (selection?.notFound.includes(group as KeyPageGroup) || selection?.extraNotFound?.includes(group)) {
      return { status: 'not-found', confidence: homeIsShell ? 'low' : 'not-detected' }
    }
    const attempted = pages.find((p) => p.group === group)
    return { status: 'not-checked', ...(attempted ? { url: attempted.url } : {}), confidence: 'not-detected' }
  }

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
      form: contact.form.found,
      phone: contact.phone.found || all.some((p) => p.check.contactLinks.phone.length > 0),
      email: contact.email.found || all.some((p) => p.check.contactLinks.email.length > 0),
      whatsapp: contact.whatsapp.found,
    },
    pagesCrawled: read.length,
    pagesFailed: pages.length - read.length,
    pagesChecked: read.length + 1,
    blockedByRobots: selection?.blockedByRobots ?? [],
    truncated,
    note: truncated ? 'The time budget ran out, so this is a partial result.' : null,
    groups: Object.fromEntries(PAGE_GROUPS.map((group) => [group, groupResult(group)])) as Record<PageGroup, GroupResult>,
    contact,
    soft404s: pages.filter((p) => p.soft404).map((p) => p.finalUrl ?? p.url),
  }
}

/** A form on the page says more than a link out to a form tool; a tel: link says more than digits in text. */
const VIA_RANK: ContactVia[] = ['form', 'embed', 'link', 'text']
const strongest = (vias: ContactVia[]): ContactVia | null => VIA_RANK.find((via) => vias.includes(via)) ?? null

function contactSummary(all: Array<{ url: string; check: KeyPageCheck }>): NonNullable<PagesSummary['contact']> {
  const method = (entries: Array<{ url: string; via: ContactVia; value?: string; provider?: string }>): ContactMethod => {
    const values = [...new Set(entries.map((e) => e.value).filter((v): v is string => Boolean(v)))].slice(0, 3)
    const providers = [...new Set(entries.map((e) => e.provider).filter((v): v is string => Boolean(v)))]
    return {
      found: entries.length > 0,
      via: strongest(entries.map((e) => e.via)),
      pages: [...new Set(entries.map((e) => e.url))],
      ...(values.length ? { values } : {}),
      ...(providers.length ? { providers } : {}),
      confidence: entries.length > 0 ? 'detected' : all.some((p) => p.check.details?.renderMode === 'client-shell') ? 'low' : 'not-detected',
    }
  }
  const each = <T,>(pick: (page: { url: string; check: KeyPageCheck }) => T[], map: (item: T, url: string) => { url: string; via: ContactVia; value?: string; provider?: string }) =>
    all.flatMap((page) => pick(page).map((item) => map(item, page.url)))
  return {
    form: method([
      ...all.filter((p) => p.check.hasForm).map((p) => ({ url: p.url, via: 'form' as const })),
      ...each((p) => p.check.details?.contact.embeds ?? [], (e, url) => ({ url, via: e.via, provider: e.provider })),
    ]),
    phone: method(each((p) => p.check.details?.contact.phones ?? [], (e, url) => ({ url, via: e.via, value: e.value }))),
    email: method(each((p) => p.check.details?.contact.emails ?? [], (e, url) => ({ url, via: e.via, value: e.value }))),
    whatsapp: method(each((p) => p.check.details?.contact.whatsapp ?? p.check.contactLinks.whatsapp, (value, url) => ({ url, via: 'link' as const, value }))),
  }
}

/* -------------------------------------------------------------------------- */
/*  Link health and sitemap quality                                           */
/* -------------------------------------------------------------------------- */

type LinkTarget = { url: string; foundOn: string }

/** Unique internal links not crawled anyway, from the homepage first. Never one robots.txt disallows. */
export function linkTargets(links: Array<{ href: string; foundOn: string }>, fetched: Set<string>, robots: Robots, home: URL, domain: string): LinkTarget[] {
  const seen = new Set<string>()
  const out: LinkTarget[] = []
  for (const { href, foundOn } of links) {
    const url = parseUrl(href, new URL(foundOn))
    if (!url || url.username || url.password || !sameSite(url, domain) || isExcludedPath(url.pathname)) continue
    const key = pathKey(url.pathname)
    if (fetched.has(key) || key === pathKey(home.pathname) || seen.has(key) || !robotsAllows(robots, url.pathname)) continue
    seen.add(key)
    // Keeps the scheme as written, so an http:// link shows its hop to https.
    const target = new URL(url.origin)
    target.pathname = url.pathname
    out.push({ url: target.href, foundOn })
  }
  return out
}

/** HEAD first; anything that looks broken gets a GET before we believe it, since many servers answer HEAD badly. */
async function checkLink(target: LinkTarget, get: Get, health: LinkHealth): Promise<void> {
  const options = { timeoutMs: LINK_CHECK_TIMEOUT_MS }
  try {
    let response = await get(target.url, { ...options, method: 'HEAD' })
    if (response.status >= 400) response = await get(target.url, options)
    health.checked++
    if (response.status === 401 || response.status === 403 || response.status === 429) {
      health.inconclusive++
    } else if (response.status >= 400) {
      if (health.broken.length < MAX_LISTED_PROBLEMS) health.broken.push({ url: target.url, status: response.status, foundOn: target.foundOn })
    } else {
      const redirect = redirectInfo(response, target.url)
      if (redirect && health.redirected.length < MAX_LISTED_PROBLEMS) {
        health.redirected.push({ url: target.url, finalUrl: response.url, foundOn: target.foundOn, type: redirect.type, httpToHttps: redirect.httpToHttps })
      }
    }
  } catch {
    health.checked++
    health.inconclusive++
  }
}

type SitemapRead = { urls: string[]; total: number; lastmods: Map<string, string>; newest: string | null; hasLastmod: boolean; found: boolean }

/** Cross-checks only what we fetched, whether as a key page, the homepage or a link check. */
export function sitemapQuality(
  map: SitemapRead,
  robots: Robots,
  pages: CrawledPage[],
  linkHealth: LinkHealth | null,
): SitemapQuality {
  const inSitemap = new Set(map.urls.map((raw) => {
    try { return pathKey(new URL(raw).pathname) } catch { return raw }
  }))
  const listed = (url: string) => {
    try { return inSitemap.has(pathKey(new URL(url).pathname)) } catch { return false }
  }
  const crawled = pages.filter((p) => listed(p.url))
  const add = <T,>(items: T[]) => items.slice(0, MAX_LISTED_PROBLEMS)
  return {
    found: map.found,
    urlCount: map.total,
    listedInRobotsTxt: robots.sitemaps.length > 0,
    hasLastmod: map.hasLastmod,
    newestLastmod: map.newest,
    robotsBlocksAll: robots.blocksAll === true,
    redirects: add([
      ...crawled.filter((p) => p.redirect).map((p) => ({ url: p.url, finalUrl: p.finalUrl ?? p.url })),
      ...(linkHealth?.redirected ?? []).filter((l) => listed(l.url)).map((l) => ({ url: l.url, finalUrl: l.finalUrl })),
    ]),
    errors: add([
      ...crawled.filter((p) => p.statusCode !== null && p.statusCode >= 400).map((p) => ({ url: p.url, status: p.statusCode as number })),
      ...(linkHealth?.broken ?? []).filter((l) => listed(l.url)).map((l) => ({ url: l.url, status: l.status })),
    ]),
    soft404s: add(crawled.filter((p) => p.soft404).map((p) => p.url)),
    noindex: add(crawled.filter((p) => p.check?.noindex).map((p) => p.url)),
  }
}

/** Page evidence first: a sitemap's lastmod is often just the date of the last deploy. */
function latestPost(pages: CrawledPage[], map: SitemapRead | null, now: Date): MarketingSignals['latestPost'] {
  const blog = pages.find((p) => p.group === 'blog')
  const onPage = blog?.check?.details?.newestDate
  if (onPage) return { date: onPage, source: 'blog page' }
  if (!blog || !map) return null
  let prefix: string
  try { prefix = pathKey(new URL(blog.url).pathname) } catch { return null }
  const dates = [...map.lastmods.entries()].filter(([path]) => path === prefix || path.startsWith(`${prefix}/`)).map(([, date]) => date)
  const newest = newestDateIn(dates, now)
  return newest ? { date: newest, source: 'sitemap' } : null
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
  /** Which stage is running: link checks are the only part that can be dropped without the result being partial. */
  phase: 'crawl' | 'links'
  robots: Robots | null
  sitemap: SitemapRead | null
  linkHealth: LinkHealth | null
  signals: Omit<MarketingSignals, 'latestPost'> | null
  insecureInternalLinks: string[]
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
  const none: Robots = { rules: [], sitemaps: [], blocksAll: false }
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
async function readSitemaps(home: URL, domain: string, robots: Robots, get: Get, progress: Progress, now: Date): Promise<SitemapRead> {
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
  const map: SitemapRead = { urls: pageUrls, total: 0, lastmods: new Map(), newest: null, hasLastmod: false, found: false }
  const dates: string[] = []
  const readEntries = (xml: string) => {
    if (!/<urlset\b/i.test(xml) && !/<loc\b/i.test(xml)) return
    map.found = true
    for (const { loc, lastmod } of sitemapEntries(xml)) {
      map.total++
      pageUrls.push(loc)
      if (!lastmod) continue
      map.hasLastmod = true
      dates.push(lastmod)
      const page = parseUrl(loc, home)
      if (page) map.lastmods.set(pathKey(page.pathname), lastmod)
    }
  }
  // Published straight away: the budget can end while the later sitemaps are still being read.
  progress.sitemap = map
  await inPool(roots, progress, async (root) => {
    const xml = await fetchXml(root)
    if (!xml) return
    if (/<sitemapindex\b/i.test(xml)) {
      map.found = true
      children.push(...locsOf(xml).map(onThisSite).filter((u): u is URL => u !== null))
    } else readEntries(xml)
  })
  // Sites often split posts from pages; the pages sitemap is the one we want.
  const ordered = [...children].sort((a, b) => Number(/page/i.test(b.pathname)) - Number(/page/i.test(a.pathname)))
  await inPool(ordered.slice(0, MAX_CHILD_SITEMAPS), progress, async (child) => {
    const xml = await fetchXml(child)
    if (xml && !/<sitemapindex\b/i.test(xml)) readEntries(xml)
  })
  map.urls = pageUrls.slice(0, MAX_SITEMAP_URLS)
  map.newest = newestDateIn(dates, now)
  return map
}

type Outcome = { failure: string } | { skip: string } | null

async function crawl(url: URL, get: Get, limit: number, progress: Progress, now: Date): Promise<Outcome> {
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

  const { check, links, parsed } = checkOf(response.text, response.truncated, { pageUrl: home, home, group: null, now })
  const redirect = redirectInfo(response, url.href)
  const sections = homepageSections(links, targetIdsOf(parsed.content), home)
  progress.homepage = { url: response.url, statusCode: response.status, check, ...(redirect ? { redirect } : {}), sections }
  progress.signals = parseMarketing(response.text, parsed, links, response.headers)
  progress.insecureInternalLinks = home.protocol === 'https:'
    ? [...new Set(links.map((l) => parseUrl(l.href, home)).filter((u): u is URL => u !== null && u.protocol === 'http:' && sameSite(u, domain)).map((u) => u.href))].slice(0, MAX_LISTED_PROBLEMS)
    : []

  const robots = await readRobots(home, get)
  if (!robots) return { failure: 'robots.txt could not be read, so the crawl did not run' }
  progress.robots = robots

  const sitemap = await readSitemaps(home, domain, robots, get, progress, now)
  // An app shell has no links to follow, so what its inline scripts name is worth a look. Only ever a hint.
  const hints = check.details?.renderMode === 'client-shell' ? inlinePaths(parsed.scripts) : []
  const candidates = collectCandidates(links, sitemap.urls, home, domain, hints)
  progress.discovery = { homepageLinks: links.length, sitemapUrls: sitemap.urls.length, ...(hints.length ? { inlineHints: hints.length } : {}) }
  progress.selection = selectKeyPages(candidates, robots, limit)

  const foundLinks = links.map((l) => ({ href: l.href, foundOn: response.url }))
  await inPool(progress.selection.picks, progress, async (pick) => {
    const page = await readPage(pick, get, home, domain, now, foundLinks)
    if (!progress.stopped) progress.pages.push(page)
  })

  // Last, and the first thing lost when time runs out: nothing above depends on it.
  const fetched = new Set(progress.selection.picks.map((p) => pathKey(p.url.pathname)))
  const targets = linkTargets(foundLinks, fetched, robots, home, domain)
  const toCheck = targets.slice(0, MAX_LINK_CHECKS)
  const health: LinkHealth = {
    candidates: targets.length,
    checked: 0,
    broken: [],
    redirected: [],
    inconclusive: 0,
    dropped: toCheck.length,
    confidence: check.details?.renderMode === 'client-shell' ? 'low' : 'measured',
  }
  progress.linkHealth = health
  progress.phase = 'links'
  await inPool(toCheck, progress, async (target) => {
    await checkLink(target, get, health)
    health.dropped = toCheck.length - health.checked
  })
  return null
}

export async function collectPages(url: URL, deps: PagesDeps = {}): Promise<CollectorResult<PagesData>> {
  const env = envOf(deps)
  const budgetMs = deps.budgetMs ?? pagesBudgetMs(env)
  const deadline = Date.now() + budgetMs
  const now = deps.now ? deps.now() : new Date()
  const progress: Progress = {
    stopped: false,
    homepage: null,
    discovery: { homepageLinks: 0, sitemapUrls: 0 },
    selection: null,
    pages: [],
    phase: 'crawl',
    robots: null,
    sitemap: null,
    linkHealth: null,
    signals: null,
    insecureInternalLinks: [],
  }
  // Requests in flight when the budget ends time out with it; none start after.
  const fetchPage: Get = deps.safeFetch
    ?? ((u, options = {}) => defaultSafeFetch(u, { method: options.method, timeoutMs: Math.max(1, Math.min(options.timeoutMs ?? TIMEOUT_MS, deadline - Date.now())) }))
  const get: Get = (u, options) => (progress.stopped ? Promise.reject(new Error('Out of time')) : fetchPage(u, options))

  let timer: ReturnType<typeof setTimeout> | undefined
  const outOfTime = new Promise<'out-of-time'>((resolve) => { timer = setTimeout(() => resolve('out-of-time'), budgetMs) })
  const outcome = await Promise.race([crawl(url, get, maxPages(env), progress, now), outOfTime]).finally(() => clearTimeout(timer))
  // Losing link checks costs only the link checks: the pages themselves are all in.
  const truncated = outcome === 'out-of-time' && progress.phase === 'crawl'
  progress.stopped = true

  if (outcome && outcome !== 'out-of-time') {
    return 'skip' in outcome ? skipped(PAGES_SOURCE, outcome.skip, deps) : failed(PAGES_SOURCE, outcome.failure, deps)
  }
  if (!progress.homepage) return failed(PAGES_SOURCE, 'Ran out of time before the homepage responded', deps)

  const pages = [...progress.pages].sort((a, b) => PAGE_GROUPS.indexOf(a.group) - PAGE_GROUPS.indexOf(b.group))
  const data: PagesData = {
    homepage: progress.homepage,
    pages,
    discovery: progress.discovery,
    summary: summarisePages(progress.homepage, pages, progress.selection, truncated),
    linkHealth: progress.linkHealth,
    sitemap: progress.robots && progress.sitemap ? sitemapQuality(progress.sitemap, progress.robots, pages, progress.linkHealth) : null,
    insecureInternalLinks: progress.insecureInternalLinks,
    ...(progress.signals ? { signals: { ...progress.signals, latestPost: latestPost(pages, progress.sitemap, now) } } : {}),
  }
  data.summary.findings = buildFindings(data)
  return ok(PAGES_SOURCE, data, deps)
}
