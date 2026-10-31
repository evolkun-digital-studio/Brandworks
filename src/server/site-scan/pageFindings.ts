/**
 * Turns a key-page crawl into ranked findings, worded by how far each can be
 * trusted: a fact we measured reads as a fact, and something we didn't detect
 * reads as "we didn't find", never "you don't have". Tolerates scans stored
 * before the newer fields existed: what's absent simply produces no finding.
 */
import { KEY_PAGE_LABELS, type FindingConfidence, type FindingSeverity, type KeyPageCheck, type PagesData, type ScanFinding } from './types'

export const SEVERITY_ORDER: FindingSeverity[] = ['critical', 'high', 'medium', 'low']

export const CLIENT_SHELL_CAVEAT = 'This site builds its content with JavaScript; the HTML we read before JavaScript runs is mostly empty, so content checks are unreliable and Google may also see less content.'

const pathOf = (url: string) => {
  try { return new URL(url).pathname } catch { return url }
}
const paths = (urls: string[]) => urls.map(pathOf).join(', ')
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

const ORGANIZATION_FIELDS = ['name', 'logo', 'url', 'telephone', 'address', 'sameAs'] as const

export function buildFindings(data: PagesData): ScanFinding[] {
  const { summary: s, homepage, pages } = data
  const findings: ScanFinding[] = []
  const add = (code: string, severity: FindingSeverity, confidence: FindingConfidence, title: string, evidence: string, impact: string, urls?: string[]) => {
    findings.push({ code, severity, confidence, title, evidence, impact, ...(urls?.length ? { pages: urls.slice(0, 10) } : {}) })
  }
  const homeUrl = homepage.url
  const crawled = (urls: string[]) => urls.filter((u) => u !== homeUrl)
  const homeDetails = homepage.check.details
  const isShell = homeDetails?.renderMode === 'client-shell'
  // No words in the homepage HTML: it's rendered by JavaScript, so finding nothing proves nothing.
  const htmlIsReadable = homepage.check.wordCount > 0 && !isShell
  const read = pages.filter((p): p is typeof p & { check: KeyPageCheck } => p.check !== null)
  const reachable = [{ url: homeUrl, check: homepage.check }, ...read.map((p) => ({ url: p.finalUrl ?? p.url, check: p.check }))]

  /* Critical ---------------------------------------------------------------- */
  if (data.sitemap?.robotsBlocksAll) {
    add('robots-blocks-all', 'critical', 'measured', 'robots.txt blocks every crawler', 'robots.txt says "Disallow: /" for all user agents (key-page check)', 'Search engines are told not to crawl any page of the site.')
  }
  if (s.noindex.includes(homeUrl)) {
    add('homepage-noindex', 'critical', 'detected', 'Homepage hidden from search', 'The homepage has a noindex robots tag (key-page check)', 'A noindex tag keeps the homepage out of Google results.', [homeUrl])
  }
  const canonicalHome = read.filter((p) => p.check.details?.canonicalStatus === 'points-to-homepage').map((p) => p.finalUrl ?? p.url)
  if (canonicalHome.length > 0) {
    add('canonical-to-homepage', 'critical', 'detected', 'Key pages name the homepage as their canonical', `Canonical tag points to the homepage on: ${paths(canonicalHome)} (key-page check)`, 'This tells Google these pages are copies of the homepage, so they may not appear in search.', canonicalHome)
  }
  const contactFound = Object.values(s.contactMethods).some(Boolean)
  const contactNotFound = s.groupsNotFound.includes('contact')
  if (htmlIsReadable && !contactFound && !s.truncated && !s.groupsNotChecked.includes('contact')) {
    add('no-contact-method', 'critical', 'not-detected', 'No contact method found', `We didn’t find a contact form, phone, email or WhatsApp link in the HTML of the pages checked: ${s.pagesChecked} (key-page check)`, 'They may exist somewhere we couldn’t see, but visitors who can’t quickly find a way to reach you may leave.')
  } else if (htmlIsReadable && contactNotFound) {
    add('no-contact-page', 'medium', 'not-detected', 'No Contact page found', 'No Contact page found from the homepage links or sitemap (key-page check)', 'It may exist, but a page that is hard to find is a page visitors miss.')
  }

  /* High -------------------------------------------------------------------- */
  const soft404s = s.soft404s ?? []
  if (soft404s.length > 0) {
    add('soft-404', 'high', 'detected', 'Pages that say "not found" but respond normally', `Responded 200 but read as a not-found page: ${paths(soft404s)} (key-page check)`, 'Visitors hit a dead end, and search engines may keep these pages indexed.', soft404s)
  }
  const broken = data.linkHealth?.broken ?? []
  if (broken.length > 0) {
    add('broken-links', 'high', data.linkHealth?.confidence ?? 'measured', 'Broken internal links', `${plural(broken.length, 'internal link')} responded with an error: ${broken.map((b) => `${pathOf(b.url)} (${b.status}, linked from ${pathOf(b.foundOn)})`).join(', ')} (link check)`, 'Visitors and search engines reach a dead end.', broken.map((b) => b.url))
  }
  const mixed = reachable.filter((p) => (p.check.details?.mixedContent.count ?? 0) > 0)
  if (mixed.length > 0) {
    add('mixed-content', 'high', 'detected', 'Insecure resources on secure pages', `http:// resources found on https pages: ${paths(mixed.map((p) => p.url))} (key-page check)`, 'Browsers may block these resources or warn visitors.', mixed.map((p) => p.url))
  }
  if (crawled(s.noindex).length > 0) {
    add('key-pages-noindex', 'high', 'detected', 'Key pages hidden from search', `Pages blocked from search (noindex): ${paths(crawled(s.noindex))} (key-page check)`, 'A noindex tag keeps these pages out of Google results.', crawled(s.noindex))
  }
  if (crawled(s.missingMetaDescription).length > 0) {
    add('missing-meta', 'high', 'detected', 'Pages without a meta description', `${s.missingMetaDescription.length} of ${s.pagesChecked} pages have no meta description (key-page check)`, 'Google writes its own snippet for them, which is often less persuasive.', s.missingMetaDescription)
  }

  /* Medium ------------------------------------------------------------------ */
  if (isShell) {
    add('client-rendered', 'medium', 'detected', 'Content is built by JavaScript', CLIENT_SHELL_CAVEAT, 'Our content checks can’t see what visitors see, and search engines may index less of the site.')
  }
  const canonicalBad = reachable.filter((p) => p.check.details?.canonicalStatus === 'cross-domain' || p.check.details?.canonicalStatus === 'http-on-https-site')
  if (canonicalBad.length > 0) {
    add('canonical-wrong-target', 'medium', 'detected', 'Canonical tags pointing somewhere unexpected', `Canonical goes to another domain or to http:// on: ${paths(canonicalBad.map((p) => p.url))} (key-page check)`, 'Search engines may credit a different address than the one you want to rank.', canonicalBad.map((p) => p.url))
  }
  const thin = read.filter((p) => p.check.details?.thinContent)
  if (thin.length > 0) {
    add('thin-content', 'medium', 'detected', 'Little text on key pages', `Under 300 words in the HTML on: ${paths(thin.map((p) => p.finalUrl ?? p.url))} (key-page check)`, 'Short pages give visitors and search engines less to go on.', thin.map((p) => p.finalUrl ?? p.url))
  }
  if (s.duplicateTitles.length > 0) {
    const first = s.duplicateTitles[0]
    add('duplicate-titles', 'medium', 'detected', 'Pages sharing the same title', `The title “${first.text.slice(0, 60)}” is used on ${first.urls.length} pages (key-page check)`, 'Search results look the same for different pages, so people can’t tell which one they need.', first.urls)
  }
  const sitemap = data.sitemap
  if (sitemap && sitemap.errors.length + sitemap.soft404s.length + sitemap.noindex.length > 0) {
    const bad = [...sitemap.errors.map((e) => e.url), ...sitemap.soft404s, ...sitemap.noindex]
    add('sitemap-bad-urls', 'medium', 'measured', 'Sitemap lists pages that shouldn’t be there', `Sitemap URLs that return errors, read as not found, or are noindex: ${paths(bad)} (sitemap check, only pages we fetched)`, 'A sitemap should only list pages you want in search.', bad)
  }
  const noOpenGraph = reachable.filter((p) => p.check.details && !(p.check.details.social.ogTitle && p.check.details.social.ogDescription && p.check.details.social.ogImage))
  if (noOpenGraph.length > 0) {
    add('missing-open-graph', 'medium', isShell ? 'low' : 'not-detected', 'Incomplete link previews', `We didn’t find a full set of Open Graph tags (title, description, image) on: ${paths(noOpenGraph.map((p) => p.url))} (key-page check)`, 'Links shared on social apps may show a plain or wrong preview.', noOpenGraph.map((p) => p.url))
  }
  if (homeDetails) {
    const organization = homeDetails.structuredData.organization
    if (!organization) {
      add('no-organization-schema', 'medium', isShell ? 'low' : 'not-detected', 'No business details in structured data', 'We didn’t find Organization or LocalBusiness structured data on the homepage (key-page check)', 'Structured data helps search engines show your business details correctly.')
    } else {
      const missing = ORGANIZATION_FIELDS.filter((field) => !organization[field])
      if (missing.length > 0) add('organization-schema-fields', 'medium', 'not-detected', 'Structured data is missing business details', `We didn’t find these in the ${organization.type} structured data: ${missing.join(', ')} (key-page check)`, 'Complete details help search engines show your business correctly.')
    }
  }

  /* Low --------------------------------------------------------------------- */
  const redirected = data.linkHealth?.redirected ?? []
  if (redirected.length > 0) {
    add('redirected-links', 'low', data.linkHealth?.confidence ?? 'measured', 'Internal links going through a redirect', `${plural(redirected.length, 'internal link')} redirected: ${paths(redirected.map((r) => r.url))} (link check)`, 'Each hop adds a little delay; linking straight to the final address is cleaner.', redirected.map((r) => r.url))
  }
  const insecure = data.insecureInternalLinks ?? []
  if (insecure.length > 0) {
    add('http-internal-links', 'low', 'detected', 'Internal links written as http://', `Links written with http:// on the homepage: ${paths(insecure)} (key-page check)`, 'Each one sends visitors through a redirect to https.', insecure)
  }
  const missingDimensions = reachable.reduce((n, p) => n + (p.check.details?.images.missingDimensions ?? 0), 0)
  if (missingDimensions > 0) {
    add('images-no-dimensions', 'low', isShell ? 'low' : 'detected', 'Images without width and height', `Images missing width or height in the pages checked: ${missingDimensions} (key-page check)`, 'The layout can jump around as images load.')
  }

  /* A not-detected on a page we can't really read is worth less than it sounds. */
  const ranked = findings.map((f) => (isShell && f.confidence === 'not-detected' ? { ...f, confidence: 'low' as const } : f))
  return ranked.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
}

/** Plain labels for the group statuses, shared by the analysis and the admin page. */
export function groupStatusLabel(status: NonNullable<PagesData['summary']['groups']>[keyof typeof KEY_PAGE_LABELS]['status']): string {
  switch (status) {
    case 'page': return 'its own page'
    case 'homepage-section': return 'a section on the homepage'
    case 'not-found': return 'not found from links, sitemap or homepage sections (may still exist)'
    case 'blocked-by-robots': return 'known, but robots.txt asks us not to read it'
    default: return 'known of, but not checked'
  }
}
