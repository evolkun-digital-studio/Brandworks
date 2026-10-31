import type { AuthorityData, CollectorState, SiteScanSummary } from '../../server/site-scan/types'

/** Every link to a scanned site: it's someone else's content, not an endorsement. */
export const EXTERNAL_REL = 'noopener noreferrer nofollow'

/** Scanned sites supply these URLs, so only http(s) may become a link (never javascript: and the like). */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null
  } catch {
    return null
  }
}

export type ScoreTone = 'danger' | 'warning' | 'success'

/** The standard Lighthouse bands. */
export const scoreTone = (score: number): ScoreTone => (score >= 90 ? 'success' : score >= 50 ? 'warning' : 'danger')

/** DA (Moz, 0-100) and Domain Rank (DataForSEO, 0-1000) are different metrics, so each keeps its own label. */
export function authorityLabel(provider: AuthorityData['provider']): string {
  return provider === 'moz' ? 'DA' : 'Domain Rank /1000'
}

export function authorityValue(authority: NonNullable<SiteScanSummary['authority']>): number | null {
  return authority.provider === 'moz' ? authority.domainAuthority : authority.domainRank
}

export const GROUPS_NOT_FOUND_LABEL = 'Not found from links or sitemap'

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [['day', 86_400_000], ['hour', 3_600_000], ['minute', 60_000]]

export function relativeTime(iso: string, now = Date.now()): string {
  const delta = new Date(iso).getTime() - now
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, ms] of UNITS) {
    if (Math.abs(delta) >= ms) return format.format(Math.round(delta / ms), unit)
  }
  return 'just now'
}

export function exactTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** The tooltip for a value that isn't there: the collector's own reason, or why it hasn't reported. */
export function unavailableReason(state: CollectorState, running: boolean): string {
  if (state.reason) return state.reason
  if (state.status === 'error') return 'The data source failed'
  if (state.status === 'skipped') return 'Not checked'
  if (state.status === 'ok') return 'The data source returned no value'
  return running ? 'Still running' : 'Not collected on this scan'
}
