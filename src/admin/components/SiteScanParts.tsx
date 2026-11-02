import type { ReactNode } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import type { ScanStatus } from '../../server/site-scan/types'
import { EXTERNAL_REL, safeHref, scoreTone, urlLabel } from '../lib/siteScan'
import AdminIconButton from './AdminIconButton'
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
export function ExternalSiteLink({ url, children, className = 'admin-link' }: { url: string | null | undefined; children?: ReactNode; className?: string }) {
  const href = safeHref(url)
  if (!href) return <span>{children ?? url ?? '—'}</span>
  return <a className={className} href={href} target="_blank" rel={EXTERNAL_REL}>{children ?? url}</a>
}

async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    toast.success('URL copied.')
  } catch {
    toast.error('Could not copy the URL.')
  }
}

/**
 * A URL as one short line: a label that truncates, the full address in the
 * tooltip, link and copy button. Pass `home` to name pages by their path.
 */
export function UrlLink({ url, home, copy = true }: { url: string; home?: string | null; copy?: boolean }) {
  const label = urlLabel(url, home)
  const href = safeHref(url)
  const text = 'block max-w-[260px] truncate'
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-0.5 align-middle">
      {href
        ? <a className={`admin-link ${text}`} href={href} target="_blank" rel={EXTERNAL_REL} title={url}>{label}</a>
        : <span className={text} title={url}>{label}</span>}
      {copy && (
        <AdminIconButton label="Copy full URL" className="size-6" onClick={() => void copyUrl(url)}>
          <Copy size={12} aria-hidden="true" />
        </AdminIconButton>
      )}
    </span>
  )
}
