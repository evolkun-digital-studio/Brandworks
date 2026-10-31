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

/** Looked for too, after the main six: they never count against the main groups or as "missing". */
export const EXTRA_PAGE_GROUPS = ['shop', 'faq', 'testimonials', 'careers'] as const
export type ExtraPageGroup = (typeof EXTRA_PAGE_GROUPS)[number]
export type PageGroup = KeyPageGroup | ExtraPageGroup
export const PAGE_GROUPS: readonly PageGroup[] = [...KEY_PAGE_GROUPS, ...EXTRA_PAGE_GROUPS]

export const KEY_PAGE_LABELS: Record<PageGroup, string> = {
  about: 'About',
  services: 'Services/Products',
  contact: 'Contact',
  pricing: 'Pricing',
  work: 'Work/Portfolio',
  blog: 'Blog/News',
  shop: 'Shop',
  faq: 'FAQ',
  testimonials: 'Testimonials/Reviews',
  careers: 'Careers',
}

/**
 * How far a finding can be trusted, which also decides how it's worded.
 * measured: a fact from a response. detected: a pattern found in the HTML.
 * not-detected: a pattern not found, so it may still exist. low: a client-rendered page.
 */
export type FindingConfidence = 'measured' | 'detected' | 'not-detected' | 'low'
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low'

export type ScanFinding = {
  code: string
  severity: FindingSeverity
  confidence: FindingConfidence
  title: string
  evidence: string
  impact: string
  pages?: string[]
}

export type RenderMode = 'server' | 'client-shell' | 'unknown'
export type LinkLocation = 'nav' | 'footer' | 'body' | 'sitemap' | 'inline-script'
export type CanonicalStatus = 'missing' | 'self' | 'points-to-homepage' | 'points-to-other-page' | 'cross-domain' | 'http-on-https-site' | 'relative'
export type ContactVia = 'link' | 'text' | 'form' | 'embed'

export type GroupResult = {
  status: 'page' | 'homepage-section' | 'not-found' | 'not-checked' | 'blocked-by-robots'
  url?: string
  anchor?: string
  /** Where the winning link was found. */
  foundIn?: LinkLocation
  confidence: FindingConfidence
}

export type RedirectInfo = {
  count: number
  /** permanent: every hop 301/308. temporary: every hop 302/303/307. */
  type: 'permanent' | 'temporary' | 'mixed' | 'unknown'
  httpToHttps: boolean
  chain: string[]
}

export type PageContact = {
  emails: Array<{ value: string; via: ContactVia }>
  phones: Array<{ value: string; via: ContactVia }>
  whatsapp: string[]
  form: boolean
  embeds: Array<{ provider: string; via: ContactVia }>
}

export type ContactMethod = {
  found: boolean
  /** The strongest way it was found; null when it wasn't. */
  via: ContactVia | null
  pages: string[]
  /** Normalised and deduped, at most three. Team-only. */
  values?: string[]
  providers?: string[]
  confidence: FindingConfidence
}

export type OrganizationSchema = { type: string; name: boolean; logo: boolean; url: boolean; telephone: boolean; address: boolean; sameAs: boolean }

/** Extras read from one page. Absent on scans stored before they existed: treat that as "not checked". */
export type PageDetails = {
  renderMode: RenderMode
  renderReason: string
  /** How far word count, H1 and missing-content findings on this page can be trusted. */
  contentConfidence: FindingConfidence
  canonicalStatus: CanonicalStatus
  /** Why the page reads as a "not found" page despite responding 200; null if it doesn't. */
  soft404: string | null
  headings: { h2: number; h3: number; outline: Array<{ level: number; text: string }> }
  thinContent: boolean
  social: { ogTitle: boolean; ogDescription: boolean; ogImage: boolean; twitterCard: boolean }
  images: { missingDimensions: number; lazy: boolean }
  mixedContent: { count: number; samples: string[] }
  structuredData: { organization: OrganizationSchema | null; product: boolean; service: boolean; faq: boolean; breadcrumb: boolean }
  contact: PageContact
  /** Newest article:published_time or <time datetime> on the page. */
  newestDate: string | null
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
  details?: PageDetails
}

export type CrawledPage = {
  group: PageGroup
  url: string
  /** null when the request itself failed. */
  finalUrl: string | null
  statusCode: number | null
  /** Why the page couldn't be read; `check` is null then. */
  error: string | null
  check: KeyPageCheck | null
  foundIn?: LinkLocation
  redirect?: RedirectInfo
  /** It responded 200 but reads as a "not found" page. */
  soft404?: boolean
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
  /** The fields below are absent on scans stored before they existed. */
  groups?: Record<PageGroup, GroupResult>
  contact?: Record<'form' | 'phone' | 'email' | 'whatsapp', ContactMethod>
  /** Ranked, most severe first. */
  findings?: ScanFinding[]
  soft404s?: string[]
}

export type LinkHealth = {
  /** Unique internal links known that weren't crawled anyway. */
  candidates: number
  checked: number
  broken: Array<{ url: string; status: number; foundOn: string }>
  redirected: Array<{ url: string; finalUrl: string; foundOn: string; type: RedirectInfo['type']; httpToHttps: boolean }>
  /** Answered 401, 403 or 429, or didn't answer: that proves nothing about the link. */
  inconclusive: number
  /** Left unchecked because the time budget ran out. */
  dropped: number
  /** An app shell answers 200 for any address, so "not broken" means little there. */
  confidence: FindingConfidence
}

export type SitemapQuality = {
  found: boolean
  urlCount: number
  listedInRobotsTxt: boolean
  hasLastmod: boolean
  newestLastmod: string | null
  /** robots.txt says "Disallow: /" to every crawler. */
  robotsBlocksAll: boolean
  /** Only what we actually fetched: other sitemap URLs weren't checked. */
  redirects: Array<{ url: string; finalUrl: string }>
  errors: Array<{ url: string; status: number }>
  soft404s: string[]
  noindex: string[]
}

export type MarketingSignals = {
  tags: { ga4: string[]; gtm: string[]; googleAds: string[]; metaPixel: string[]; linkedinInsight: string[]; hotjar: string[]; clarity: string[] }
  social: { instagram: string[]; facebook: string[]; linkedin: string[]; youtube: string[]; x: string[]; pinterest: string[]; threads: string[] }
  instagramHandle: string | null
  trust: { testimonials: boolean; clientLogos: boolean; googleMaps: boolean; address: 'schema' | 'text' | null; googleReviews: boolean }
  headers: { server: string | null; cdn: string | null; hsts: boolean; compression: string | null; cacheControl: string | null }
  latestPost: { date: string; source: 'blog page' | 'sitemap' } | null
}

export type PagesData = {
  homepage: {
    url: string
    statusCode: number
    check: KeyPageCheck
    redirect?: RedirectInfo
    /** Groups the homepage has a section for: for one-page sites. */
    sections?: Array<{ group: PageGroup; anchor: string }>
  }
  pages: CrawledPage[]
  discovery: {
    homepageLinks: number
    sitemapUrls: number
    /** Paths read from inline scripts of a client-rendered homepage: a hint, not proof. */
    inlineHints?: number
  }
  summary: PagesSummary
  /** The fields below are absent on scans stored before they existed. Null: never got that far. */
  linkHealth?: LinkHealth | null
  sitemap?: SitemapQuality | null
  signals?: MarketingSignals
  /** Internal links written as http:// on an https site. */
  insecureInternalLinks?: string[]
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

/* -------------------------------------------------------------------------- */
/*  Team-only views (admin panel)                                             */
/* -------------------------------------------------------------------------- */

export type ScanStatus = 'running' | 'done' | 'failed'

/** A collector's state in the list. status is null until it has reported (or on scans stored before it existed). */
export type CollectorState = { status: CollectorStatus | null; reason: string | null }

/** One row of the team's list: small by design, the full results are only sent for the detail page. */
export type SiteScanSummary = {
  id: string
  domain: string
  url: string
  status: ScanStatus
  /** Still marked running, but the process that held it was lost (e.g. a restart). */
  stale: boolean
  createdAt: string
  updatedAt: string
  paidSources: boolean
  error: string | null
  /** null until an analysis exists. */
  ai: boolean | null
  headline: string | null
  issueCount: number | null
  collectors: Record<ScanStepKey, CollectorState>
  performanceScore: number | null
  seoScore: number | null
  /** Two different metrics with different scales: never shown under one label. */
  authority: { provider: 'moz'; domainAuthority: number | null } | { provider: 'dataforseo'; domainRank: number | null } | null
  estimatedTraffic: number | null
  pages: { crawled: number; groupsFound: number; groupsNotFound: number; groupsNotChecked: number } | null
}

export type SiteScanListResult = { items: SiteScanSummary[]; page: number; pageSize: number; total: number; totalPages: number }

export type LinkedSubmission = { id: string; name: string; email: string; company: string; submittedAt: string; branch: string }

export type SiteScanDetail = {
  id: string
  domain: string
  url: string
  status: ScanStatus
  stale: boolean
  createdAt: string
  updatedAt: string
  /** When a new visitor would stop reusing this scan. */
  cachedUntil: string
  /** When Mongo's TTL index removes it. */
  expiresAt: string
  paidSources: boolean
  error: string | null
  results: ScanResults | PartialScanResults | null
  analysis: SiteAnalysis | null
  submissions: LinkedSubmission[]
}

export const DISCLAIMER ='Based on public data (Google, Moz/DataForSEO). Estimates, not your private analytics.'
