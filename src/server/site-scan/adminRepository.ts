import 'server-only'

import { ObjectId, type Filter } from 'mongodb'
import { getDatabase } from '../db/client'
import type { Answers } from '../../questionnaire/flow'
import { QUESTIONNAIRE_COLLECTION, type QuestionnaireSubmission } from '../questionnaire/repository'
import { CACHE_MS, isScanId, SITE_SCANS_COLLECTION, STALE_RUNNING_MS, type SiteScanDoc } from './repository'
import { SCAN_STEPS, type CollectorResult, type CollectorState, type LinkedSubmission, type ScanStatus, type SiteScanDetail, type SiteScanListResult, type SiteScanSummary } from './types'

const DEFAULT_PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100

/** Exactly what the list needs. The full results never leave Mongo for it. */
export const SCAN_LIST_PROJECTION = {
  domain: 1,
  url: 1,
  status: 1,
  paidSources: 1,
  error: 1,
  createdAt: 1,
  updatedAt: 1,
  'analysis.ai': 1,
  'analysis.headline': 1,
  'analysis.issues.title': 1,
  ...Object.fromEntries(SCAN_STEPS.flatMap((step) => [[`results.${step}.status`, 1], [`results.${step}.reason`, 1]])),
  'results.performance.data.scores.performance': 1,
  'results.performance.data.scores.seo': 1,
  'results.authority.data.provider': 1,
  'results.authority.data.domainAuthority': 1,
  'results.authority.data.domainRank': 1,
  'results.traffic.data.estimatedOrganicTraffic': 1,
  'results.pages.data.summary.pagesCrawled': 1,
  'results.pages.data.summary.groupsFound': 1,
  'results.pages.data.summary.groupsNotFound': 1,
  'results.pages.data.summary.groupsNotChecked': 1,
}

const SECRET_ENV_NAME = /KEY|TOKEN|SECRET|PASSWORD|LOGIN/i
const MIN_SECRET_LENGTH = 6

/**
 * Failure reasons quote third-party error text. Nothing should ever carry a
 * credential, but these go to a browser, so any that slipped in is cut out.
 */
export function scrubSecrets(text: string, env: Record<string, string | undefined> = process.env): string {
  const withoutValues = Object.entries(env).reduce((out, [name, value]) => (
    value && value.length >= MIN_SECRET_LENGTH && SECRET_ENV_NAME.test(name) ? out.split(value).join('[redacted]') : out
  ), text)
  return withoutValues.replace(/([?&](?:key|api_key|apikey|token)=)[^&\s]+/gi, '$1[redacted]')
}

const scrubbed = (text: string | null | undefined) => (text ? scrubSecrets(text) : null)
const isStale = (status: ScanStatus, updatedAt: Date, now: Date) => status === 'running' && now.getTime() - updatedAt.getTime() > STALE_RUNNING_MS

function collectorState(result: CollectorResult<unknown> | undefined): CollectorState {
  return { status: result?.status ?? null, reason: scrubbed(result?.reason) }
}

/** Reads only the projected fields, which is why everything here is treated as possibly absent. */
function toSummary(doc: SiteScanDoc, now: Date): SiteScanSummary {
  const results = doc.results
  const scores = results?.performance?.data?.scores
  const authority = results?.authority?.data
  const summary = results?.pages?.data?.summary
  return {
    id: doc._id.toHexString(),
    domain: doc.domain,
    url: doc.url,
    status: doc.status,
    stale: isStale(doc.status, doc.updatedAt, now),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    paidSources: doc.paidSources,
    error: scrubbed(doc.error),
    ai: typeof doc.analysis?.ai === 'boolean' ? doc.analysis.ai : null,
    headline: doc.analysis?.headline ?? null,
    issueCount: doc.analysis ? doc.analysis.issues?.length ?? 0 : null,
    collectors: Object.fromEntries(SCAN_STEPS.map((step) => [step, collectorState(results?.[step])])) as SiteScanSummary['collectors'],
    performanceScore: scores?.performance ?? null,
    seoScore: scores?.seo ?? null,
    authority: authority
      ? authority.provider === 'moz'
        ? { provider: 'moz', domainAuthority: authority.domainAuthority ?? null }
        : { provider: 'dataforseo', domainRank: authority.domainRank ?? null }
      : null,
    estimatedTraffic: results?.traffic?.data?.estimatedOrganicTraffic ?? null,
    pages: summary
      ? {
          crawled: summary.pagesCrawled ?? 0,
          groupsFound: summary.groupsFound?.length ?? 0,
          groupsNotFound: summary.groupsNotFound?.length ?? 0,
          groupsNotChecked: summary.groupsNotChecked?.length ?? 0,
        }
      : null,
  }
}

export type ListScansOptions = { q?: string; status?: ScanStatus; page?: number; pageSize?: number }

export async function listScans({ q, status, page = 1, pageSize = DEFAULT_PAGE_SIZE }: ListScansOptions = {}, now = new Date()): Promise<SiteScanListResult> {
  const size = Math.min(Math.max(Math.trunc(pageSize) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE)
  const current = Math.max(Math.trunc(page) || 1, 1)
  const filter: Filter<SiteScanDoc> = {}
  const search = q?.trim()
  if (search) filter.domain = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
  if (status) filter.status = status

  const scans = (await getDatabase()).collection<SiteScanDoc>(SITE_SCANS_COLLECTION)
  const [docs, total] = await Promise.all([
    scans.find(filter, { projection: SCAN_LIST_PROJECTION }).sort({ updatedAt: -1 }).skip((current - 1) * size).limit(size).toArray(),
    scans.countDocuments(filter),
  ])
  return { items: docs.map((doc) => toSummary(doc, now)), page: current, pageSize: size, total, totalPages: Math.ceil(total / size) }
}

/** The questionnaire keeps its copy of the scan's id, so that's the link back. */
async function linkedSubmissions(id: string): Promise<LinkedSubmission[]> {
  const docs = await (await getDatabase()).collection<QuestionnaireSubmission>(QUESTIONNAIRE_COLLECTION)
    .find({ 'siteScan.id': id }, { projection: { branch: 1, brandName: 1, 'contact.name': 1, 'contact.email': 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .toArray()
  return docs.map((doc) => ({
    id: doc._id.toHexString(),
    name: doc.contact?.name ?? '',
    email: doc.contact?.email ?? '',
    company: doc.brandName ?? '',
    submittedAt: doc.createdAt.toISOString(),
    branch: doc.branch,
  }))
}

function scrubResults(results: SiteScanDoc['results']): SiteScanDoc['results'] {
  if (!results) return results
  const copy = { ...results } as Record<string, unknown>
  for (const step of SCAN_STEPS) {
    const result = results[step]
    if (result?.reason) copy[step] = { ...result, reason: scrubSecrets(result.reason) }
  }
  return copy as SiteScanDoc['results']
}

export async function getScanForAdmin(id: string, now = new Date()): Promise<SiteScanDetail | null> {
  if (!isScanId(id)) return null
  const doc = await (await getDatabase()).collection<SiteScanDoc>(SITE_SCANS_COLLECTION).findOne({ _id: new ObjectId(id) })
  if (!doc) return null
  return {
    id,
    domain: doc.domain,
    url: doc.url,
    status: doc.status,
    stale: isStale(doc.status, doc.updatedAt, now),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    // findReusableScan goes by createdAt, so a re-run doesn't extend this.
    cachedUntil: new Date(doc.createdAt.getTime() + CACHE_MS).toISOString(),
    expiresAt: doc.expiresAt.toISOString(),
    paidSources: doc.paidSources,
    error: scrubbed(doc.error),
    results: scrubResults(doc.results),
    analysis: doc.analysis,
    submissions: await linkedSubmissions(id),
  }
}

/** What the customer told us, so a re-run's AI analysis can still tie back to what they want. */
export async function latestSubmissionAnswers(id: string): Promise<Answers> {
  const doc = await (await getDatabase()).collection<QuestionnaireSubmission>(QUESTIONNAIRE_COLLECTION)
    .findOne({ 'siteScan.id': id }, { sort: { createdAt: -1 }, projection: { answers: 1 } })
  return doc?.answers ?? {}
}
