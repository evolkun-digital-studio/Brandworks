import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, Copy, FileText, Mail, MessageCircle, Phone, RefreshCw, ScanSearch, Trash2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Link, useNavigate, useParams } from '../../routing'
import * as siteScanApi from '../api/siteScanAdminApi'
import { ApiError } from '../api/client'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import AdminStatusBadge from '../components/AdminStatusBadge'
import { useConfirm } from '../components/ConfirmDialog'
import FormMessage from '../components/FormMessage'
import { AnalysisBadge, ExternalSiteLink, ScanStatusBadge, ScoreBadge } from '../components/SiteScanParts'
import { useAdminAuth } from '../context/useAdminAuth'
import { usePollWhileVisible } from '../hooks/usePollWhileVisible'
import { exactTime, GROUPS_NOT_FOUND_LABEL } from '../lib/siteScan'
import {
  KEY_PAGE_LABELS,
  type AuthorityData,
  type CollectorResult,
  type CwvCategory,
  type DuplicateText,
  type FieldMetric,
  type KeyPageCheck,
  type KeyPageGroup,
  type OnPageData,
  type PagesData,
  type PerformanceData,
  type SiteScanDetail as ScanDetail,
  type TrafficData,
} from '../../server/site-scan/types'

const TITLE_MAX = 60
const META_MAX = 160

const yesNo = (value: boolean) => (value ? 'Yes' : 'No')
const count = (value: number | null) => (value === null ? '—' : value.toLocaleString())
const seconds = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)} s`)
const millis = (ms: number | null) => (ms === null ? '—' : `${Math.round(ms).toLocaleString()} ms`)

function Warn({ when, note, children }: { when: boolean; note?: string; children: ReactNode }) {
  if (!when) return <>{children}</>
  return (
    <span className="inline-flex items-center gap-1 font-[520] text-a-warning" title={note}>
      <TriangleAlert size={12} className="flex-none" aria-label="Warning" />
      <span>{children}</span>
    </span>
  )
}

function NotAvailable({ reason }: { reason: string }) {
  return <p className="px-5.5 pb-5 text-[13.5px] text-a-ink-2">Not available: {reason}</p>
}

function Section({ title, source, at, children }: { title: string; source?: string; at?: string; children: ReactNode }) {
  return (
    <section className="admin-card overflow-hidden" aria-label={title}>
      <div className="admin-card__head flex-wrap">
        <h2>{title}</h2>
        {(source || at) && <span className="text-xs text-a-ink-2">{[source, at && `fetched ${exactTime(at)}`].filter(Boolean).join(' · ')}</span>}
      </div>
      {children}
    </section>
  )
}

function CollectorSection<T>({ title, result, whyMissing, children }: { title: string; result: CollectorResult<T> | undefined; whyMissing: string; children: (data: T) => ReactNode }) {
  const ready = result?.status === 'ok' && result.data
  const reason = result?.reason ?? (!result ? whyMissing : result.status === 'error' ? 'the data source failed' : 'not checked')
  return (
    <Section title={title} source={result?.source} at={result?.fetchedAt}>
      {ready ? children(result.data as T) : <NotAvailable reason={reason} />}
    </Section>
  )
}

function Rows({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[minmax(130px,220px)_minmax(0,1fr)] gap-x-4 gap-y-2 px-5.5 pb-5 text-[13.5px]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-a-ink-2">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-1.5 text-[13px] font-semibold">{title}</h3>
      {items.length ? <ul className="flex list-disc flex-col gap-1 pl-4.5 text-[13.5px]">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="text-[13.5px] text-a-ink-2">None</p>}
    </div>
  )
}

function AnalysisSection({ scan }: { scan: ScanDetail }) {
  const { analysis } = scan
  return (
    <Section title="AI analysis" source={analysis ? (analysis.ai ? 'AI model' : 'Rule-based report') : undefined} at={analysis ? scan.updatedAt : undefined}>
      {!analysis ? (
        <NotAvailable reason={scan.status === 'running' && !scan.stale ? 'the scan is still running' : scan.error ?? 'no analysis was stored for this scan'} />
      ) : (
        <div className="flex flex-col gap-4 px-5.5 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <AnalysisBadge ai={analysis.ai} />
            {analysis.droppedItems > 0 && <AdminStatusBadge tone="warning" dot={false}>{analysis.droppedItems} AI items removed for citing numbers not in the data</AdminStatusBadge>}
          </div>
          <p className="text-[15px] font-[540]">{analysis.headline}</p>
          <ListBlock title="Strengths" items={analysis.strengths} />
          <div>
            <h3 className="mb-1.5 text-[13px] font-semibold">Issues</h3>
            {analysis.issues.length ? (
              <ul className="flex flex-col gap-2.5 text-[13.5px]">
                {analysis.issues.map((issue) => (
                  <li key={issue.title}>
                    <strong className="font-[540]">{issue.title}</strong>
                    <p className="text-a-ink-2">Evidence: {issue.evidence}</p>
                    <p className="text-a-ink-2">Impact: {issue.impact}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[13.5px] text-a-ink-2">None</p>}
          </div>
          <ListBlock title="Opportunities" items={analysis.opportunities} />
          <div>
            <h3 className="mb-1.5 text-[13px] font-semibold">Customer teaser, as the customer saw it</h3>
            <blockquote className="rounded-a bg-a-fill px-3.5 py-2.5 text-[13.5px]">{analysis.customerTeaser}</blockquote>
          </div>
        </div>
      )}
    </Section>
  )
}

function ContactIcons({ check }: { check: KeyPageCheck }) {
  const { email, phone, whatsapp } = check.contactLinks
  const icons: Array<[string, typeof Mail, boolean]> = [
    ['Contact form', FileText, check.hasForm],
    [`Phone: ${phone.join(', ')}`, Phone, phone.length > 0],
    [`Email: ${email.join(', ')}`, Mail, email.length > 0],
    [`WhatsApp: ${whatsapp.join(', ')}`, MessageCircle, whatsapp.length > 0],
  ]
  const present = icons.filter(([, , has]) => has)
  if (!present.length) return <span className="text-a-ink-3">—</span>
  return (
    <span className="inline-flex items-center gap-1.5">
      {present.map(([label, Icon]) => <span key={label} title={label}><Icon size={14} aria-hidden="true" /><span className="sr-only">{label}</span></span>)}
    </span>
  )
}

function PageRow({ group, url, statusCode, error, check }: { group: string; url: string; statusCode: number | null; error: string | null; check: KeyPageCheck | null }) {
  const lead = (
    <>
      <td className="whitespace-nowrap">{group}</td>
      <td className="max-w-60"><ExternalSiteLink url={url} /></td>
      <td className="tabular-nums">{statusCode ?? '—'}</td>
    </>
  )
  if (!check) return <tr>{lead}<td colSpan={10} className="text-a-danger">{error ?? 'This page couldn’t be read.'}</td></tr>
  const emptyHtml = check.wordCount === 0 ? 'No words in the HTML: probably rendered by JavaScript, so this may not reflect what visitors see.' : undefined
  return (
    <tr className="align-top">
      {lead}
      <td className="min-w-48">
        <span className="block">{check.title.text ?? <Warn when>Missing</Warn>}</span>
        {check.title.text && <span className="text-xs text-a-ink-2"><Warn when={check.title.length > TITLE_MAX}>{check.title.length} chars</Warn></span>}
      </td>
      <td className="min-w-56">
        <span className="block">{check.metaDescription.text ?? <Warn when>Missing</Warn>}</span>
        {check.metaDescription.text && <span className="text-xs text-a-ink-2"><Warn when={check.metaDescription.length > META_MAX}>{check.metaDescription.length} chars</Warn></span>}
      </td>
      <td className="tabular-nums"><Warn when={check.h1Count !== 1} note={emptyHtml}>{check.h1Count}</Warn></td>
      <td><Warn when={check.noindex}>{yesNo(check.noindex)}</Warn></td>
      <td className="max-w-48 break-all">{check.canonical ?? '—'}</td>
      <td className="whitespace-nowrap tabular-nums" title={emptyHtml}>{check.wordCount.toLocaleString()} <span className="text-xs text-a-ink-2">in HTML</span></td>
      <td className="whitespace-nowrap tabular-nums">{check.images.total} / <Warn when={check.images.missingAlt > 0}>{check.images.missingAlt}</Warn></td>
      <td><ContactIcons check={check} /></td>
      <td className="min-w-40 text-xs">{check.ctaTexts.length ? check.ctaTexts.join(' · ') : '—'}</td>
    </tr>
  )
}

function Duplicates({ title, items }: { title: string; items: DuplicateText[] }) {
  return (
    <div>
      <h3 className="mb-1.5 text-[13px] font-semibold">{title}</h3>
      {items.length ? (
        <ul className="flex flex-col gap-2 text-[13.5px]">
          {items.map((item) => (
            <li key={item.text}>
              <p>{item.text}</p>
              <ul className="flex flex-col text-xs">{item.urls.map((url) => <li key={url}><ExternalSiteLink url={url} /></li>)}</ul>
            </li>
          ))}
        </ul>
      ) : <p className="text-[13.5px] text-a-ink-2">None</p>}
    </div>
  )
}

const groupNames = (groups: KeyPageGroup[]) => (groups.length ? groups.map((group) => KEY_PAGE_LABELS[group]).join(', ') : 'None')

function KeyPages({ data }: { data: PagesData }) {
  const { summary, homepage, pages } = data
  const contact = summary.contactMethods
  const contactFound = [contact.form && 'Form', contact.phone && 'Phone', contact.email && 'Email', contact.whatsapp && 'WhatsApp'].filter(Boolean).join(', ') || 'None found'
  return (
    <div className="flex flex-col gap-4 pb-5">
      <div className="flex flex-wrap gap-2 px-5.5">
        <AdminStatusBadge dot={false}>{summary.pagesCrawled} pages crawled</AdminStatusBadge>
        <AdminStatusBadge tone={summary.pagesFailed ? 'warning' : 'neutral'} dot={false}>{summary.pagesFailed} failed</AdminStatusBadge>
        <AdminStatusBadge tone={summary.truncated ? 'warning' : 'neutral'} dot={false}>Budget hit: {yesNo(summary.truncated)}</AdminStatusBadge>
        <AdminStatusBadge dot={false}>Contact methods: {contactFound}</AdminStatusBadge>
      </div>
      {summary.note && <p className="px-5.5 text-[13px] text-a-ink-2">{summary.note}</p>}
      <Rows rows={[
        ['Groups found', groupNames(summary.groupsFound)],
        ['Groups not found', summary.groupsNotFound.length ? `${groupNames(summary.groupsNotFound)}. ${GROUPS_NOT_FOUND_LABEL}` : 'None'],
        ['Groups not checked', summary.groupsNotChecked.length ? `${groupNames(summary.groupsNotChecked)}. A candidate existed but wasn’t read` : 'None'],
        ['Blocked by robots.txt', summary.blockedByRobots.length ? summary.blockedByRobots.join(', ') : 'None'],
        ['How pages were found', `${data.discovery.homepageLinks} homepage links, ${data.discovery.sitemapUrls} sitemap URLs`],
      ]} />
      <div className="overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Group</th><th>URL</th><th>Status</th><th>Title</th><th>Meta description</th><th>H1s</th><th>Noindex</th><th>Canonical</th><th>Words</th><th>Images / no alt</th><th>Contact</th><th>CTAs</th>
            </tr>
          </thead>
          <tbody>
            <PageRow group="Homepage" url={homepage.url} statusCode={homepage.statusCode} error={null} check={homepage.check} />
            {pages.map((page) => <PageRow key={`${page.group}-${page.url}`} group={KEY_PAGE_LABELS[page.group]} url={page.finalUrl ?? page.url} statusCode={page.statusCode} error={page.error} check={page.check} />)}
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 px-5.5 md:grid-cols-2">
        <Duplicates title="Duplicate titles" items={summary.duplicateTitles} />
        <Duplicates title="Duplicate meta descriptions" items={summary.duplicateMetaDescriptions} />
      </div>
    </div>
  )
}

const present = (value: boolean | null, problem: string | null = null) => problem ?? (value === null ? 'Couldn’t check' : yesNo(value))

function OnPage({ data }: { data: OnPageData }) {
  const og = Object.entries(data.openGraph)
  return (
    <Rows rows={[
      ['Final URL', <ExternalSiteLink key="final" url={data.finalUrl} />],
      ['Status code', data.statusCode],
      ['Title', <span key="title">{data.title.text ?? <Warn when>Missing</Warn>} <span className="text-xs text-a-ink-2">({data.title.length} chars)</span></span>],
      ['Meta description', <span key="meta">{data.metaDescription.text ?? <Warn when>Missing</Warn>} <span className="text-xs text-a-ink-2">({data.metaDescription.length} chars)</span></span>],
      ['H1s', <Warn key="h1" when={data.h1Count !== 1}>{data.h1Count}</Warn>],
      ['Canonical', data.canonical ?? '—'],
      ['Language', data.lang ?? '—'],
      ['Viewport meta', yesNo(data.viewport)],
      ['Open Graph', og.length ? <ul key="og">{og.map(([key, value]) => <li key={key}><span className="text-a-ink-2">{key}:</span> {value}</li>)}</ul> : 'None'],
      ['JSON-LD types', data.jsonLdTypes.length ? data.jsonLdTypes.join(', ') : 'None'],
      ['Robots meta', data.robotsMeta ?? '—'],
      ['Noindex', <Warn key="noindex" when={data.noindex}>{yesNo(data.noindex)}</Warn>],
      ['robots.txt', present(data.robotsTxt, data.robotsTxtProblem)],
      ['sitemap.xml', present(data.sitemapXml, data.sitemapXmlProblem)],
      ['Sitemap in robots.txt', present(data.sitemapInRobotsTxt)],
      ['HTTPS', <Warn key="https" when={!data.https}>{yesNo(data.https)}</Warn>],
      ['Response time', `${data.responseTimeMs.toLocaleString()} ms (HTML only, not page speed)`],
      ['Redirects', data.redirects],
      ['Word count', `${data.wordCount.toLocaleString()} in HTML`],
      ['Images', `${data.images.total} total, ${data.images.missingAlt} missing alt`],
      ['HTML truncated', yesNo(data.htmlTruncated)],
      ['Platform', data.platform ?? 'Not detected'],
    ]} />
  )
}

const CWV_LABELS: Record<CwvCategory, string> = { good: 'Good', 'needs-improvement': 'Needs improvement', poor: 'Poor' }
const CWV_TONES = { good: 'success', 'needs-improvement': 'warning', poor: 'danger' } as const

function Cwv({ category }: { category: CwvCategory | null }) {
  return category ? <AdminStatusBadge tone={CWV_TONES[category]} dot={false}>{CWV_LABELS[category]}</AdminStatusBadge> : null
}

function fieldMetric(metric: FieldMetric | null, format: (value: number) => string): ReactNode {
  return metric ? <span className="inline-flex flex-wrap items-center gap-2">{format(metric.value)} <Cwv category={metric.category} /></span> : '—'
}

function Performance({ data }: { data: PerformanceData }) {
  const scores: Array<[string, number | null]> = [['Performance', data.scores.performance], ['SEO', data.scores.seo], ['Accessibility', data.scores.accessibility], ['Best practices', data.scores.bestPractices]]
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-5 px-5.5">
        {scores.map(([label, score]) => (
          <div key={label} className="flex flex-col items-start gap-1 text-[13px]">
            <span className="text-a-ink-2">{label}</span>
            {score === null ? <span className="text-a-ink-3">—</span> : <ScoreBadge score={score} />}
          </div>
        ))}
      </div>
      <div>
        <h3 className="mb-2 px-5.5 text-[13px] font-semibold">Lab test (mobile)</h3>
        <Rows rows={[
          ['LCP', seconds(data.lab.lcpMs)],
          ['FCP', seconds(data.lab.fcpMs)],
          ['TBT', millis(data.lab.tbtMs)],
          ['CLS', data.lab.cls ?? '—'],
          ['Speed Index', seconds(data.lab.speedIndexMs)],
        ]} />
      </div>
      {data.field && (
        <div>
          <h3 className="mb-2 px-5.5 text-[13px] font-semibold">Real users ({data.field.scope === 'url' ? 'this URL' : 'whole origin'})</h3>
          <Rows rows={[
            ['Overall', data.field.overall ? <Cwv key="overall" category={data.field.overall} /> : '—'],
            ['LCP', fieldMetric(data.field.lcpMs, (value) => seconds(value))],
            ['INP', fieldMetric(data.field.inpMs, (value) => millis(value))],
            ['CLS', fieldMetric(data.field.cls, String)],
          ]} />
        </div>
      )}
    </div>
  )
}

function Authority({ data }: { data: AuthorityData }) {
  return data.provider === 'moz' ? (
    <Rows rows={[
      ['Domain Authority (DA)', count(data.domainAuthority)],
      ['Page Authority', count(data.pageAuthority)],
      ['Spam Score', count(data.spamScore)],
      ['Linking root domains', count(data.linkingRootDomains)],
      ['External links', count(data.externalLinks)],
    ]} />
  ) : (
    <Rows rows={[
      ['Domain Rank /1000', count(data.domainRank)],
      ['Backlinks', count(data.backlinks)],
      ['Referring domains', count(data.referringDomains)],
      ['Referring main domains', count(data.referringMainDomains)],
      ['Broken backlinks', count(data.brokenBacklinks)],
      ['Backlinks spam score', count(data.backlinksSpamScore)],
    ]} />
  )
}

function Traffic({ data }: { data: TrafficData }) {
  return (
    <>
      <p className="px-5.5 pb-3 text-[13px] text-a-ink-2">Estimate from DataForSEO, not analytics.</p>
      <Rows rows={[
        ['Estimated organic traffic', `${count(data.estimatedOrganicTraffic)} / month`],
        ['Ranking keywords', count(data.rankingKeywords)],
        ['Location', data.location],
        ['Language', data.languageCode],
      ]} />
    </>
  )
}

function Submissions({ scan }: { scan: ScanDetail }) {
  if (!scan.submissions.length) return <p className="px-5.5 pb-5 text-[13.5px] text-a-ink-2">No questionnaire submission has used this scan yet.</p>
  return (
    <div className="overflow-x-auto">
      <table className="admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Branch</th><th>Submitted</th></tr></thead>
        <tbody>
          {scan.submissions.map((submission) => (
            <tr key={submission.id}>
              <td>{submission.name || '—'}</td>
              <td className="break-all">{submission.email || '—'}</td>
              <td>{submission.company || '—'}</td>
              <td>{submission.branch}</td>
              <td className="whitespace-nowrap text-a-ink-2">{exactTime(submission.submittedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RawJson({ results }: { results: ScanDetail['results'] }) {
  const text = JSON.stringify(results, null, 2)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Raw JSON copied.')
    } catch {
      toast.error('Could not copy. Select the text instead.')
    }
  }
  return (
    <section className="admin-card overflow-hidden">
      <details>
        <summary className="cursor-pointer px-5.5 py-4 text-[15px] font-semibold tracking-[-0.012em]">Raw JSON</summary>
        <div className="flex flex-col items-start gap-3 px-5.5 pb-5">
          <AdminButton size="sm" onClick={() => void copy()} icon={<Copy size={12} aria-hidden="true" />}>Copy</AdminButton>
          <pre className="max-h-120 w-full overflow-auto rounded-a bg-a-fill p-3.5 text-xs">{text}</pre>
        </div>
      </details>
    </section>
  )
}

function SiteScanDetail() {
  const { id } = useParams<{ id: string }>()
  const { admin } = useAdminAuth()
  const navigate = useNavigate()
  const isAdmin = admin?.role === 'admin'
  const [scan, setScan] = useState<ScanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { confirm, dialog } = useConfirm()
  const latestRequest = useRef(0)

  const load = useCallback(() => {
    if (!id) return Promise.resolve()
    const request = ++latestRequest.current
    return siteScanApi.getSiteScan(id)
      .then((next) => {
        if (request !== latestRequest.current) return
        setScan(next.scan)
        setError(null)
      })
      .catch((err: unknown) => {
        if (request !== latestRequest.current) return
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) setNotFound(true)
        else setError(err instanceof ApiError ? err.message : 'Could not load this scan.')
      })
      .finally(() => {
        if (request === latestRequest.current) setLoading(false)
      })
  }, [id])

  useEffect(() => { void load() }, [load])

  const running = scan?.status === 'running' && !scan.stale
  usePollWhileVisible(running, () => { void load() })

  async function rescan() {
    if (!id) return
    setBusy(true)
    setError(null)
    try {
      await siteScanApi.rescanSiteScan(id)
      toast.success('Rescan started. Paid data stays as it was.')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the rescan.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!id || !scan) return
    const ok = await confirm({
      title: `Delete the scan of ${scan.domain}?`,
      message: 'Questionnaire submissions keep their own copy. The next person to enter this domain starts a new scan, which bills the paid data sources again.',
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      await siteScanApi.deleteSiteScan(id)
      toast.success('Scan deleted.')
      navigate('/admin/site-scans')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete this scan.')
      setBusy(false)
    }
  }

  const back = <Link to="/admin/site-scans" className="admin-button"><ArrowLeft size={14} aria-hidden="true" /> Back</Link>

  if (notFound) {
    return (
      <div className="admin-card admin-empty-state">
        <span className="admin-empty-state__icon"><ScanSearch size={20} strokeWidth={1.6} aria-hidden="true" /></span>
        <p className="admin-empty-state__title">Scan not found</p>
        <p className="admin-empty-state__description">It may have been deleted, or removed automatically after 8 days.</p>
        {back}
      </div>
    )
  }

  if (!scan) {
    return (
      <div className="flex flex-col gap-4">
        {error ? <><FormMessage type="error">{error}</FormMessage><div>{back}</div></> : loading && <div className="flex flex-col gap-4" aria-busy="true"><span className="admin-skeleton h-24 rounded-a-lg" /><span className="admin-skeleton h-60 rounded-a-lg" /></div>}
      </div>
    )
  }

  const results = scan.results
  const stillRunning = running ? 'the scan is still running' : 'this scan stopped before it got here'

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title={scan.domain}
        actions={
          <>
            {back}
            {isAdmin && <AdminButton disabled={busy || running} onClick={() => void rescan()} icon={<RefreshCw size={14} className={running ? 'animate-spin' : ''} aria-hidden="true" />}>Rescan free checks</AdminButton>}
            {isAdmin && <AdminButton variant="danger" disabled={busy} onClick={() => void remove()} icon={<Trash2 size={14} aria-hidden="true" />}>Delete</AdminButton>}
          </>
        }
      />
      {error && <FormMessage type="error">{error}</FormMessage>}
      {scan.error && <FormMessage type="error">{scan.error}</FormMessage>}

      <section className="admin-card overflow-hidden pt-5" aria-label="Scan details">
        <Rows rows={[
          ['Status', <ScanStatusBadge key="status" status={scan.status} stale={scan.stale} error={scan.error} />],
          ['Final URL', <ExternalSiteLink key="url" url={results?.onPage?.data?.finalUrl ?? scan.url} />],
          ['Created', exactTime(scan.createdAt)],
          ['Updated', exactTime(scan.updatedAt)],
          ['Cached until', exactTime(scan.cachedUntil)],
          ['Removed automatically', exactTime(scan.expiresAt)],
          ['Paid sources used', yesNo(scan.paidSources)],
        ]} />
      </section>

      <AnalysisSection scan={scan} />
      <CollectorSection title="Key pages" result={results?.pages} whyMissing={scan.status === 'done' ? 'this scan was stored before the key-page crawl existed' : stillRunning}>
        {(data) => <KeyPages data={data} />}
      </CollectorSection>
      <CollectorSection title="Homepage on-page check" result={results?.onPage} whyMissing={stillRunning}>
        {(data) => <OnPage data={data} />}
      </CollectorSection>
      <CollectorSection title="Performance (PageSpeed, mobile)" result={results?.performance} whyMissing={stillRunning}>
        {(data) => <Performance data={data} />}
      </CollectorSection>
      <CollectorSection title="Authority" result={results?.authority} whyMissing={stillRunning}>
        {(data) => <Authority data={data} />}
      </CollectorSection>
      <CollectorSection title="Traffic" result={results?.traffic} whyMissing={stillRunning}>
        {(data) => <Traffic data={data} />}
      </CollectorSection>
      <Section title="Linked questionnaire submissions">
        <Submissions scan={scan} />
      </Section>
      {isAdmin && <RawJson results={results} />}
      {dialog}
    </div>
  )
}

export default SiteScanDetail
