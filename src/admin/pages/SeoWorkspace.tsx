import { ExternalLink, Link2, RefreshCw, SearchCheck, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from '../../routing'
import * as seoApi from '../api/seoAdminApi'
import { ApiError } from '../api/client'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import AdminStatusBadge from '../components/AdminStatusBadge'
import FormField from '../components/FormField'
import FormMessage from '../components/FormMessage'
import { useAdminAuth } from '../context/useAdminAuth'

function errorMessage(error: unknown) { return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.' }
function scoreTone(score: number) { return score >= 80 ? 'success' as const : score >= 60 ? 'warning' as const : 'danger' as const }

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <div className="admin-dashboard__metric"><div className="admin-dashboard__metric-label">{label}</div><div className="admin-dashboard__metric-value">{value}</div><div className="admin-dashboard__metric-detail">{detail}</div></div>
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
  const [notice, setNotice] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try { const [nextOverview, nextRedirects] = await Promise.all([seoApi.getSeoOverview(), seoApi.listRedirects()]); setOverview(nextOverview); setRedirects(nextRedirects.redirects) }
    catch (err) { setError(errorMessage(err)) } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  async function addRedirect(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null)
    try { const result = await seoApi.createRedirect(fromSlug.trim(), toSlug.trim()); setRedirects((current) => [{ ...result.redirect, createdAt: new Date().toISOString() }, ...current.filter((item) => item.fromSlug !== result.redirect.fromSlug)]); setFromSlug(''); setToSlug(''); setNotice('Redirect saved.') }
    catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  async function removeRedirect(redirect: seoApi.RedirectRecord) {
    if (!window.confirm(`Remove the redirect from “${redirect.fromSlug}”?`)) return
    setBusy(true); setError(null)
    try { await seoApi.deleteRedirect(redirect.fromSlug); setRedirects((current) => current.filter((item) => item.fromSlug !== redirect.fromSlug)); setNotice('Redirect removed.') }
    catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  const reportReady = overview?.analytics.ga4.reportingConfigured || overview?.analytics.searchConsole.reportingConfigured

  return <div>
    <AdminPageHeader eyebrow="Search operations" title="SEO workspace" description="Review technical discoverability and editorial structure from data the CMS can actually verify." actions={<AdminButton variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} aria-hidden="true" /> Refresh audit</AdminButton>} />
    {error && <div className="mb-4"><FormMessage type="error">{error}</FormMessage></div>}
    {notice && <div className="admin-library-notice" role="status">{notice}</div>}
    {loading && <div className="admin-empty-state"><p className="admin-empty-state__title">Running site audit</p><p className="admin-empty-state__description">Checking article metadata, links, images, sitemap output, and integrations.</p></div>}
    {!loading && overview && <>
      <section className="admin-dashboard__metrics" aria-label="SEO overview">
        <Metric label="Articles audited" value={overview.totals.articles} detail={`${overview.totals.published} published · ${overview.totals.drafts} drafts`} />
        <Metric label="Metadata attention" value={overview.totals.metadataAttention} detail="Articles with title/meta warnings" />
        <Metric label="AEO/GEO attention" value={overview.totals.structuredContentAttention} detail="Editorial structure guidance" />
        <Metric label="Sitemap URLs" value={overview.sitemap.status === 'healthy' ? overview.sitemap.urlCount : '—'} detail={overview.sitemap.status === 'healthy' ? 'Generated successfully' : 'Unavailable'} />
      </section>

      <section className="admin-surface mt-4 overflow-hidden" aria-labelledby="article-audit-heading"><div className="admin-section-heading"><div><p className="admin-eyebrow">Editorial guidance</p><h2 id="article-audit-heading" className="text-[17px] font-semibold text-neutral-900">Article readiness</h2></div><span className="text-[12px] text-neutral-500">Internal guidance, not Google ranking scores</span></div>
        {overview.audits.length === 0 ? <div className="admin-empty-state"><p className="admin-empty-state__title">No articles to audit</p></div> : <div className="admin-seo-audit-list">{overview.audits.map((audit) => <div key={audit.id} className="admin-seo-audit-row"><div className="min-w-0"><Link to={`/admin/blogs/${audit.id}/edit`} className="admin-seo-audit-row__title">{audit.title || 'Untitled article'} <ExternalLink size={13} aria-hidden="true" /></Link><p>/{audit.slug} · {audit.status}</p></div><div className="admin-seo-scores"><AdminStatusBadge tone={scoreTone(audit.seoScore)}>SEO {audit.seoScore}</AdminStatusBadge><AdminStatusBadge tone={scoreTone(audit.aeoScore)}>AEO {audit.aeoScore}</AdminStatusBadge><AdminStatusBadge tone={scoreTone(audit.geoScore)}>GEO {audit.geoScore}</AdminStatusBadge></div><span className="admin-seo-audit-row__attention">{audit.attention.length ? `${audit.attention.length} item${audit.attention.length === 1 ? '' : 's'} to review` : 'Looks complete'}</span></div>)}</div>}
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-2"><section className="admin-surface overflow-hidden" aria-labelledby="link-audit-heading"><div className="admin-section-heading"><div><p className="admin-eyebrow">Technical SEO</p><h2 id="link-audit-heading" className="text-[17px] font-semibold text-neutral-900">Internal link findings</h2></div><Link2 size={18} className="text-neutral-400" aria-hidden="true" /></div>{overview.brokenInternalLinks.length ? <ul className="admin-seo-findings">{overview.brokenInternalLinks.slice(0, 20).map((item, index) => <li key={`${item.articleId}-${item.url}-${index}`}><strong>{item.articleTitle}</strong><span>{item.url}</span></li>)}</ul> : <p className="admin-seo-empty-note">No broken internal paths detected in stored Markdown.</p>}</section><section className="admin-surface overflow-hidden" aria-labelledby="image-audit-heading"><div className="admin-section-heading"><div><p className="admin-eyebrow">Technical SEO</p><h2 id="image-audit-heading" className="text-[17px] font-semibold text-neutral-900">Image findings</h2></div><SearchCheck size={18} className="text-neutral-400" aria-hidden="true" /></div>{overview.imageIssues.length ? <ul className="admin-seo-findings">{overview.imageIssues.slice(0, 20).map((item, index) => <li key={`${item.articleId}-${item.kind}-${index}`}><strong>{item.articleTitle}</strong><span>{item.kind}: {item.value}</span></li>)}</ul> : <p className="admin-seo-empty-note">No malformed or missing image metadata detected.</p>}</section></div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2"><section className="admin-surface" aria-labelledby="sitemap-heading"><div className="admin-section-heading"><div><p className="admin-eyebrow">Indexing</p><h2 id="sitemap-heading" className="text-[17px] font-semibold text-neutral-900">Sitemap monitoring</h2></div><AdminStatusBadge tone={overview.sitemap.status === 'healthy' ? 'success' : 'danger'}>{overview.sitemap.status === 'healthy' ? 'Healthy' : 'Unavailable'}</AdminStatusBadge></div><p className="admin-seo-empty-note">{overview.sitemap.status === 'healthy' ? `${overview.sitemap.urlCount} URLs generated at ${new Date(overview.sitemap.checkedAt).toLocaleString()}.` : overview.sitemap.error}</p><a className="admin-button admin-button--secondary mt-4 inline-flex" href={overview.sitemap.url} target="_blank" rel="noreferrer">Open sitemap <ExternalLink size={14} aria-hidden="true" /></a></section><section className="admin-surface" aria-labelledby="analytics-heading"><div className="admin-section-heading"><div><p className="admin-eyebrow">Analytics</p><h2 id="analytics-heading" className="text-[17px] font-semibold text-neutral-900">Real data connections</h2></div><AdminStatusBadge tone={reportReady ? 'success' : 'neutral'}>{reportReady ? 'Configured' : 'Not connected'}</AdminStatusBadge></div><p className="admin-seo-empty-note">{overview.analytics.note}</p><div className="admin-seo-connection-list"><span>GA4 measurement ID <b>{overview.analytics.ga4.measurementConfigured ? 'Configured' : 'Not configured'}</b></span><span>GA4 reporting credentials <b>{overview.analytics.ga4.reportingConfigured ? 'Configured' : 'Not configured'}</b></span><span>Search Console reporting <b>{overview.analytics.searchConsole.reportingConfigured ? 'Configured' : 'Not configured'}</b></span></div></section></div>
    </>}

    <section className="admin-surface mt-4" aria-labelledby="redirect-heading"><div className="admin-section-heading"><div><p className="admin-eyebrow">Redirect manager</p><h2 id="redirect-heading" className="text-[17px] font-semibold text-neutral-900">Blog slug redirects</h2><p className="admin-seo-empty-note">Only published article destinations are accepted. Existing slug changes are recorded automatically.</p></div></div><form className="admin-seo-redirect-form" onSubmit={(event) => void addRedirect(event)}><FormField id="redirect-from" label="From slug" required placeholder="old-article" value={fromSlug} onChange={(event) => setFromSlug(event.target.value)} /><FormField id="redirect-to" label="To published slug" required placeholder="new-article" value={toSlug} onChange={(event) => setToSlug(event.target.value)} /><AdminButton type="submit" variant="primary" disabled={busy || admin?.role !== 'admin'}>Add redirect</AdminButton></form>{redirects.length > 0 && <div className="admin-seo-redirect-list">{redirects.map((redirect) => <div key={redirect.fromSlug} className="admin-seo-redirect-row"><span>/blog/{redirect.fromSlug}</span><b>→</b><span>/blog/{redirect.toSlug}</span>{admin?.role === 'admin' && <AdminButton variant="quiet" aria-label={`Remove redirect from ${redirect.fromSlug}`} onClick={() => void removeRedirect(redirect)}><Trash2 size={14} aria-hidden="true" /></AdminButton>}</div>)}</div>}</section>
  </div>
}

export default SeoWorkspace
