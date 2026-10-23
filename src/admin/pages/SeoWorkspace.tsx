import { CheckCircle2, ExternalLink, Link2, RefreshCw, SearchCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from '../../routing'
import * as seoApi from '../api/seoAdminApi'
import { ApiError } from '../api/client'
import AdminButton from '../components/AdminButton'
import AdminIconButton from '../components/AdminIconButton'
import AdminPageHeader from '../components/AdminPageHeader'
import AdminStatusBadge from '../components/AdminStatusBadge'
import FormField from '../components/FormField'
import FormMessage from '../components/FormMessage'
import { useConfirm } from '../components/ConfirmDialog'
import { useAdminAuth } from '../context/useAdminAuth'

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'
}

function scoreTone(score: number) {
  return score >= 80 ? 'success' as const : score >= 60 ? 'warning' as const : 'danger' as const
}

function formatAuditTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not available' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function Stat({ label, value, caption }: { label: string; value: string | number; caption: string }) {
  return (
    <div className="flex flex-col gap-1 px-6 py-5 max-sm:px-4 max-sm:py-4">
      <span className="text-[13px] font-medium text-a-ink-2">{label}</span>
      <span className="text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{value}</span>
      <span className="text-xs text-a-ink-2">{caption}</span>
    </div>
  )
}

function Card({ title, aside, children, id }: { title: string; aside?: ReactNode; children: ReactNode; id: string }) {
  return (
    <section className="admin-card overflow-hidden" aria-labelledby={id}>
      <div className="admin-card__head">
        <h2 id={id}>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p className="px-5.5 pb-5 text-[13px] leading-snug text-a-ink-2">{children}</p>
}

function SeoWorkspace() {
  const { admin } = useAdminAuth()
  const [overview, setOverview] = useState<seoApi.SeoOverview | null>(null)
  const [redirects, setRedirects] = useState<seoApi.RedirectRecord[]>([])
  const [fromSlug, setFromSlug] = useState('')
  const [toSlug, setToSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [auditFilter, setAuditFilter] = useState<'attention' | 'all'>('attention')
  const { confirm, dialog } = useConfirm()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [nextOverview, nextRedirects] = await Promise.all([seoApi.getSeoOverview(), seoApi.listRedirects()])
      setOverview(nextOverview)
      setRedirects(nextRedirects.redirects)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function addRedirect(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await seoApi.createRedirect(fromSlug.trim(), toSlug.trim())
      setRedirects((current) => [{ ...result.redirect, createdAt: new Date().toISOString() }, ...current.filter((item) => item.fromSlug !== result.redirect.fromSlug)])
      setFromSlug('')
      setToSlug('')
      toast.success('Redirect saved.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function removeRedirect(redirect: seoApi.RedirectRecord) {
    const ok = await confirm({ title: `Remove the redirect from “${redirect.fromSlug}”?`, confirmLabel: 'Remove', tone: 'danger' })
    if (!ok) return
    setBusy(true)
    try {
      await seoApi.deleteRedirect(redirect.fromSlug)
      setRedirects((current) => current.filter((item) => item.fromSlug !== redirect.fromSlug))
      toast.success('Redirect removed.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const reportReady = overview?.analytics.ga4.reportingConfigured || overview?.analytics.searchConsole.reportingConfigured
  const attentionCount = (overview?.totals.metadataAttention ?? 0) + (overview?.totals.structuredContentAttention ?? 0) + (overview?.brokenInternalLinks.length ?? 0) + (overview?.imageIssues.length ?? 0)
  const attentionAudits = overview?.audits.filter((audit) => audit.attention.length > 0) ?? []
  const auditsToShow = auditFilter === 'attention' ? attentionAudits : overview?.audits ?? []

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="SEO"
        description="How discoverable your articles are, based on what the CMS can actually verify."
        actions={<AdminButton onClick={() => void load()} disabled={loading} icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />}>Run audit</AdminButton>}
      />
      {error && <FormMessage type="error">{error}</FormMessage>}

      {loading && !overview && (
        <div className="flex flex-col gap-4" aria-busy="true"><span className="admin-skeleton h-28 rounded-a-lg" /><span className="admin-skeleton h-64 rounded-a-lg" /></div>
      )}

      {overview && (
        <>
          <section className="admin-card grid grid-cols-4 overflow-hidden max-md:grid-cols-2 [&>*]:border-l [&>*]:border-a-line [&>*:first-child]:border-l-0 max-md:[&>*:nth-child(odd)]:border-l-0 max-md:[&>*:nth-child(n+3)]:border-t" aria-label="SEO overview">
            <Stat label="Articles audited" value={overview.totals.articles} caption={`${overview.totals.published} published · ${overview.totals.drafts} drafts`} />
            <Stat label="Metadata" value={overview.totals.metadataAttention} caption="Need a title or description" />
            <Stat label="Structure" value={overview.totals.structuredContentAttention} caption="AEO / GEO suggestions" />
            <Stat label="Sitemap URLs" value={overview.sitemap.status === 'healthy' ? overview.sitemap.urlCount : '—'} caption={overview.sitemap.status === 'healthy' ? 'Generated successfully' : 'Unavailable'} />
          </section>

          <section className="admin-card flex flex-wrap items-center justify-between gap-4 px-6 py-5" aria-label="Health summary">
            <div className="flex items-center gap-4">
              <span className={`grid size-11 flex-none place-items-center rounded-[13px] ${attentionCount === 0 ? 'bg-a-success-soft text-a-success' : 'bg-a-warning-soft text-a-warning'}`}>
                {attentionCount === 0 ? <CheckCircle2 size={22} strokeWidth={1.8} aria-hidden="true" /> : <SearchCheck size={22} strokeWidth={1.8} aria-hidden="true" />}
              </span>
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.016em]">
                  {attentionCount === 0 ? 'Everything looks good' : attentionCount < 4 ? 'A few things to review' : 'Some work to do'}
                </h2>
                <p className="text-[13px] text-a-ink-2">
                  {attentionCount === 0 ? 'No stored findings need your attention.' : `${attentionCount} finding${attentionCount === 1 ? '' : 's'} below.`} Last checked {formatAuditTime(overview.generatedAt)}.
                </p>
              </div>
            </div>
          </section>

          <Card
            id="article-audit-heading"
            title="Article readiness"
            aside={
              <div className="admin-segmented-control" role="group" aria-label="Filter article audit results">
                <button type="button" aria-pressed={auditFilter === 'attention'} onClick={() => setAuditFilter('attention')}>Needs attention</button>
                <button type="button" aria-pressed={auditFilter === 'all'} onClick={() => setAuditFilter('all')}>All</button>
              </div>
            }
          >
            {overview.audits.length === 0 ? (
              <div className="admin-empty-state"><p className="admin-empty-state__title">No articles to audit</p></div>
            ) : auditsToShow.length === 0 ? (
              <div className="admin-empty-state">
                <span className="admin-empty-state__icon text-a-success"><CheckCircle2 size={20} strokeWidth={1.7} aria-hidden="true" /></span>
                <p className="admin-empty-state__title">All articles are ready</p>
                <p className="admin-empty-state__description">There are no SEO, AEO or GEO findings to review.</p>
              </div>
            ) : (
              <div className="admin-list">
                {auditsToShow.map((audit) => (
                  <Link key={audit.id} to={`/admin/blogs/${audit.id}/edit`} className="admin-list-row flex-wrap">
                    <span className="admin-list-row__main">
                      <span className="admin-list-row__title">{audit.title || 'Untitled article'}</span>
                      <span className="admin-list-row__sub">/{audit.slug} · {audit.status}{audit.attention.length ? ` · ${audit.attention.length} to review` : ''}</span>
                    </span>
                    <span className="flex gap-1.5">
                      <AdminStatusBadge tone={scoreTone(audit.seoScore)}>SEO {audit.seoScore}</AdminStatusBadge>
                      <AdminStatusBadge tone={scoreTone(audit.aeoScore)}>AEO {audit.aeoScore}</AdminStatusBadge>
                      <AdminStatusBadge tone={scoreTone(audit.geoScore)}>GEO {audit.geoScore}</AdminStatusBadge>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <div className="grid items-start gap-5 xl:grid-cols-2">
            <Card id="link-audit-heading" title="Internal links" aside={<Link2 size={17} className="text-a-ink-3" aria-hidden="true" />}>
              {overview.brokenInternalLinks.length ? (
                <ul className="admin-list m-0 list-none p-0">
                  {overview.brokenInternalLinks.slice(0, 20).map((item, index) => (
                    <li key={`${item.articleId}-${item.url}-${index}`} className="admin-list-row min-h-13 flex-col items-start justify-center gap-0">
                      <strong className="text-[13.5px] font-semibold">{item.articleTitle}</strong>
                      <span className="text-xs break-all text-a-ink-2">{item.url}</span>
                    </li>
                  ))}
                </ul>
              ) : <Note>No broken internal links found.</Note>}
            </Card>
            <Card id="image-audit-heading" title="Images" aside={<SearchCheck size={17} className="text-a-ink-3" aria-hidden="true" />}>
              {overview.imageIssues.length ? (
                <ul className="admin-list m-0 list-none p-0">
                  {overview.imageIssues.slice(0, 20).map((item, index) => (
                    <li key={`${item.articleId}-${item.kind}-${index}`} className="admin-list-row min-h-13 flex-col items-start justify-center gap-0">
                      <strong className="text-[13.5px] font-semibold">{item.articleTitle}</strong>
                      <span className="text-xs break-all text-a-ink-2">{item.kind}: {item.value}</span>
                    </li>
                  ))}
                </ul>
              ) : <Note>No missing or malformed image details found.</Note>}
            </Card>
          </div>

          <div className="grid items-start gap-5 xl:grid-cols-2">
            <Card id="sitemap-heading" title="Sitemap" aside={<AdminStatusBadge tone={overview.sitemap.status === 'healthy' ? 'success' : 'danger'}>{overview.sitemap.status === 'healthy' ? 'Healthy' : 'Unavailable'}</AdminStatusBadge>}>
              <Note>{overview.sitemap.status === 'healthy' ? `${overview.sitemap.urlCount} URLs generated at ${new Date(overview.sitemap.checkedAt).toLocaleString()}.` : overview.sitemap.error}</Note>
              <div className="px-5.5 pb-5">
                <a className="admin-button" href={overview.sitemap.url} target="_blank" rel="noreferrer">Open sitemap <ExternalLink size={13} aria-hidden="true" /></a>
              </div>
            </Card>
            <Card id="analytics-heading" title="Analytics" aside={<AdminStatusBadge tone={reportReady ? 'success' : 'neutral'}>{reportReady ? 'Connected' : 'Not connected'}</AdminStatusBadge>}>
              <Note>{overview.analytics.note}</Note>
              <dl className="m-0 px-5.5 pb-5 text-[13px]">
                {([
                  ['GA4 measurement ID', overview.analytics.ga4.measurementConfigured],
                  ['GA4 reporting credentials', overview.analytics.ga4.reportingConfigured],
                  ['Search Console reporting', overview.analytics.searchConsole.reportingConfigured],
                ] as const).map(([label, configured]) => (
                  <div key={label} className="flex items-center justify-between gap-3 border-t border-a-line py-2.5 first:border-t-0">
                    <dt className="text-a-ink-2">{label}</dt>
                    <dd className={`m-0 font-medium ${configured ? 'text-a-success' : 'text-a-ink-3'}`}>{configured ? 'Configured' : 'Not configured'}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        </>
      )}

      <Card id="redirect-heading" title="Redirects" aside={<span className="text-xs text-a-ink-2">{redirects.length} active</span>}>
        <Note>Send visitors from an old article address to a published one. Changing a published slug adds one automatically.</Note>
        <form className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 px-5.5 pb-5 max-md:grid-cols-1" onSubmit={(event) => void addRedirect(event)}>
          <FormField id="redirect-from" label="From" required placeholder="old-article" value={fromSlug} onChange={(event) => setFromSlug(event.target.value)} />
          <FormField id="redirect-to" label="To (published slug)" required placeholder="new-article" value={toSlug} onChange={(event) => setToSlug(event.target.value)} />
          <AdminButton type="submit" variant="primary" disabled={busy || admin?.role !== 'admin'}>Add redirect</AdminButton>
        </form>
        {redirects.length > 0 ? (
          <div className="admin-list">
            {redirects.map((redirect) => (
              <div key={redirect.fromSlug} className="admin-list-row min-h-12 text-[13px]">
                <span className="admin-list-row__main truncate">/blog/{redirect.fromSlug} <span className="px-1.5 text-a-ink-3">→</span> /blog/{redirect.toSlug}</span>
                {admin?.role === 'admin' && <AdminIconButton label={`Remove redirect from ${redirect.fromSlug}`} onClick={() => void removeRedirect(redirect)}><Trash2 size={15} aria-hidden="true" /></AdminIconButton>}
              </div>
            ))}
          </div>
        ) : <p className="border-t border-a-line px-5.5 py-5 text-[13px] text-a-ink-2">No redirects yet.</p>}
      </Card>
      {dialog}
    </div>
  )
}

export default SeoWorkspace
