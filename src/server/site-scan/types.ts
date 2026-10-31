/**
 * Shared shapes for the website quick-look. Every collector is independent
 * and optional: it reports 'ok' with data, 'skipped' (not configured, or the
 * daily paid cap was reached) or 'error'. Nothing downstream ever fills a gap
 * with a guess — a missing section is reported as "not available".
 */

export type CollectorStatus = 'ok' | 'skipped' | 'error'

export type CollectorResult<T> = {
  status: CollectorStatus
  /** Where the numbers came from, e.g. "Google PageSpeed Insights". */
  source: string
  fetchedAt: string
  data: T | null
  /** Why it was skipped or failed — for the team, never shown to the customer. */
  reason?: string
}

export type Env = Record<string, string | undefined>

export type CollectorDeps = {
  fetch?: typeof fetch
  env?: Env
  now?: () => Date
}

export const stamp = (deps: CollectorDeps) => (deps.now ? deps.now() : new Date()).toISOString()

export function ok<T>(source: string, data: T, deps: CollectorDeps = {}): CollectorResult<T> {
  return { status: 'ok', source, fetchedAt: stamp(deps), data }
}

export function skipped<T>(source: string, reason: string, deps: CollectorDeps = {}): CollectorResult<T> {
  return { status: 'skipped', source, fetchedAt: stamp(deps), data: null, reason }
}

export function failed<T>(source: string, reason: string, deps: CollectorDeps = {}): CollectorResult<T> {
  return { status: 'error', source, fetchedAt: stamp(deps), data: null, reason: reason.slice(0, 300) }
}

export const envOf = (deps: CollectorDeps): Env => deps.env ?? process.env
export const envValue = (deps: CollectorDeps, name: string) => envOf(deps)[name]?.trim() || undefined

/** A finite number from an API field, or null — never a guess. */
export function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/* -------------------------------------------------------------------------- */
/*  Collector data                                                            */
/* -------------------------------------------------------------------------- */

export type Platform = 'WordPress' | 'Shopify' | 'Wix' | 'Webflow' | 'Framer' | 'Next.js'

export type OnPageData = {
  finalUrl: string
  statusCode: number
  https: boolean
  responseTimeMs: number
  redirects: number
  htmlTruncated: boolean
  title: { text: string | null; length: number }
  metaDescription: { text: string | null; length: number }
  h1Count: number
  canonical: string | null
  lang: string | null
  viewport: boolean
  openGraph: Record<string, string>
  jsonLdTypes: string[]
  robotsMeta: string | null
  noindex: boolean
  /** null = couldn't check (network/timeout). */
  robotsTxt: boolean | null
  sitemapXml: boolean | null
  sitemapInRobotsTxt: boolean | null
  /** Why robots.txt / sitemap.xml couldn't be read, when the site itself is the cause (e.g. a redirect loop). */
  robotsTxtProblem: string | null
  sitemapXmlProblem: string | null
  wordCount: number
  images: { total: number; missingAlt: number }
  platform: Platform | null
}

export type CwvCategory = 'good' | 'needs-improvement' | 'poor'

export type FieldMetric = { value: number; category: CwvCategory | null }

export type PerformanceData = {
  strategy: 'mobile'
  scores: { performance: number | null; seo: number | null; accessibility: number | null; bestPractices: number | null }
  lab: { lcpMs: number | null; fcpMs: number | null; tbtMs: number | null; cls: number | null; speedIndexMs: number | null }
  /** Real-user Chrome UX Report data, when Google has enough of it. */
  field: {
    scope: 'url' | 'origin'
    overall: CwvCategory | null
    lcpMs: FieldMetric | null
    inpMs: FieldMetric | null
    cls: FieldMetric | null
  } | null
}

export type MozAuthority = {
  provider: 'moz'
  domainAuthority: number | null
  pageAuthority: number | null
  spamScore: number | null
  linkingRootDomains: number | null
  externalLinks: number | null
}

export type DataForSeoAuthority = {
  provider: 'dataforseo'
  /** DataForSEO's own rank, 0–1000. NOT Domain Authority. */
  domainRank: number | null
  domainRankScale: 1000
  backlinks: number | null
  referringDomains: number | null
  referringMainDomains: number | null
  brokenBacklinks: number | null
  backlinksSpamScore: number | null
}

export type AuthorityData = MozAuthority | DataForSeoAuthority

export type TrafficData = {
  /** DataForSEO's estimate of monthly organic search visits. An estimate, not analytics. */
  estimatedOrganicTraffic: number | null
  rankingKeywords: number | null
  locationCode: number
  location: string
  languageCode: string
}

/** The page types the crawl looks for, in priority order. */
export const KEY_PAGE_GROUPS = ['about', 'services', 'contact', 'pricing', 'work', 'blog'] as const
export type KeyPageGroup = (typeof KEY_PAGE_GROUPS)[number]

export const KEY_PAGE_LABELS: Record<KeyPageGroup, string> = {
  about: 'About',
  services: 'Services/Products',
  contact: 'Contact',
  pricing: 'Pricing',
  work: 'Work/Portfolio',
  blog: 'Blog/News',
}

export type KeyPageCheck = {
  htmlTruncated: boolean
  title: { text: string | null; length: number }
  metaDescription: { text: string | null; length: number }
  h1Count: number
  canonical: string | null
  noindex: boolean
  /** Counted in the HTML before JavaScript runs, like OnPageData.wordCount. */
  wordCount: number
  images: { total: number; missingAlt: number }
  jsonLdTypes: string[]
  hasForm: boolean
  contactLinks: { email: string[]; phone: string[]; whatsapp: string[] }
  ctaTexts: string[]
}

export type CrawledPage = {
  group: KeyPageGroup
  url: string
  /** null when the request itself failed. */
  finalUrl: string | null
  statusCode: number | null
  /** Why the page couldn't be read; `check` is null then. */
  error: string | null
  check: KeyPageCheck | null
}

export type DuplicateText = { text: string; urls: string[] }

/** Computed in code from the homepage + crawled pages, never by the AI. */
export type PagesSummary = {
  groupsFound: KeyPageGroup[]
  /** No link or sitemap entry matched. The page may still exist. */
  groupsNotFound: KeyPageGroup[]
  /** A candidate existed but wasn't read (failed, robots.txt, page limit or time budget). */
  groupsNotChecked: KeyPageGroup[]
  duplicateTitles: DuplicateText[]
  duplicateMetaDescriptions: DuplicateText[]
  noindex: string[]
  missingTitle: string[]
  missingMetaDescription: string[]
  /** Pages with no words in the HTML are left out: they're rendered by JavaScript, so the count proves nothing. */
  missingH1: string[]
  contactMethods: { form: boolean; phone: boolean; email: boolean; whatsapp: boolean }
  /** Read successfully, not counting the homepage. */
  pagesCrawled: number
  pagesFailed: number
  /** pagesCrawled + the homepage. */
  pagesChecked: number
  blockedByRobots: string[]
  /** The time budget ran out, so this is a partial result. */
  truncated: boolean
  note: string | null
}

export type PagesData = {
  homepage: { url: string; statusCode: number; check: KeyPageCheck }
  pages: CrawledPage[]
  discovery: { homepageLinks: number; sitemapUrls: number }
  summary: PagesSummary
}

export type ScanResults = {
  url: string
  domain: string
  onPage: CollectorResult<OnPageData>
  /** Absent on scans stored before the key-page crawl existed; run.ts fills it in when one is reused. */
  pages?: CollectorResult<PagesData>
  performance: CollectorResult<PerformanceData>
  authority: CollectorResult<AuthorityData>
  traffic: CollectorResult<TrafficData>
}

/** The live checklist, in display order. */
export const SCAN_STEPS = ['onPage', 'pages', 'performance', 'authority', 'traffic'] as const
export type ScanStepKey = (typeof SCAN_STEPS)[number]

/** What a running scan has stored so far (each collector appears when it finishes). */
export type PartialScanResults = Pick<ScanResults, 'url' | 'domain'> & Partial<Pick<ScanResults, ScanStepKey>>

/** 'pages' isn't required: scans stored before it existed are still complete, with the step simply missing. */
export function isCompleteResults(r: ScanResults | PartialScanResults | null | undefined): r is ScanResults {
  return Boolean(r && SCAN_STEPS.every((step) => step === 'pages' || r[step]))
}

export type SiteIssue = { title: string; evidence: string; impact: string }

export type SiteAnalysis = {
  headline: string
  strengths: string[]
  issues: SiteIssue[]
  opportunities: string[]
  customerTeaser: string
  /** false = the deterministic fallback, built only from on-page, key-page + performance data. */
  ai: boolean
  /** Items the model wrote that cited numbers not in the data, and were dropped. */
  droppedItems: number
}

export const DISCLAIMER = 'Based on public data (Google, Moz/DataForSEO). Estimates, not your private analytics.'
