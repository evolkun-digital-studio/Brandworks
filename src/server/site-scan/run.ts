import 'server-only'

import type { Answers } from '../../questionnaire/flow'
import { analyseSite } from './analyse'
import { collectAll } from './collectors'
import { beginRun, completeScan, countScansToday, createScan, failScan, findReusableScan, restartScan, saveStep, type SiteScanDoc, type SiteScanStatus } from './repository'
import { domainOf } from './safeFetch'
import { isCompleteResults, type ScanResults } from './types'

const DEFAULT_DAILY_LIMIT = 100
/** A cached scan whose FREE checks failed (e.g. PageSpeed quota) retries them after this — paid data is kept, never re-billed. */
const FREE_RETRY_AFTER_MS = 15 * 60 * 1000

export function dailyLimit(env: Record<string, string | undefined> = process.env): number {
  const n = Number.parseInt(env.SITE_SCAN_DAILY_LIMIT ?? '', 10)
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_DAILY_LIMIT
}

export type StartedScan = {
  scanId: string
  status: SiteScanStatus
  /** The work to run in the background — absent when a cached scan is reused as-is. */
  run?: () => Promise<void>
}

const freeChecksFailed = (scan: SiteScanDoc) =>
  scan.status === 'done' && isCompleteResults(scan.results) && (scan.results.onPage.status === 'error' || scan.results.performance.status === 'error')

/**
 * Reuses a scan of the same domain from the last 7 days, or creates one.
 * Over the daily cap, a new scan only runs the free collectors.
 */
export async function startSiteScan(url: URL, answers: Answers, now = new Date()): Promise<StartedScan> {
  const domain = domainOf(url)
  const cached = await findReusableScan(domain, now)
  if (cached) {
    const scanId = cached._id.toHexString()
    if (freeChecksFailed(cached) && isCompleteResults(cached.results) && now.getTime() - cached.updatedAt.getTime() > FREE_RETRY_AFTER_MS) {
      await restartScan(scanId, now)
      const { authority, traffic } = cached.results
      return { scanId, status: 'running', run: () => runScan(scanId, new URL(cached.url), cached.paidSources, answers, { authority, traffic }) }
    }
    return { scanId, status: cached.status }
  }

  const allowPaid = (await countScansToday(now)) < dailyLimit()
  const scanId = await createScan(domain, url.href, allowPaid, now)
  return { scanId, status: 'running', run: () => runScan(scanId, url, allowPaid, answers) }
}

/**
 * Collect (storing each collector's result the moment it finishes), analyse,
 * store. Never throws: any failure is recorded as 'failed'.
 */
export async function runScan(
  scanId: string,
  url: URL,
  allowPaid: boolean,
  answers: Answers,
  paid?: Pick<ScanResults, 'authority' | 'traffic'>,
): Promise<void> {
  try {
    await beginRun(scanId, { url: url.href, domain: domainOf(url) })
    const results = await collectAll(url, { allowPaid, paid, onResult: (step, result) => saveStep(scanId, step, result) })
    if (results.onPage.status !== 'ok' && results.performance.status !== 'ok') {
      await failScan(scanId, `No usable data: ${results.onPage.reason ?? 'on-page failed'}; ${results.performance.reason ?? 'performance failed'}`, results)
      return
    }
    await completeScan(scanId, results, await analyseSite(results, answers))
  } catch (error) {
    console.error('[site-scan] Scan failed:', error instanceof Error ? error.message : 'unknown')
    await failScan(scanId, error instanceof Error ? error.message : 'unknown error').catch(() => undefined)
  }
}
