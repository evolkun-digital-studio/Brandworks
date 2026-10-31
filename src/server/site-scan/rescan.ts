import 'server-only'

import { conflict, notFound } from '../http/errors'
import { latestSubmissionAnswers } from './adminRepository'
import { TRAFFIC_SOURCE } from './collectors/traffic'
import { claimRescan, getScan } from './repository'
import { runScan } from './run'
import { skipped, type AuthorityData, type CollectorResult, type TrafficData } from './types'

const NOT_COLLECTED = 'Not collected: this scan stopped before it got here, and a team rescan only runs the free checks'

/**
 * The team's "rescan free checks": on-page, key pages and performance run
 * again; authority and traffic stay exactly as stored. allowPaid is false, so
 * even a scan with no stored paid data can't reach a billed API from here.
 */
export async function startFreeRescan(id: string, now = new Date()): Promise<{ domain: string; run: () => Promise<void> }> {
  if (!(await getScan(id))) throw notFound('Scan not found.')
  const scan = await claimRescan(id, now)
  if (!scan) throw conflict('This scan is already running.')

  const authority = scan.results?.authority ?? skipped<AuthorityData>('Authority', NOT_COLLECTED)
  const traffic: CollectorResult<TrafficData> = scan.results?.traffic ?? skipped<TrafficData>(TRAFFIC_SOURCE, NOT_COLLECTED)
  const answers = await latestSubmissionAnswers(id)
  return { domain: scan.domain, run: () => runScan(id, new URL(scan.url), false, answers, { authority, traffic }) }
}
