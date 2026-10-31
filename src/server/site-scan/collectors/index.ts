import { domainOf } from '../safeFetch'
import { failed, skipped, type CollectorDeps, type CollectorResult, type ScanResults, type ScanStepKey } from '../types'
import { collectAuthority } from './authority'
import { collectOnPage, ON_PAGE_SOURCE } from './onPage'
import { collectPages, PAGES_SOURCE } from './pages'
import { collectPerformance, PERFORMANCE_SOURCE } from './performance'
import { collectTraffic, TRAFFIC_SOURCE } from './traffic'

const PAID_CAP_REASON = 'Daily scan limit reached: paid data sources skipped'

type CollectOptions = {
  allowPaid: boolean
  deps?: CollectorDeps
  paid?: Pick<ScanResults, 'authority' | 'traffic'>
  /** Earlier free results to keep as they are; any left out are collected. */
  free?: Partial<Pick<ScanResults, 'onPage' | 'pages' | 'performance'>>
  /** Called as EACH collector finishes (in whatever order), so progress can be stored live. */
  onResult?: (step: ScanStepKey, result: CollectorResult<unknown>) => void | Promise<void>
}

/**
 * Runs every collector side by side. One failing (even throwing) never
 * affects the others; paid ones are skipped when the daily cap is reached,
 * or reused as-is when `paid` carries results from an earlier scan.
 */
export async function collectAll(url: URL, options: CollectOptions): Promise<ScanResults> {
  const deps = options.deps ?? {}
  const domain = domainOf(url)
  const paid = <T,>(reused: CollectorResult<T> | undefined, run: () => Promise<CollectorResult<T>>, source: string) =>
    reused ? Promise.resolve(reused) : options.allowPaid ? run() : Promise.resolve(skipped<T>(source, PAID_CAP_REASON, deps))

  // Never rejects: a crash becomes an 'error' result, then progress is reported.
  const settle = async <T,>(step: ScanStepKey, source: string, work: Promise<CollectorResult<T>>): Promise<CollectorResult<T>> => {
    let result: CollectorResult<T>
    try {
      result = await work
    } catch (error) {
      result = failed<T>(source, error instanceof Error ? error.message : 'Collector crashed', deps)
    }
    try {
      await options.onResult?.(step, result as CollectorResult<unknown>)
    } catch (error) {
      console.warn('[site-scan] Could not record progress:', error instanceof Error ? error.message : 'unknown')
    }
    return result
  }

  const free = options.free ?? {}
  const [onPage, pages, performance, authority, traffic] = await Promise.all([
    settle('onPage', ON_PAGE_SOURCE, free.onPage ? Promise.resolve(free.onPage) : collectOnPage(url, deps)),
    settle('pages', PAGES_SOURCE, free.pages ? Promise.resolve(free.pages) : collectPages(url, deps)),
    settle('performance', PERFORMANCE_SOURCE, free.performance ? Promise.resolve(free.performance) : collectPerformance(url, deps)),
    settle('authority', 'Authority', paid(options.paid?.authority, () => collectAuthority(domain, deps), 'Authority')),
    settle('traffic', TRAFFIC_SOURCE, paid(options.paid?.traffic, () => collectTraffic(domain, deps), TRAFFIC_SOURCE)),
  ])
  return { url: url.href, domain, onPage, pages, performance, authority, traffic } as ScanResults
}
