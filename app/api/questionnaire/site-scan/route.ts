import { after } from 'next/server'
import { allow, clientKey } from '../../../../src/server/questionnaire/rateLimit'
import { sanitizeAnswers } from '../../../../src/server/questionnaire/validation'
import { SafeFetchError, validatePublicUrl } from '../../../../src/server/site-scan/safeFetch'
import { startSiteScan } from '../../../../src/server/site-scan/run'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** PageSpeed Insights alone can take 45 s; the background work needs headroom. */
export const maxDuration = 120

const LIMIT = 5
const WINDOW_MS = 60 * 60 * 1000
const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * Starts (or reuses) a website quick-look and returns at once. Collectors and
 * the AI analysis run after the response via `after()`; their failures are
 * stored on the scan as 'failed', never thrown at the visitor.
 */
export async function POST(request: Request): Promise<Response> {
  let body: { url?: unknown; answers?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }
  if (typeof body.url !== 'string' || !body.url.trim()) {
    return Response.json({ error: 'Enter a website address.' }, { status: 400 })
  }

  if (!allow('site-scan', clientKey(request), LIMIT, WINDOW_MS)) {
    return Response.json({ error: 'Too many website checks. Please try again later.' }, { status: 429, headers: NO_STORE })
  }

  let url: URL
  try {
    url = await validatePublicUrl(body.url)
  } catch (error) {
    if (error instanceof SafeFetchError) return Response.json({ error: error.message, code: error.code }, { status: 400, headers: NO_STORE })
    throw error
  }

  try {
    const scan = await startSiteScan(url, sanitizeAnswers(body.answers))
    if (scan.run) after(scan.run)
    return Response.json({ scanId: scan.scanId, status: scan.status }, { status: scan.run ? 202 : 200, headers: NO_STORE })
  } catch (error) {
    console.error('[site-scan] Could not start scan:', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'We couldn’t start the website check just now.' }, { status: 503, headers: NO_STORE })
  }
}
