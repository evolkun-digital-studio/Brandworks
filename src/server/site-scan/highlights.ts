/**
 * The handful of metrics the customer may see (the public GET endpoint, the
 * live checklist stream and the thank-you card). Each value is copied from
 * an API result and labelled with its real name and source; anything not
 * available is simply left out — never replaced with a made-up value.
 */
import {
  DISCLAIMER,
  isCompleteResults,
  type CollectorResult,
  type CwvCategory,
  type PartialScanResults,
  type ScanResults,
  type ScanStepKey,
  type SiteAnalysis,
} from './types'

export type Highlight = { label: string; value: string; note?: string }

export type PublicScanView = {
  status: 'running' | 'done' | 'failed'
  domain: string
  teaser: string | null
  /** false when the teaser is the deterministic summary of the data, not an AI sentence. */
  teaserAi: boolean
  highlights: Highlight[]
  disclaimer: string
}

/**
 * The ONLY shape the public GET endpoint returns: the customer teaser and up
 * to four labelled metrics. The team report (issues, opportunities) and the
 * raw API data stay server-side.
 */
export function publicScanView(scan: {
  status: PublicScanView['status']
  domain: string
  results: ScanResults | PartialScanResults | null
  analysis: SiteAnalysis | null
}): PublicScanView {
  const done = scan.status === 'done' && isCompleteResults(scan.results)
  return {
    status: scan.status,
    domain: scan.domain,
    teaser: done ? scan.analysis?.customerTeaser ?? null : null,
    teaserAi: done ? Boolean(scan.analysis?.ai) : false,
    highlights: done ? customerHighlights(scan.results as ScanResults) : [],
    disclaimer: DISCLAIMER,
  }
}

export const MAX_HIGHLIGHTS = 4

const fmt = (n: number) => n.toLocaleString('en-IN')
const seconds = (ms: number) => `${(Math.round(ms / 100) / 10).toFixed(1)} s`
const RATING: Record<CwvCategory, string> = { good: 'good', 'needs-improvement': 'needs improvement', poor: 'poor' }

/** The customer-safe metrics of ONE finished step (empty when it has none, or wasn't ok). */
export function stepHighlights(step: ScanStepKey, result: CollectorResult<unknown> | undefined): Highlight[] {
  if (!result || result.status !== 'ok' || !result.data) return []
  const out: Highlight[] = []
  const r = { [step]: result } as unknown as ScanResults

  if (step === 'onPage') {
    out.push({ label: 'Served over HTTPS', value: r.onPage.data!.https ? 'yes' : 'no' })
  }
  if (step === 'authority') {
    const a = r.authority.data!
    if (a.provider === 'moz') {
      if (a.domainAuthority !== null) out.push({ label: 'Domain Authority (Moz)', value: fmt(a.domainAuthority) })
      if (a.linkingRootDomains !== null) out.push({ label: 'Linking root domains (Moz)', value: fmt(a.linkingRootDomains) })
    } else {
      if (a.domainRank !== null) out.push({ label: 'Domain Rank (DataForSEO)', value: `${fmt(a.domainRank)}/${a.domainRankScale}` })
      if (a.referringDomains !== null) out.push({ label: 'Referring domains (DataForSEO)', value: fmt(a.referringDomains) })
    }
  }
  if (step === 'traffic') {
    const t = r.traffic.data!
    if (t.estimatedOrganicTraffic != null) out.push({ label: 'Estimated organic traffic (DataForSEO)', value: `${fmt(t.estimatedOrganicTraffic)}/month`, note: 'estimate' })
  }
  if (step === 'performance') {
    const p = r.performance.data!
    if (p.scores.performance != null) out.push({ label: 'Mobile performance (Google)', value: `${p.scores.performance}/100` })
    if (p.field?.lcpMs) {
      const { value, category } = p.field.lcpMs
      out.push({ label: 'Mobile LCP (Google, real users)', value: seconds(value), ...(category ? { note: RATING[category] } : {}) })
    } else if (p.lab.lcpMs != null) {
      out.push({ label: 'Mobile LCP (Google, lab test)', value: seconds(p.lab.lcpMs) })
    }
    if (p.scores.seo != null) out.push({ label: 'SEO score (Google)', value: `${p.scores.seo}/100` })
    if (p.scores.accessibility != null) out.push({ label: 'Accessibility score (Google)', value: `${p.scores.accessibility}/100` })
  }
  return out
}

/** Up to four metrics for the thank-you card: authority first, then traffic, then speed. */
export function customerHighlights(results: ScanResults): Highlight[] {
  return [
    ...stepHighlights('authority', results.authority),
    ...stepHighlights('traffic', results.traffic),
    ...stepHighlights('performance', results.performance),
  ].slice(0, MAX_HIGHLIGHTS)
}
