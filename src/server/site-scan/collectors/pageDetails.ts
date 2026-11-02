/**
 * The deeper read of a page: how it's rendered, ways to get in touch, content
 * structure, structured data, and (homepage only) marketing and trust signals.
 *
 * Only extracted fields leave this file, never the HTML. Pages come from
 * whatever site a customer names and parsing can't be interrupted, so every
 * scan is capped: bounded quantifiers only, no nesting, and a limit on how many
 * tags or how much text gets looked at.
 */
import {
  attr,
  decode,
  inner,
  isPlaceholderEmail,
  isPlaceholderPhone,
  isWhatsappLink,
  jsonLdNodes,
  metaContent,
  tagsOf,
  visibleText,
  withoutCode,
} from './onPage'
import type { CanonicalStatus, MarketingSignals, OrganizationSchema, PageContact, PageDetails, RenderMode } from '../types'

type Link = { href: string; text: string }

const MAX_TAGS = 1_000
const MAX_TEXT = 200_000
const MAX_VALUES = 3
const MAX_SAMPLES = 5
const MAX_OUTLINE = 10
const MAX_IDS = 500
const MAX_SCRIPTS = 200
const MAX_INLINE_SCRIPT_TEXT = 300_000
const MAX_INLINE_PATHS = 100

/** Below this the HTML can't be holding the page's content. */
const SHELL_WORDS = 50
const SHELL_MAX_LINKS = 5
const SOFT_404_TITLE_MAX_WORDS = 500
const SOFT_404_TEXT_MAX_WORDS = 150
const THIN_WORDS = 300

/* -------------------------------------------------------------------------- */
/*  Scripts and rendering                                                      */
/* -------------------------------------------------------------------------- */

type Script = { open: string; src: string | null; body: string }

/** Real <script> elements in one forward pass, so a tag quoted inside a script or comment isn't mistaken for one. */
export function scriptsOf(html: string): Script[] {
  const out: Script[] = []
  const opener = /<!--|<script\b[^<>]{0,2000}>/gi
  const closer = /<\/script\b/gi
  for (let m = opener.exec(html); m && out.length < MAX_SCRIPTS; m = opener.exec(html)) {
    if (m[0] === '<!--') {
      const end = html.indexOf('-->', opener.lastIndex)
      if (end === -1) break
      opener.lastIndex = end + 3
      continue
    }
    closer.lastIndex = opener.lastIndex
    const end = closer.exec(html)
    out.push({ open: m[0], src: attr(m[0], 'src'), body: html.slice(opener.lastIndex, end ? end.index : opener.lastIndex) })
    if (!end) break
    opener.lastIndex = closer.lastIndex
  }
  return out
}

const APP_ROOT = /<[a-z][^<>]{0,500}?\s(?:id\s*=\s*["']?(?:root|app|__next|__nuxt)["'\s>]|data-reactroot)|<app-root\b/i

export function detectRenderMode(html: string, words: number, links: number, scripts: number): { mode: RenderMode; reason: string } {
  if (words >= SHELL_WORDS) return { mode: 'server', reason: `${words} words in the HTML before JavaScript runs` }
  const root = APP_ROOT.test(html)
  if (root && scripts > 0 && links <= SHELL_MAX_LINKS) {
    return { mode: 'client-shell', reason: `${words} words and ${links} links in the HTML, an app root element and ${scripts} scripts: the content is built by JavaScript` }
  }
  if (scripts > 0 && links <= SHELL_MAX_LINKS) return { mode: 'unknown', reason: `${words} words and ${links} links in the HTML, but no recognisable app root` }
  return { mode: 'server', reason: `A short page: ${words} words and ${links} links in the HTML` }
}

const INLINE_PATH = /(?:href|path|to|url|as|page)\\?["']?\s{0,3}:\s{0,3}\\?["'](\/[\w\-/]{1,100})\\?["']/g
const NOT_A_PAGE = /^\/(_next|_nuxt|assets|static|api|images?|img|fonts?|css|js|cdn-cgi)(\/|$)/

/** Internal paths named in inline JSON or route lists. Capped, and only ever a hint. */
export function inlinePaths(scripts: Script[]): string[] {
  const found = new Set<string>()
  let budget = MAX_INLINE_SCRIPT_TEXT
  for (const script of scripts) {
    if (script.src || budget <= 0) continue
    const text = script.body.slice(0, budget)
    budget -= text.length
    for (const m of text.matchAll(INLINE_PATH)) {
      if (found.size >= MAX_INLINE_PATHS) return [...found]
      if (!NOT_A_PAGE.test(m[1]) && m[1] !== '/') found.add(m[1])
    }
  }
  return [...found]
}

/* -------------------------------------------------------------------------- */
/*  Contact methods                                                            */
/* -------------------------------------------------------------------------- */

const IMAGE_TLD = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|css|js|map)$/i
const EMAIL_LEFT = /[a-z0-9._%+-]{1,64}$/i
const EMAIL_RIGHT = /^[a-z0-9-]{1,63}(?:\.[a-z0-9-]{1,63}){1,4}/i
const MAX_AT_SIGNS = 200

/** Expands outward from each "@" rather than running one regex across the page: nothing to backtrack over. */
export function emailsInText(text: string): string[] {
  const found = new Set<string>()
  let at = text.indexOf('@')
  for (let seen = 0; at !== -1 && seen < MAX_AT_SIGNS; seen++, at = text.indexOf('@', at + 1)) {
    const left = EMAIL_LEFT.exec(text.slice(Math.max(0, at - 64), at))
    const right = EMAIL_RIGHT.exec(text.slice(at + 1, at + 256))
    if (!left || !right) continue
    const email = `${left[0]}@${right[0]}`.toLowerCase().replace(/^[._%+-]+/, '')
    if (!IMAGE_TLD.test(email) && !isPlaceholderEmail(email)) found.add(email)
  }
  return [...found]
}

/** Cloudflare hides emails in the HTML behind a simple XOR. */
function cloudflareEmails(html: string): string[] {
  const out: string[] = []
  for (const m of html.matchAll(/data-cfemail\s*=\s*["']([0-9a-f]{4,200})["']/gi)) {
    if (out.length >= MAX_VALUES) break
    const bytes = m[1].match(/../g)!.map((pair) => parseInt(pair, 16))
    out.push(bytes.slice(1).map((b) => String.fromCharCode(b ^ bytes[0])).join('').toLowerCase())
  }
  return out.filter((email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !isPlaceholderEmail(email))
}

/** A canonical form (+91XXXXXXXXXX), or null if it isn't a plausible phone number. */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  let phone: string | null = null
  if (raw.trim().startsWith('+')) {
    if (digits.startsWith('91')) phone = digits.length === 12 && /^[1-9]/.test(digits.slice(2)) ? `+${digits}` : null
    else phone = digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null
  } else if (digits.length === 12 && /^91[6-9]/.test(digits)) phone = `+${digits}`
  else if (digits.length === 11 && /^0[1-9]/.test(digits)) phone = `+91${digits.slice(1)}`
  else if (digits.length === 10 && /^[6-9]/.test(digits)) phone = `+91${digits}`
  else if (/^1800\d{6,7}$/.test(digits)) phone = digits
  return phone && !isPlaceholderPhone(phone) ? phone : null
}

const PHONE_CANDIDATE = /(?<![\w.,/:@-])\+?\(?\d[\d\s().-]{7,18}\d(?![\w@-])/g
const PHONE_CONTEXT = /(phone|call|mobile|tel|contact|whatsapp|ph\b|mob\b|helpline|☎|📞|फ़ोन|फोन|संपर्क)/i
const SPACED_BARE_MOBILE = /^[6-9]\d{4}\s\d{5}$/

export function phonesInText(text: string): string[] {
  const found = new Set<string>()
  for (const m of text.slice(0, MAX_TEXT).matchAll(PHONE_CANDIDATE)) {
    const raw = m[0]
    // Two numbers side by side look like a mobile ("60000 70000"), so that format needs a word saying it's a phone.
    if (SPACED_BARE_MOBILE.test(raw) && !PHONE_CONTEXT.test(text.slice(Math.max(0, m.index - 40), m.index))) continue
    // A dot-separated run is a version number or a date far more often than a phone number.
    if (raw.includes('.') && !raw.startsWith('+')) continue
    const phone = normalisePhone(raw)
    if (phone) found.add(phone)
  }
  return [...found]
}

const FORM_PROVIDERS: Array<[string, RegExp]> = [
  ['Google Forms', /(^|\.)forms\.gle$|^docs\.google\.com\/forms/],
  ['Typeform', /(^|\.)typeform\.com/],
  ['Tally', /(^|\.)tally\.so/],
  ['Jotform', /(^|\.)(jotform\.com|jotfor\.ms)/],
  ['HubSpot Forms', /(^|\.)(hsforms\.net|hsforms\.com)/],
  ['Zoho Forms', /(^|\.)(forms\.zohopublic\.[a-z.]+|forms\.zoho\.[a-z.]+)/],
  ['Calendly', /(^|\.)calendly\.com/],
  ['Cal.com', /(^|\.)cal\.com/],
  ['Microsoft Bookings', /^(outlook\.office365\.com\/(owa\/calendar|book)|outlook\.office\.com\/(owa\/calendar|book)|bookings\.office\.com|book\.ms)/],
]

/** Goes by the address's host and path, not free text: "local.com" isn't Cal.com. */
function formProviderOf(raw: string | null): string | null {
  if (!raw) return null
  let url: URL
  try { url = new URL(raw, 'https://placeholder.invalid/') } catch { return null }
  if (url.hostname === 'placeholder.invalid') return null
  const target = `${url.hostname.toLowerCase()}${url.pathname.toLowerCase()}`
  return FORM_PROVIDERS.find(([, pattern]) => pattern.test(target) || pattern.test(url.hostname.toLowerCase()))?.[0] ?? null
}

function detectContact(content: string, text: string, links: Link[], scripts: Script[], hasForm: boolean): PageContact {
  const emails = new Map<string, PageContact['emails'][number]>()
  const phones = new Map<string, PageContact['phones'][number]>()
  const add = <T extends { value: string }>(into: Map<string, T>, entry: T) => { if (!into.has(entry.value)) into.set(entry.value, entry) }

  for (const { href } of links) {
    if (/^mailto:/i.test(href)) {
      const email = href.slice(7).split('?')[0].trim().toLowerCase()
      if (email.includes('@') && !isPlaceholderEmail(email)) add(emails, { value: email, via: 'link' })
    } else if (/^tel:/i.test(href)) {
      const phone = normalisePhone(href.slice(4))
      if (phone) add(phones, { value: phone, via: 'link' })
    }
  }
  const scanned = text.slice(0, MAX_TEXT)
  for (const email of [...emailsInText(scanned), ...cloudflareEmails(content)]) add(emails, { value: email, via: 'text' })
  for (const phone of phonesInText(scanned)) add(phones, { value: phone, via: 'text' })

  const embeds = new Map<string, PageContact['embeds'][number]>()
  for (const tag of tagsOf(content, 'iframe').slice(0, MAX_TAGS)) {
    const provider = formProviderOf(attr(tag, 'src') ?? attr(tag, 'data-src'))
    if (provider && !embeds.has(provider)) embeds.set(provider, { provider, via: 'embed' })
  }
  for (const script of scripts) {
    const provider = formProviderOf(script.src)
    if (provider && !embeds.has(provider)) embeds.set(provider, { provider, via: 'embed' })
  }
  for (const { href } of links.slice(0, MAX_TAGS)) {
    const provider = /^https?:|^\/\//i.test(href) ? formProviderOf(href) : null
    if (provider && !embeds.has(provider)) embeds.set(provider, { provider, via: 'link' })
  }

  return {
    emails: [...emails.values()].slice(0, MAX_VALUES),
    phones: [...phones.values()].slice(0, MAX_VALUES),
    whatsapp: [...new Set(links.map((l) => l.href).filter(isWhatsappLink))].slice(0, MAX_VALUES),
    form: hasForm,
    embeds: [...embeds.values()],
  }
}

/* -------------------------------------------------------------------------- */
/*  Page structure                                                             */
/* -------------------------------------------------------------------------- */

function headingsOf(content: string): { h1Text: string | null } & PageDetails['headings'] {
  const counts = { h2: 0, h3: 0 }
  const outline: Array<{ level: number; text: string }> = []
  let h1Text: string | null = null
  let attempts = 0
  for (const m of content.matchAll(/<h([1-6])\b[^<>]{0,500}>/gi)) {
    const level = Number(m[1])
    if (level === 2) counts.h2++
    if (level === 3) counts.h3++
    if ((outline.length >= MAX_OUTLINE && h1Text !== null) || ++attempts > MAX_TAGS) continue
    const start = m.index + m[0].length
    // Only a short way ahead: unclosed headings must not each scan the rest of the page.
    const window = content.slice(start, start + 1_000)
    const end = window.toLowerCase().indexOf(`</h${level}`)
    if (end === -1) continue
    const text = decode(window.slice(0, end).replace(/<[^<>]*>/g, ' ')).slice(0, 200)
    if (!text) continue
    if (level === 1 && h1Text === null) h1Text = text
    if (outline.length < MAX_OUTLINE) outline.push({ level, text })
  }
  return { ...counts, outline, h1Text }
}

const NOT_FOUND_TEXT = /page (?:was )?not found|(?:page|url) (?:you|that) .{0,40}(?:not|n.t) .{0,20}(?:exist|found)|(?:can.t|cannot|couldn.t|could not) find (?:that|the|this) page|nothing (?:was )?(?:found )?here|404 (?:error|page|not found)|error 404|पृष्ठ नहीं मिला|पेज नहीं मिला/i

/** A word count limit keeps out a real article whose title happens to mention a 404. */
export function detectSoft404(title: string | null, h1: string | null, text: string, words: number): string | null {
  if (words < SOFT_404_TITLE_MAX_WORDS) {
    if (title && (NOT_FOUND_TEXT.test(title) || /^\s*404\b/.test(title))) return 'The page title says the page wasn’t found'
    if (h1 && (NOT_FOUND_TEXT.test(h1) || /^\s*404\b/.test(h1))) return 'The main heading says the page wasn’t found'
  }
  if (words < SOFT_404_TEXT_MAX_WORDS && NOT_FOUND_TEXT.test(text.slice(0, 3_000))) return 'The page text says the page wasn’t found'
  return null
}

const pathKeyOf = (path: string) => path.replace(/\/+$/, '').toLowerCase() || '/'
const bareHost = (url: URL) => url.hostname.replace(/^www\./, '')

/** Only 'points-to-homepage', 'cross-domain' and 'http-on-https-site' are problems. */
export function canonicalStatus(canonical: string | null, page: URL, home: URL): CanonicalStatus {
  const raw = canonical?.trim()
  if (!raw) return 'missing'
  let target: URL
  try { target = new URL(raw, page) } catch { return 'relative' }
  if (bareHost(target) !== bareHost(page)) return 'cross-domain'
  const samePath = pathKeyOf(target.pathname) === pathKeyOf(page.pathname)
  // Checked before "relative": href="/" on a key page is the same bug however it's written.
  if (!samePath && pathKeyOf(target.pathname) === pathKeyOf(home.pathname)) return 'points-to-homepage'
  if (page.protocol === 'https:' && target.protocol === 'http:') return 'http-on-https-site'
  if (!/^https?:\/\//i.test(raw)) return 'relative'
  return samePath ? 'self' : 'points-to-other-page'
}

const NON_LOADING_LINK = /\b(canonical|alternate|shortlink|preconnect|dns-prefetch|prev|next|pingback|edituri|profile|author|me|manifest)\b/i

function mixedContentOf(content: string, scripts: Script[]): PageDetails['mixedContent'] {
  const urls: string[] = []
  for (const name of ['img', 'iframe', 'source', 'video', 'audio', 'embed']) {
    for (const tag of tagsOf(content, name).slice(0, MAX_TAGS)) urls.push(attr(tag, 'src') ?? '')
  }
  for (const tag of tagsOf(content, 'link').slice(0, MAX_TAGS)) {
    if (!NON_LOADING_LINK.test(attr(tag, 'rel') ?? '')) urls.push(attr(tag, 'href') ?? '')
  }
  urls.push(...scripts.map((s) => s.src ?? ''))
  const insecure = urls.filter((u) => /^http:\/\//i.test(u))
  return { count: insecure.length, samples: [...new Set(insecure)].slice(0, MAX_SAMPLES).map((u) => u.slice(0, 300)) }
}

const ORGANIZATION_TYPE = /(Organization|Corporation|LocalBusiness|Business|Store|Restaurant|Shop|Agency|ProfessionalService)$/

function structuredDataOf(html: string): PageDetails['structuredData'] {
  const out: PageDetails['structuredData'] = { organization: null, product: false, service: false, faq: false, breadcrumb: false }
  const has = (value: unknown) => (Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '')
  for (const node of jsonLdNodes(html).slice(0, MAX_TAGS)) {
    const t = node['@type']
    for (const type of (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === 'string')) {
      if (type === 'Product') out.product = true
      if (type === 'Service') out.service = true
      if (type === 'FAQPage') out.faq = true
      if (type === 'BreadcrumbList') out.breadcrumb = true
      if (!out.organization && ORGANIZATION_TYPE.test(type)) {
        const organization: OrganizationSchema = {
          type,
          name: has(node.name),
          logo: has(node.logo),
          url: has(node.url),
          telephone: has(node.telephone),
          address: has(node.address),
          sameAs: has(node.sameAs),
        }
        out.organization = organization
      }
    }
  }
  return out
}

const MIN_YEAR = 2000

export function newestDateIn(values: Array<string | null>, now: Date): string | null {
  let newest: number | null = null
  for (const value of values) {
    const time = value ? Date.parse(value) : NaN
    // A date in the future is a typo or a scheduled post, not the latest thing published.
    if (Number.isNaN(time) || time > now.getTime() || new Date(time).getUTCFullYear() < MIN_YEAR) continue
    if (newest === null || time > newest) newest = time
  }
  return newest === null ? null : new Date(newest).toISOString()
}

/** Ids anywhere, and the old <a name> form: what a same-page link can jump to. */
export function targetIdsOf(content: string): string[] {
  const ids = new Set<string>()
  let tags = 0
  for (const m of content.matchAll(/<([a-z][a-z0-9-]{0,20})\b[^<>]{0,2000}>/gi)) {
    if (ids.size >= MAX_IDS || ++tags > MAX_TAGS * 5) break
    const id = attr(m[0], 'id') ?? (m[1].toLowerCase() === 'a' ? attr(m[0], 'name') : null)
    if (id) ids.add(id)
  }
  return [...ids]
}

export type ParsedDetails = {
  details: Omit<PageDetails, 'canonicalStatus' | 'thinContent' | 'soft404'>
  scripts: Script[]
  content: string
  text: string
  h1Text: string | null
}

/** Everything that doesn't depend on where the page sits in the site. */
export function parseDetails(html: string, page: { wordCount: number; hasForm: boolean; links: Link[] }, now: Date): ParsedDetails {
  const content = withoutCode(html)
  const scripts = scriptsOf(html)
  const text = visibleText(html)
  const render = detectRenderMode(html, page.wordCount, page.links.length, scripts.length)
  const { h1Text, ...headings } = headingsOf(content)
  const images = tagsOf(content, 'img').slice(0, MAX_TAGS)
  const metas = tagsOf(inner(html, 'head') ?? html, 'meta')
  const times = tagsOf(content, 'time').slice(0, MAX_TAGS).map((tag) => attr(tag, 'datetime'))
  return {
    scripts,
    content,
    text,
    h1Text,
    details: {
      renderMode: render.mode,
      renderReason: render.reason,
      contentConfidence: render.mode === 'server' ? 'detected' : 'low',
      headings,
      social: {
        ogTitle: Boolean(metaContent(metas, 'og:title')),
        ogDescription: Boolean(metaContent(metas, 'og:description')),
        ogImage: Boolean(metaContent(metas, 'og:image')),
        twitterCard: Boolean(metaContent(metas, 'twitter:card')),
      },
      images: {
        missingDimensions: images.filter((img) => attr(img, 'width') === null || attr(img, 'height') === null).length,
        lazy: images.some((img) => attr(img, 'loading')?.toLowerCase() === 'lazy'),
      },
      mixedContent: mixedContentOf(content, scripts),
      structuredData: structuredDataOf(html),
      contact: detectContact(content, text, page.links, scripts, page.hasForm),
      newestDate: newestDateIn([metaContent(metas, 'article:published_time'), ...times], now),
    },
  }
}

export const isThin = (words: number, mode: RenderMode, group: string | null) =>
  (group === 'about' || group === 'services') && mode !== 'client-shell' && words < THIN_WORDS

/* -------------------------------------------------------------------------- */
/*  Marketing and trust signals (homepage only)                                */
/* -------------------------------------------------------------------------- */

const idsFrom = (html: string, pattern: RegExp) => [...new Set([...html.matchAll(pattern)].slice(0, 20).map((m) => m[1]))].slice(0, MAX_VALUES)

function tagsIn(html: string): MarketingSignals['tags'] {
  return {
    ga4: idsFrom(html, /['"=/](G-[A-Z0-9]{6,14})(?=['"&\s<])/g),
    gtm: idsFrom(html, /\b(GTM-[A-Z0-9]{4,10})\b/g),
    googleAds: idsFrom(html, /['"=/](AW-\d{6,14})(?=['"&\s<])/g),
    metaPixel: idsFrom(html, /(?:fbq\(\s{0,3}['"]init['"]\s{0,3},\s{0,3}['"]?|facebook\.com\/tr\?id=)(\d{6,20})/g),
    linkedinInsight: idsFrom(html, /(?:_linkedin_partner_id\s{0,3}=\s{0,3}["']?|linkedin\.com\/collect\/?\?pid=)(\d{3,12})/g),
    hotjar: idsFrom(html, /(?:hjid\s{0,3}:\s{0,3}|static\.hotjar\.com\/c\/hotjar-)(\d{3,12})/g),
    clarity: idsFrom(html, /(?:clarity\.ms\/tag\/|["']clarity["']\s{0,3},\s{0,3}["']script["']\s{0,3},\s{0,3}["'])([a-z0-9]{6,20})/gi),
  }
}

const SOCIAL_HOSTS: Array<[keyof MarketingSignals['social'], RegExp]> = [
  ['instagram', /(^|\.)instagram\.com$/],
  ['facebook', /(^|\.)(facebook\.com|fb\.com|fb\.me)$/],
  ['linkedin', /(^|\.)linkedin\.com$/],
  ['youtube', /(^|\.)(youtube\.com|youtu\.be)$/],
  ['x', /(^|\.)(twitter\.com|x\.com)$/],
  ['pinterest', /(^|\.)(pinterest\.[a-z.]+|pin\.it)$/],
  ['threads', /(^|\.)(threads\.net|threads\.com)$/],
]
/** A share button or a single post isn't the business's profile. */
const NOT_A_PROFILE = /^\/(sharer|share|intent|shareArticle|pin\/create|p\/|reel\/|reels\/|explore|accounts|stories|tv\/|dialog|plugins|watch)/i
const RESERVED_INSTAGRAM = new Set(['p', 'reel', 'reels', 'explore', 'accounts', 'stories', 'tv', 'about', 'developer', 'legal'])

export function instagramHandleOf(url: string): string | null {
  try {
    const segment = new URL(url).pathname.split('/').filter(Boolean)[0]?.replace(/^@/, '').toLowerCase()
    return segment && /^[a-z0-9._]{1,30}$/.test(segment) && !RESERVED_INSTAGRAM.has(segment) ? segment : null
  } catch {
    return null
  }
}

function socialIn(urls: string[]): MarketingSignals['social'] {
  const out: MarketingSignals['social'] = { instagram: [], facebook: [], linkedin: [], youtube: [], x: [], pinterest: [], threads: [] }
  for (const raw of urls) {
    let url: URL
    try { url = new URL(raw) } catch { continue }
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.pathname === '/' || NOT_A_PROFILE.test(url.pathname)) continue
    const network = SOCIAL_HOSTS.find(([, host]) => host.test(url.hostname.toLowerCase()))?.[0]
    if (!network || out[network].length >= MAX_VALUES) continue
    // Without the trailing slash, so one profile linked two ways counts once.
    const clean = `${url.origin}${url.pathname.replace(/\/+$/, '')}`.slice(0, 300)
    if (!out[network].includes(clean)) out[network].push(clean)
  }
  return out
}

const TESTIMONIAL_MARK = /\s(?:id|class)\s{0,3}=\s{0,3}["'][^"']{0,200}(testimonial|client-review|customer-review)/i
const CLIENT_LOGO_MARK = /\s(?:id|class)\s{0,3}=\s{0,3}["'][^"']{0,200}(client-logo|clients-logo|logo-carousel|logo-slider|brand-logos|partner-logos|logos-section)/i
const TRUST_HEADING = /\b(trusted by|our clients|clients we|brands we|brands that|who we work with|our partners)\b/i
const TESTIMONIAL_HEADING = /\b(testimonials?|what (?:our )?(?:clients|customers) say|client reviews|customer reviews)\b/i
const GOOGLE_MAPS = /google\.[a-z.]{2,8}\/maps\/embed|maps\.google\.[a-z.]{2,8}\/maps|google\.[a-z.]{2,8}\/maps\?[^"']{0,200}output=embed/i
const REVIEW_WIDGET = /elfsight\.com|elfsightcdn\.com|trustindex\.io|sociablekit\.com|reviewsonmywebsite\.com|grwapi\.net|widget\.taggbox|google reviews?\b/i
const ADDRESS_WORD = /\b(road|rd\.?|street|st\.|nagar|colony|sector|phase|floor|plot|building|bldg|marg|lane|avenue|layout|complex|tower|india)\b/i

/** A six-digit Indian PIN with an address word close by. */
function addressInText(text: string): boolean {
  let seen = 0
  for (const m of text.slice(0, MAX_TEXT).matchAll(/(?<![\d.,-])[1-9]\d{2}\s?\d{3}(?![\d-])/g)) {
    if (++seen > 50) return false
    if (ADDRESS_WORD.test(text.slice(Math.max(0, m.index - 120), m.index + 30))) return true
  }
  return false
}

const CDN_HEADERS: Array<[string, string]> = [
  ['cf-ray', 'Cloudflare'],
  ['x-vercel-id', 'Vercel'],
  ['x-nf-request-id', 'Netlify'],
  ['x-amz-cf-id', 'Amazon CloudFront'],
  ['x-fastly-request-id', 'Fastly'],
  ['x-akamai-transformed', 'Akamai'],
  ['x-github-request-id', 'GitHub Pages'],
  ['x-sucuri-id', 'Sucuri'],
  ['x-shopid', 'Shopify'],
]

function headerSignals(headers: Record<string, string>): MarketingSignals['headers'] {
  const value = (name: string) => headers[name]?.slice(0, 120) ?? null
  return {
    server: value('server'),
    cdn: CDN_HEADERS.find(([name]) => headers[name] !== undefined)?.[1] ?? (/cloudflare/i.test(headers.server ?? '') ? 'Cloudflare' : null),
    hsts: headers['strict-transport-security'] !== undefined,
    compression: value('content-encoding'),
    cacheControl: value('cache-control'),
  }
}

export function parseMarketing(html: string, parsed: ParsedDetails, links: Link[], headers: Record<string, string>): Omit<MarketingSignals, 'latestPost'> {
  const headings = parsed.details.headings.outline.map((h) => h.text)
  const sameAs = jsonLdNodes(html).slice(0, MAX_TAGS).flatMap((node) => (Array.isArray(node.sameAs) ? node.sameAs : [node.sameAs])).filter((u): u is string => typeof u === 'string')
  const social = socialIn([...links.map((l) => l.href), ...sameAs])
  const hasSchemaAddress = parsed.details.structuredData.organization?.address === true
  return {
    tags: tagsIn(html),
    social,
    instagramHandle: social.instagram.map(instagramHandleOf).find(Boolean) ?? null,
    trust: {
      testimonials: TESTIMONIAL_MARK.test(parsed.content) || headings.some((h) => TESTIMONIAL_HEADING.test(h)),
      clientLogos: CLIENT_LOGO_MARK.test(parsed.content) || headings.some((h) => TRUST_HEADING.test(h)),
      googleMaps: GOOGLE_MAPS.test(parsed.content),
      address: hasSchemaAddress ? 'schema' : addressInText(parsed.text) ? 'text' : null,
      googleReviews: REVIEW_WIDGET.test(html),
    },
    headers: headerSignals(headers),
  }
}
