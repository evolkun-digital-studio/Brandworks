/**
 * Free on-page checks of the homepage, fetched through safeFetch. Plain
 * regex parsing: we only read a handful of head tags and counts, and the
 * page is capped at 1.5 MB, so a full HTML parser isn't worth a dependency.
 */
import { SafeFetchError, safeFetch as defaultSafeFetch, type SafeResponse } from '../safeFetch'
import { failed, ok, type CollectorDeps, type CollectorResult, type OnPageData, type Platform } from '../types'

export const ON_PAGE_SOURCE = 'Homepage HTML (on-page check)'

type OnPageDeps = CollectorDeps & { safeFetch?: (url: string | URL) => Promise<SafeResponse> }

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }

export function decode(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z#0-9]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim()
}

export function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i'))
  return match ? decode(match[1] ?? match[2] ?? match[3] ?? '') : null
}

// Pages come from whatever site a customer names, and parsing is synchronous: a timeout can't interrupt it.
// So every scan below is linear, however many unclosed tags a hostile page repeats.
export const tagsOf = (html: string, name: string) => html.match(new RegExp(`<${name}\\b[^<>]{0,2000}>`, 'gi')) ?? []

/** The text between the first opening tag and its first (or last) closing tag; null if either is missing. */
export function inner(html: string, name: string, closing: 'first' | 'last' = 'first'): string | null {
  const open = new RegExp(`<${name}\\b[^<>]{0,2000}>`, 'i').exec(html)
  if (!open) return null
  const start = open.index + open[0].length
  const lower = html.toLowerCase()
  const end = closing === 'first' ? lower.indexOf(`</${name}>`, start) : lower.lastIndexOf(`</${name}>`)
  return end >= start ? html.slice(start, end) : null
}

export function metaContent(metas: string[], key: string): string | null {
  const tag = metas.find((m) => (attr(m, 'name') ?? attr(m, 'property'))?.toLowerCase() === key)
  return tag ? attr(tag, 'content') : null
}

function jsonLdTypes(html: string): string[] {
  const types = new Set<string>()
  for (const record of jsonLdNodes(html)) {
    const t = record['@type']
    for (const value of Array.isArray(t) ? t : [t]) if (typeof value === 'string') types.add(value)
  }
  return [...types].slice(0, 20)
}

/** Every object in the page's JSON-LD: top level, in arrays and in @graph. */
export function jsonLdNodes(html: string): Array<Record<string, unknown>> {
  const nodes: Array<Record<string, unknown>> = []
  const visit = (node: unknown) => {
    if (Array.isArray(node)) { node.forEach(visit); return }
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    nodes.push(record)
    if (record['@graph']) visit(record['@graph'])
  }
  const opener = /<script\b[^<>]{0,2000}>/gi
  const closer = /<\/script>/gi
  for (let m = opener.exec(html); m; m = opener.exec(html)) {
    if (attr(m[0], 'type')?.toLowerCase() !== 'application/ld+json') continue
    closer.lastIndex = opener.lastIndex
    const end = closer.exec(html)
    if (!end) break
    try { visit(JSON.parse(html.slice(opener.lastIndex, end.index))) } catch { /* invalid JSON-LD is ignored, not guessed at */ }
    opener.lastIndex = closer.lastIndex
  }
  return nodes
}

const CODE_CLOSERS: Record<string, RegExp> = {
  '<!--': /-->/g,
  script: /<\/script\b/gi,
  style: /<\/style\b/gi,
  template: /<\/template\b/gi,
  svg: /<\/svg\b/gi,
  noscript: /<\/noscript\b/gi,
}

/** Removes comments and non-content elements in one forward pass. */
export function withoutCode(html: string): string {
  const opener = /<!--|<(script|style|template|svg|noscript)\b/gi
  let out = ''
  let at = 0
  for (let m = opener.exec(html); m; m = opener.exec(html)) {
    out += `${html.slice(at, m.index)} `
    const closer = CODE_CLOSERS[m[1]?.toLowerCase() ?? '<!--']
    closer.lastIndex = m.index
    const end = closer.exec(html)
    if (!end) return out
    at = end.index + end[0].length
    opener.lastIndex = at
  }
  return out + html.slice(at)
}

/** What's left of the body once tags and code are gone. */
export function visibleText(html: string): string {
  const body = inner(html, 'body', 'last') ?? html
  return decode(withoutCode(body).replace(/<[^<>]+>/g, ' '))
}

function wordCount(html: string): number {
  return visibleText(html).split(' ').filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}

export function detectPlatform(html: string, generator: string | null): Platform | null {
  const gen = (generator ?? '').toLowerCase()
  if (gen.includes('wordpress') || /\/wp-(content|includes)\//i.test(html)) return 'WordPress'
  if (gen.includes('shopify') || /cdn\.shopify\.com|Shopify\.theme/i.test(html)) return 'Shopify'
  if (gen.includes('wix') || /static\.parastorage\.com|static\.wixstatic\.com/i.test(html)) return 'Wix'
  if (gen.includes('webflow') || /data-wf-site|assets\.website-files\.com|cdn\.prod\.website-files\.com/i.test(html)) return 'Webflow'
  if (gen.includes('framer') || /framerusercontent\.com|framer\.com\/m\//i.test(html)) return 'Framer'
  if (/\/_next\/static\/|__NEXT_DATA__/.test(html)) return 'Next.js'
  return null
}

/** Pure parse of the homepage HTML — exported for tests. */
export function parseHomepage(html: string): Omit<OnPageData, 'finalUrl' | 'statusCode' | 'https' | 'responseTimeMs' | 'redirects' | 'htmlTruncated' | 'robotsTxt' | 'sitemapXml' | 'sitemapInRobotsTxt' | 'robotsTxtProblem' | 'sitemapXmlProblem'> {
  const head = inner(html, 'head') ?? html
  const metas = tagsOf(head, 'meta')
  const titleRaw = inner(head, 'title')
  const title = titleRaw !== null ? decode(titleRaw) : null
  const description = metaContent(metas, 'description')
  const robotsMeta = metaContent(metas, 'robots')
  const canonicalTag = tagsOf(head, 'link').find((l) => (attr(l, 'rel') ?? '').toLowerCase().split(/\s+/).includes('canonical'))
  const openGraph: Record<string, string> = {}
  for (const m of metas) {
    const key = (attr(m, 'property') ?? attr(m, 'name') ?? '').toLowerCase()
    const content = attr(m, 'content')
    if (key.startsWith('og:') && content && Object.keys(openGraph).length < 12) openGraph[key] = content.slice(0, 300)
  }
  const images = tagsOf(html, 'img')
  return {
    title: { text: title ? title.slice(0, 300) : null, length: title?.length ?? 0 },
    metaDescription: { text: description ? description.slice(0, 400) : null, length: description?.length ?? 0 },
    h1Count: (html.match(/<h1\b/gi) ?? []).length,
    canonical: canonicalTag ? attr(canonicalTag, 'href') : null,
    lang: tagsOf(html, 'html')[0] ? attr(tagsOf(html, 'html')[0], 'lang') : null,
    viewport: metaContent(metas, 'viewport') !== null,
    openGraph,
    jsonLdTypes: jsonLdTypes(html),
    robotsMeta,
    noindex: /\bnoindex\b/i.test(robotsMeta ?? ''),
    wordCount: wordCount(html),
    images: { total: images.length, missingAlt: images.filter((img) => attr(img, 'alt') === null).length },
    platform: detectPlatform(html, metaContent(metas, 'generator')),
  }
}

const MAX_LINKS = 2_000
const MAX_CONTACT_LINKS = 5
const MAX_CTAS = 5
const MAX_CTA_LENGTH = 40
/** Starts with the action ("Book a table"), so "WordCamp schedule" isn't one; a quote counts anywhere ("Free quote"). */
const CTA = /^(contact|book|buy|enquire|enquiry|inquire|inquiry|order|get started|request|schedule|call us|call now|talk to|shop now|hire us)\b|\bquote\b/i

type LinkRegion = 'nav' | 'footer'
type Clickable = { tag: string; open: string; text: string; where?: LinkRegion }

/** Every <a> and <button> with its visible text and region. A linear scan: nested or unclosed tags can't make it backtrack. */
function clickablesOf(html: string): Clickable[] {
  const out: Clickable[] = []
  let current: { tag: string; open: string; start: number; where?: LinkRegion } | null = null
  const depth = { nav: 0, footer: 0 }
  const close = (end: number) => {
    if (!current) return
    const text = decode(html.slice(current.start, Math.min(end, current.start + 2_000)).replace(/<[^<>]*>/g, ' '))
    out.push({ tag: current.tag, open: current.open, text: text || attr(current.open, 'aria-label') || '', ...(current.where ? { where: current.where } : {}) })
    current = null
  }
  const regionOf = (name: string): LinkRegion => (name.toLowerCase() === 'footer' ? 'footer' : 'nav')
  for (const m of html.matchAll(/<(a|button)\b[^<>]{0,2000}>|<\/(a|button)\s*>|<(nav|header|footer)\b[^<>]{0,2000}>|<\/(nav|header|footer)\s*>/gi)) {
    if (out.length >= MAX_LINKS) break
    if (m[3]) { depth[regionOf(m[3])]++; continue }
    if (m[4]) { const region = regionOf(m[4]); depth[region] = Math.max(0, depth[region] - 1); continue }
    const opening = m[1]?.toLowerCase()
    const where: LinkRegion | undefined = depth.footer > 0 ? 'footer' : depth.nav > 0 ? 'nav' : undefined
    if (opening === 'a') close(m.index)
    if (opening && !current) current = { tag: opening, open: m[0], start: m.index + m[0].length, where }
    else if (m[2]?.toLowerCase() === current?.tag) close(m.index)
  }
  close(html.length)
  return out
}

function hostOf(href: string): string | null {
  try { return new URL(href).hostname.toLowerCase() } catch { return null }
}

const firstUnique = (values: string[], limit: number) => [...new Set(values.filter(Boolean))].slice(0, limit)

const WHATSAPP_HOSTS = ['wa.me', 'api.whatsapp.com', 'web.whatsapp.com']
export const isWhatsappLink = (href: string) => /^whatsapp:\/\//i.test(href) || WHATSAPP_HOSTS.includes(hostOf(href) ?? '')

const PLACEHOLDER_EMAIL_DOMAIN = /(^|\.)(example\.(com|org|net)|domain\.com|yourdomain\.[a-z]+|yoursite\.[a-z]+|yourcompany\.[a-z]+|email\.com|test\.com|sentry\.io|sentry\.wixpress\.com)$/i
const PLACEHOLDER_EMAIL_NAME = /^(you|your|yourname|name|user|username|email|test|abc|xyz)$/i
const PLACEHOLDER_NUMBERS = new Set(['1234567890', '0123456789', '9876543210', '0987654321'])

export function isPlaceholderEmail(email: string): boolean {
  const [name, domain] = email.split('@')
  return !domain || PLACEHOLDER_EMAIL_DOMAIN.test(domain) || PLACEHOLDER_EMAIL_NAME.test(name)
}

export function isPlaceholderPhone(phone: string): boolean {
  const last10 = phone.replace(/\D/g, '').slice(-10)
  return PLACEHOLDER_NUMBERS.has(last10) || (last10.length === 10 && /^(\d)\1+$/.test(last10))
}

/** Pure parse of any page: the homepage fields plus links and ways to get in touch — exported for tests. */
export function parsePage(html: string) {
  const content = withoutCode(html)
  const clickables = clickablesOf(content)
  const hrefs = clickables.map((c) => attr(c.open, 'href')).filter((h): h is string => h !== null)
  const forms = content.match(/<form\b[^<>]{0,2000}>/gi) ?? []
  const ctas = new Map<string, string>()
  const inputs = (content.match(/<input\b[^<>]{0,2000}>/gi) ?? [])
    .filter((tag) => /^(submit|button)$/i.test(attr(tag, 'type') ?? ''))
    .map((tag) => attr(tag, 'value') ?? '')
  for (const text of [...clickables.map((c) => c.text), ...inputs]) {
    if (text.length <= MAX_CTA_LENGTH && CTA.test(text) && !ctas.has(text.toLowerCase())) ctas.set(text.toLowerCase(), text)
  }
  return {
    ...parseHomepage(html),
    links: clickables.filter((c) => c.tag === 'a' && attr(c.open, 'href') !== null).map((c) => ({ href: attr(c.open, 'href')!, text: c.text, ...(c.where ? { where: c.where } : {}) })),
    // A site-wide search box is a form, but not a way to reach the business.
    hasForm: forms.some((tag) => attr(tag, 'role')?.toLowerCase() !== 'search' && !/search/i.test(`${attr(tag, 'action') ?? ''} ${attr(tag, 'id') ?? ''} ${attr(tag, 'class') ?? ''}`)),
    contactLinks: {
      email: firstUnique(hrefs.filter((h) => /^mailto:/i.test(h)).map((h) => h.slice(7).split('?')[0].trim()).filter((e) => !isPlaceholderEmail(e)), MAX_CONTACT_LINKS),
      phone: firstUnique(hrefs.filter((h) => /^tel:/i.test(h)).map((h) => h.slice(4).trim()).filter((p) => !isPlaceholderPhone(p)), MAX_CONTACT_LINKS),
      whatsapp: firstUnique(hrefs.filter(isWhatsappLink), MAX_CONTACT_LINKS),
    },
    ctaTexts: [...ctas.values()].slice(0, MAX_CTAS),
  }
}

export const looksLikeHtml = (text: string) => /<(!doctype|html|head|body)\b/i.test(text.slice(0, 600))

/** A fetch the site itself broke (redirect loop, bad redirect) counts as "not reachable"; our own network trouble stays unknown. */
const siteCaused = (r: PromiseSettledResult<SafeResponse>) =>
  r.status === 'rejected' && r.reason instanceof SafeFetchError && (r.reason.code === 'redirects' || r.reason.code === 'invalid' || r.reason.code === 'blocked')
const problemOf = (r: PromiseSettledResult<SafeResponse>, label: string): string | null => {
  if (r.status === 'fulfilled') return r.value.status >= 400 ? `${label} responded ${r.value.status}` : null
  return siteCaused(r) ? `${label} not reachable: ${(r.reason as Error).message}` : null
}

export async function collectOnPage(url: URL, deps: OnPageDeps = {}): Promise<CollectorResult<OnPageData>> {
  const get = deps.safeFetch ?? ((u: string | URL) => defaultSafeFetch(u))
  let home: SafeResponse
  try {
    home = await get(url)
  } catch (error) {
    return failed(ON_PAGE_SOURCE, error instanceof Error ? error.message : 'Homepage fetch failed', deps)
  }
  if (home.status >= 400) return failed(ON_PAGE_SOURCE, `Homepage responded ${home.status}`, deps)

  const final = new URL(home.url)
  const [robots, sitemap] = await Promise.allSettled([get(new URL('/robots.txt', final)), get(new URL('/sitemap.xml', final))])
  const robotsText = robots.status === 'fulfilled' && robots.value.status === 200 && !looksLikeHtml(robots.value.text) ? robots.value.text : null

  return ok(ON_PAGE_SOURCE, {
    finalUrl: home.url,
    statusCode: home.status,
    https: final.protocol === 'https:',
    responseTimeMs: home.elapsedMs,
    redirects: home.redirects.length,
    htmlTruncated: home.truncated,
    ...parseHomepage(home.text),
    robotsTxt: robots.status === 'fulfilled' ? robotsText !== null : siteCaused(robots) ? false : null,
    sitemapXml: sitemap.status === 'fulfilled'
      ? sitemap.value.status === 200 && /<(urlset|sitemapindex)\b/i.test(sitemap.value.text)
      : siteCaused(sitemap) ? false : null,
    sitemapInRobotsTxt: robots.status === 'fulfilled' ? /^\s*sitemap\s*:/im.test(robotsText ?? '') : siteCaused(robots) ? false : null,
    robotsTxtProblem: problemOf(robots, 'robots.txt'),
    sitemapXmlProblem: problemOf(sitemap, 'sitemap.xml'),
  }, deps)
}
