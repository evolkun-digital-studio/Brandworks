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

export type ScanResults = {
  url: string
  domain: string
  onPage: CollectorResult<OnPageData>
  performance: CollectorResult<PerformanceData>
  authority: CollectorResult<AuthorityData>
  traffic: CollectorResult<TrafficData>
}

/** The live checklist, in display order. */
export const SCAN_STEPS = ['onPage', 'performance', 'authority', 'traffic'] as const
export type ScanStepKey = (typeof SCAN_STEPS)[number]

/** What a running scan has stored so far (each collector appears when it finishes). */
export type PartialScanResults = Pick<ScanResults, 'url' | 'domain'> & Partial<Pick<ScanResults, ScanStepKey>>

export function isCompleteResults(r: ScanResults | PartialScanResults | null | undefined): r is ScanResults {
  return Boolean(r && SCAN_STEPS.every((step) => r[step]))
}

export type SiteIssue = { title: string; evidence: string; impact: string }

export type SiteAnalysis = {
  headline: string
  strengths: string[]
  issues: SiteIssue[]
  opportunities: string[]
  customerTeaser: string
  /** false = the deterministic fallback, built only from on-page + performance data. */
  ai: boolean
  /** Items the model wrote that cited numbers not in the data, and were dropped. */
  droppedItems: number
}

export const DISCLAIMER = 'Based on public data (Google, Moz/DataForSEO). Estimates, not your private analytics.'
