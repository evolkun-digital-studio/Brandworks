import type { ReactNode } from 'react'
import type { ScanStatus } from '../../server/site-scan/types'
import { EXTERNAL_REL, safeHref, scoreTone } from '../lib/siteScan'
import AdminStatusBadge from './AdminStatusBadge'

export function ScanStatusBadge({ status, stale, error }: { status: ScanStatus; stale: boolean; error?: string | null }) {
  if (status === 'running' && stale) return <span title="It stopped reporting, probably a server restart. It won’t finish by itself."><AdminStatusBadge tone="warning">Stalled</AdminStatusBadge></span>
  if (status === 'running') return <AdminStatusBadge tone="accent">Running</AdminStatusBadge>
  if (status === 'failed') return <span title={error ?? undefined}><AdminStatusBadge tone="danger">Failed</AdminStatusBadge></span>
  return <AdminStatusBadge tone="success">Done</AdminStatusBadge>
}

export function ScoreBadge({ score }: { score: number }) {
  return <AdminStatusBadge tone={scoreTone(score)} dot={false}><span className="tabular-nums">{score}</span></AdminStatusBadge>
}

export function AnalysisBadge({ ai }: { ai: boolean }) {
  return <AdminStatusBadge tone={ai ? 'accent' : 'neutral'} dot={false}>{ai ? 'AI' : 'Rule-based'}</AdminStatusBadge>
}

/** A missing value, with the reason on hover. */
export function Unavailable({ reason }: { reason: string }) {
  return <span className="cursor-help text-a-ink-3" title={reason}>—<span className="sr-only"> {reason}</span></span>
}

/** A link out to a scanned site. Anything that isn't http(s) stays plain text. */
export function ExternalSiteLink({ url, children, className = 'admin-link break-all' }: { url: string | null | undefined; children?: ReactNode; className?: string }) {
  const href = safeHref(url)
  if (!href) return <span className="break-all">{children ?? url ?? '—'}</span>
  return <a className={className} href={href} target="_blank" rel={EXTERNAL_REL}>{children ?? url}</a>
}
