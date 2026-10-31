import 'server-only'

import { ObjectId } from 'mongodb'
import { getDatabase } from '../db/client'
import type { CollectorResult, PartialScanResults, ScanResults, ScanStepKey, SiteAnalysis } from './types'

export const SITE_SCANS_COLLECTION = 'site_scans'
/** A scan of the same domain is reused for this long, so the paid APIs aren't billed twice. */
export const CACHE_MS = 7 * 24 * 60 * 60 * 1000
/** Mongo's TTL index deletes scans a day after the cache window closes. */
const KEEP_MS = 8 * 24 * 60 * 60 * 1000
/** A 'running' scan older than this was lost (process restart) and isn't reused. */
const STALE_RUNNING_MS = 10 * 60 * 1000

export type SiteScanStatus = 'running' | 'done' | 'failed'

export type SiteScanDoc = {
  _id: ObjectId
  domain: string
  url: string
  status: SiteScanStatus
  /** Full when done; while running, each collector appears as it finishes. */
  results: ScanResults | PartialScanResults | null
  analysis: SiteAnalysis | null
  /** Whether the paid collectors were allowed (false once the daily cap is hit). */
  paidSources: boolean
  error?: string
  createdAt: Date
  updatedAt: Date
  expiresAt: Date
}

export const isScanId = (id: unknown): id is string => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id)

const scans = async () => (await getDatabase()).collection<SiteScanDoc>(SITE_SCANS_COLLECTION)

/**
 * The newest finished (or still fresh, running) scan of this domain inside the
 * cache window. Freshness goes by updatedAt: a days-old scan that is re-running
 * must be found again, or a second visitor would start a new one and re-bill.
 */
export async function findReusableScan(domain: string, now = new Date()): Promise<SiteScanDoc | null> {
  return (await scans()).findOne(
    {
      domain,
      createdAt: { $gte: new Date(now.getTime() - CACHE_MS) },
      $or: [{ status: 'done' }, { status: 'running', updatedAt: { $gte: new Date(now.getTime() - STALE_RUNNING_MS) } }],
    },
    { sort: { createdAt: -1 } },
  )
}

/** Scans started since midnight UTC — the global daily cap counts these. */
export async function countScansToday(now = new Date()): Promise<number> {
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return (await scans()).countDocuments({ createdAt: { $gte: midnight } })
}

export async function createScan(domain: string, url: string, paidSources: boolean, now = new Date()): Promise<string> {
  const result = await (await scans()).insertOne({
    _id: new ObjectId(),
    domain,
    url,
    status: 'running',
    results: null,
    analysis: null,
    paidSources,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + KEEP_MS),
  })
  return result.insertedId.toHexString()
}

/** Marks a cached scan as running again while its free checks are retried. */
export async function restartScan(id: string, now = new Date()): Promise<void> {
  await (await scans()).updateOne({ _id: new ObjectId(id) }, { $set: { status: 'running', updatedAt: now } })
}

/** Starts (or restarts) the run: resets progress, keeping only results passed in (reused paid data). */
export async function beginRun(id: string, results: PartialScanResults): Promise<void> {
  await (await scans()).updateOne({ _id: new ObjectId(id) }, { $set: { status: 'running', results, analysis: null, updatedAt: new Date() } })
}

/** Stores one collector's result the moment it finishes, so the live checklist can tick it off. */
export async function saveStep(id: string, step: ScanStepKey, result: CollectorResult<unknown>): Promise<void> {
  await (await scans()).updateOne({ _id: new ObjectId(id) }, { $set: { [`results.${step}`]: result, updatedAt: new Date() } })
}

export async function completeScan(id: string, results: ScanResults, analysis: SiteAnalysis): Promise<void> {
  await (await scans()).updateOne({ _id: new ObjectId(id) }, { $set: { status: 'done', results, analysis, updatedAt: new Date() } })
}

/** Marks the scan failed, keeping whatever progress was already stored unless results are passed. */
export async function failScan(id: string, error: string, results?: ScanResults | PartialScanResults): Promise<void> {
  await (await scans()).updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'failed', error: error.slice(0, 300), ...(results ? { results } : {}), updatedAt: new Date() } },
  )
}

export async function getScan(id: string): Promise<SiteScanDoc | null> {
  if (!isScanId(id)) return null
  return (await scans()).findOne({ _id: new ObjectId(id) })
}
