import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronRight, RefreshCw, ScanSearch, Search, X } from 'lucide-react'
import { Link } from '../../routing'
import * as siteScanApi from '../api/siteScanAdminApi'
import { ApiError } from '../api/client'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import FormMessage from '../components/FormMessage'
import { AnalysisBadge, ExternalSiteLink, ScanStatusBadge, ScoreBadge, Unavailable } from '../components/SiteScanParts'
import { usePollWhileVisible } from '../hooks/usePollWhileVisible'
import { authorityLabel, authorityValue, exactTime, relativeTime, unavailableReason } from '../lib/siteScan'
import type { ScanStatus, SiteScanListResult, SiteScanSummary } from '../../server/site-scan/types'

const STATUS_FILTERS: { value: ScanStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'running', label: 'Running' },
  { value: 'done', label: 'Done' },
  { value: 'failed', label: 'Failed' },
]

function ScanRow({ scan }: { scan: SiteScanSummary }) {
  const running = scan.status === 'running' && !scan.stale
  const value = (step: keyof SiteScanSummary['collectors'], node: ReactNode) => node ?? <Unavailable reason={unavailableReason(scan.collectors[step], running)} />
  const authority = scan.authority ? authorityValue(scan.authority) : null
  return (
    <tr>
      <td className="min-w-44"><ExternalSiteLink url={scan.url} className="admin-link font-semibold">{scan.domain}</ExternalSiteLink></td>
      <td><ScanStatusBadge status={scan.status} stale={scan.stale} error={scan.error} /></td>
      <td>{value('performance', scan.performanceScore !== null ? <ScoreBadge score={scan.performanceScore} /> : null)}</td>
      <td>{value('performance', scan.seoScore !== null ? <ScoreBadge score={scan.seoScore} /> : null)}</td>
      <td className="whitespace-nowrap">
        {value('authority', scan.authority && authority !== null
          ? <><span className="tabular-nums">{authority}</span> <span className="text-xs text-a-ink-2">{authorityLabel(scan.authority.provider)}</span></>
          : null)}
      </td>
      <td className="whitespace-nowrap">
        {value('traffic', scan.estimatedTraffic !== null
          ? <><span className="tabular-nums">{scan.estimatedTraffic.toLocaleString()}</span> <span className="text-xs text-a-ink-2">est.</span></>
          : null)}
      </td>
      <td className="whitespace-nowrap">
        {value('pages', scan.pages
          ? <>{scan.pages.groupsFound} found · {scan.pages.groupsNotFound} missing{scan.pages.groupsNotChecked > 0 && <> · {scan.pages.groupsNotChecked} not checked</>}</>
          : null)}
      </td>
      <td className="tabular-nums">{scan.issueCount ?? <Unavailable reason={running ? 'Still running' : 'No analysis on this scan'} />}</td>
      <td>{scan.ai === null ? <Unavailable reason={running ? 'Still running' : 'No analysis on this scan'} /> : <AnalysisBadge ai={scan.ai} />}</td>
      <td className="whitespace-nowrap text-a-ink-2"><time dateTime={scan.updatedAt} title={exactTime(scan.updatedAt)}>{relativeTime(scan.updatedAt)}</time></td>
      <td className="text-right">
        <Link to={`/admin/site-scans/${scan.id}`} className="admin-link whitespace-nowrap">Details <ChevronRight size={14} aria-hidden="true" /></Link>
      </td>
    </tr>
  )
}

function SiteScans() {
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<ScanStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<SiteScanListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const latestRequest = useRef(0)

  const load = useCallback(() => {
    const request = ++latestRequest.current
    return siteScanApi.listSiteScans({ q, status, page })
      .then((next) => {
        if (request !== latestRequest.current) return
        // The last row of the last page was removed: step back rather than show an empty page.
        if (next.items.length === 0 && next.page > 1) {
          setPage(Math.max(next.totalPages, 1))
          return
        }
        setResult(next)
        setError(null)
      })
      .catch((err: unknown) => {
        if (request === latestRequest.current) setError(err instanceof ApiError ? err.message : 'Could not load site scans.')
      })
      .finally(() => {
        if (request === latestRequest.current) setLoading(false)
      })
  }, [q, status, page])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim()
      if (next === q) return
      setQ(next)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput, q])

  // A stalled scan will never finish, so it mustn't keep the page polling.
  const anyRunning = Boolean(result?.items.some((scan) => scan.status === 'running' && !scan.stale))
  usePollWhileVisible(anyRunning, () => { void load() })

  const hasFilters = Boolean(q || status !== 'all')

  function clearFilters() {
    setSearchInput('')
    setQ('')
    setStatus('all')
    setPage(1)
  }

  return (
    <div>
      <AdminPageHeader
        title="Site scans"
        description="Quick-looks run from the /start-project questionnaire, cached per domain for 7 days."
        actions={<AdminButton onClick={() => { setLoading(true); void load() }} disabled={loading} icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />}>Refresh</AdminButton>}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="admin-segmented-control max-w-full overflow-x-auto" role="group" aria-label="Filter scans by status">
          {STATUS_FILTERS.map((filter) => (
            <button key={filter.value} type="button" aria-pressed={status === filter.value} onClick={() => { setStatus(filter.value); setPage(1) }}>{filter.label}</button>
          ))}
        </div>
        <label className="relative block w-full sm:w-[260px]">
          <span className="sr-only">Search scans by domain</span>
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-a-ink-3" aria-hidden="true" />
          <input type="search" placeholder="Search domains" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="admin-input pl-9" />
        </label>
      </div>

      <section className="admin-card overflow-hidden" aria-live="polite">
        {error && <div className="p-5"><FormMessage type="error">{error}</FormMessage></div>}

        {loading && !result && !error && (
          <div className="flex flex-col gap-3 p-5.5" aria-busy="true" aria-label="Loading site scans">
            {[1, 2, 3, 4].map((item) => <span key={item} className="admin-skeleton h-12" />)}
          </div>
        )}

        {result && result.items.length === 0 && (
          <div className="admin-empty-state">
            <span className="admin-empty-state__icon"><ScanSearch size={20} strokeWidth={1.6} aria-hidden="true" /></span>
            <p className="admin-empty-state__title">{hasFilters ? 'No matching scans' : 'No site scans yet'}</p>
            <p className="admin-empty-state__description">{hasFilters ? 'Try a different search, or clear the filters.' : 'Scans appear here after someone enters a website URL in the questionnaire (Redesign or Add features path).'}</p>
            {hasFilters && <AdminButton onClick={clearFilters} icon={<X size={14} aria-hidden="true" />}>Clear filters</AdminButton>}
          </div>
        )}

        {result && result.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Status</th>
                    <th>Performance</th>
                    <th>SEO</th>
                    <th>Authority</th>
                    <th>Est. traffic</th>
                    <th>Key pages</th>
                    <th>Issues</th>
                    <th>Analysis</th>
                    <th>Updated</th>
                    <th className="text-right"><span className="sr-only">Details</span></th>
                  </tr>
                </thead>
                <tbody>{result.items.map((scan) => <ScanRow key={scan.id} scan={scan} />)}</tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-a-line px-5.5 py-3">
              <AdminButton disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</AdminButton>
              <span className="text-xs text-a-ink-2">Page {result.page} of {Math.max(result.totalPages, 1)} · {result.total} scan{result.total === 1 ? '' : 's'}</span>
              <AdminButton disabled={result.page >= result.totalPages} onClick={() => setPage((value) => value + 1)}>Next</AdminButton>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default SiteScans
