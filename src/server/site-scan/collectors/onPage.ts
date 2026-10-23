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

function decode(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z#0-9]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim()
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i'))
  return match ? decode(match[1] ?? match[2] ?? match[3] ?? '') : null
}

const tagsOf = (html: string, name: string) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? []

function metaContent(metas: string[], key: string): string | null {
  const tag = metas.find((m) => (attr(m, 'name') ?? attr(m, 'property'))?.toLowerCase() === key)
  return tag ? attr(tag, 'content') : null
}

function jsonLdTypes(html: string): string[] {
  const types = new Set<string>()
  const visit = (node: unknown) => {
    if (Array.isArray(node)) { node.forEach(visit); return }
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    const t = record['@type']
    for (const value of Array.isArray(t) ? t : [t]) if (typeof value === 'string') types.add(value)
    if (record['@graph']) visit(record['@graph'])
  }
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(m[1])) } catch { /* invalid JSON-LD is ignored, not guessed at */ }
  }
  return [...types].slice(0, 20)
}

function wordCount(html: string): number {
  const body = html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html
  const text = decode(
    body
      .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
  return text.split(' ').filter((w) => /[\p{L}\p{N}]/u.test(w)).length
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
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? html
  const metas = tagsOf(head, 'meta')
  const titleRaw = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  const title = titleRaw !== undefined ? decode(titleRaw) : null
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

const looksLikeHtml = (text: string) => /<(!doctype|html|head|body)\b/i.test(text.slice(0, 600))

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
