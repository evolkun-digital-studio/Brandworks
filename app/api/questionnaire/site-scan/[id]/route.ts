import { allow, clientKey } from '../../../../../src/server/questionnaire/rateLimit'
import { publicScanView } from '../../../../../src/server/site-scan/highlights'
import { getScan, isScanId } from '../../../../../src/server/site-scan/repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LIMIT = 120
const WINDOW_MS = 10 * 60 * 1000
const NO_STORE = { 'Cache-Control': 'no-store' }

/** Customer-safe status of a quick-look: teaser + up to 4 metrics. Never the team report or raw API data. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params
  if (!isScanId(id)) return Response.json({ error: 'Invalid scan id.' }, { status: 400, headers: NO_STORE })
  if (!allow('site-scan-status', clientKey(request), LIMIT, WINDOW_MS)) {
    return Response.json({ error: 'Too many requests.' }, { status: 429, headers: NO_STORE })
  }
  try {
    const scan = await getScan(id)
    if (!scan) return Response.json({ error: 'Not found.' }, { status: 404, headers: NO_STORE })
    return Response.json(publicScanView(scan), { headers: NO_STORE })
  } catch (error) {
    console.error('[site-scan] Could not read scan:', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'Unavailable.' }, { status: 503, headers: NO_STORE })
  }
}
