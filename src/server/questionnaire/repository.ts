import 'server-only'

import { getDatabase } from '../db/client'
import { summarize, type Answers, type SummaryRow } from '../../questionnaire/flow'
import { getScan } from '../site-scan/repository'
import { domainOf, normaliseUrl } from '../site-scan/safeFetch'
import type { PartialScanResults, ScanResults, SiteAnalysis } from '../site-scan/types'
import type { Brief } from './ai'

export const QUESTIONNAIRE_COLLECTION = 'project_questionnaires'

/** The website quick-look, copied in full so the team sees everything in one record. */
export type EmbeddedSiteScan = {
  id: string
  domain: string
  url: string
  status: 'running' | 'done' | 'failed'
  paidSources: boolean
  /** Partial if the scan was still running when the customer submitted. */
  results: ScanResults | PartialScanResults | null
  analysis: SiteAnalysis | null
  scannedAt: Date
}

export type QuestionnaireSubmission = {
  branch: string
  brandName: string
  contact: { name: string; email: string; phone?: string; website?: string }
  answers: Answers
  /** Question/answer pairs exactly as the customer saw them — what the team reads. */
  summary: SummaryRow[]
  brief: Brief
  briefByAi: boolean
  siteScan?: EmbeddedSiteScan
  status: 'new'
  createdAt: Date
}

const s = (v: unknown) => (typeof v === 'string' ? v : undefined)

function answeredDomain(answers: Answers): string | null {
  const url = s(answers.currentUrl) ?? s(answers.redesignUrl)
  if (!url) return null
  try { return domainOf(normaliseUrl(url)) } catch { return null }
}

/**
 * Loads the scan the customer started, but only if it is for the website they
 * actually gave us. A scan lookup failure never blocks the submission.
 */
async function embeddedScan(answers: Answers): Promise<EmbeddedSiteScan | undefined> {
  const id = s(answers.siteScanId)
  const domain = answeredDomain(answers)
  if (!id || !domain) return undefined
  try {
    const scan = await getScan(id)
    if (!scan || scan.domain !== domain) return undefined
    return {
      id,
      domain: scan.domain,
      url: scan.url,
      status: scan.status,
      paidSources: scan.paidSources,
      results: scan.results,
      analysis: scan.analysis,
      scannedAt: scan.createdAt,
    }
  } catch (error) {
    console.warn('[questionnaire] Could not attach site scan:', error instanceof Error ? error.message : 'unknown')
    return undefined
  }
}

export async function saveSubmission(answers: Answers, brief: Brief, briefByAi: boolean): Promise<string> {
  const db = await getDatabase()
  const siteScan = await embeddedScan(answers)
  const doc: QuestionnaireSubmission = {
    branch: s(answers.projectStage) ?? 'unknown',
    brandName: s(answers.brandName) ?? '',
    contact: {
      name: s(answers.contactName) ?? '',
      email: s(answers.contactEmail) ?? '',
      ...(s(answers.contactPhone) ? { phone: s(answers.contactPhone) } : {}),
      ...(s(answers.contactWebsite) ? { website: s(answers.contactWebsite) } : {}),
    },
    answers,
    summary: summarize(answers),
    brief,
    briefByAi,
    ...(siteScan ? { siteScan } : {}),
    status: 'new',
    createdAt: new Date(),
  }
  const result = await db.collection<QuestionnaireSubmission>(QUESTIONNAIRE_COLLECTION).insertOne(doc)
  return result.insertedId.toHexString()
}
