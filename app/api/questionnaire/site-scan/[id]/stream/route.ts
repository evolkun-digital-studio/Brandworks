import { allow, clientKey } from '../../../../../../src/server/questionnaire/rateLimit'
import { customerHighlights, stepHighlights } from '../../../../../../src/server/site-scan/highlights'
import { getScan, isScanId } from '../../../../../../src/server/site-scan/repository'
import { DISCLAIMER, SCAN_STEPS, isCompleteResults } from '../../../../../../src/server/site-scan/types'
import { SSE_HEADERS, sseFrame } from '../../../../../../src/questionnaire/sse'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const LIMIT = 120
const WINDOW_MS = 10 * 60 * 1000
const CHECK_MS = 1_000
const MAX_MS = 90_000
const PING_MS = 15_000
const MAX_DB_ERRORS = 5

/**
 * Live progress of a website quick-look, as server-sent events:
 *
 *   event: step    data: {"step":"onPage"|"performance"|"authority"|"traffic"|"analysis","status":"ok"|"skipped"|"error","highlights":[...]}
 *   event: teaser  data: {"text":"...","ai":true}
 *   event: done    data: {"domain","teaser","teaserAi","highlights","disclaimer"}
 *   event: failed  data: {"domain"}
 *
 * The scan document is checked every second (the background run stores each
 * collector's result as it finishes). Only customer-safe highlights are sent —
 * never raw API data or the team report. Closes after done/failed or 90 s;
 * the client then falls back to GET /api/questionnaire/site-scan/[id].
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params
  if (!isScanId(id)) return Response.json({ error: 'Invalid scan id.' }, { status: 400 })
  if (!allow('site-scan-status', clientKey(request), LIMIT, WINDOW_MS)) {
    return Response.json({ error: 'Too many requests.' }, { status: 429, headers: { 'Cache-Control': 'no-store' } })
  }

  const encoder = new TextEncoder()
  let closed = false
  const stop = new AbortController()
  const onDisconnect = () => stop.abort()
  request.signal.addEventListener('abort', onDisconnect, { once: true })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (text: string) => {
        if (closed) return
        try { controller.enqueue(encoder.encode(text)) } catch { closed = true }
      }
      const ping = setInterval(() => write(': ping\n\n'), PING_MS)
      write(': stream open\n\n')
      const sent = new Set<string>()
      const deadline = Date.now() + MAX_MS
      let dbErrors = 0
      try {
        while (!closed && !stop.signal.aborted && Date.now() < deadline) {
          let scan
          try {
            scan = await getScan(id)
            dbErrors = 0
          } catch (error) {
            if (++dbErrors >= MAX_DB_ERRORS) { console.error('[site-scan] stream lost the database:', error instanceof Error ? error.message : 'unknown'); break }
          }
          if (scan === null) { write(sseFrame('failed', { domain: '' })); break }
          if (scan) {
            for (const step of SCAN_STEPS) {
              const result = scan.results?.[step]
              if (result && !sent.has(step)) {
                sent.add(step)
                write(sseFrame('step', { step, status: result.status, highlights: stepHighlights(step, result) }))
              }
            }
            if (scan.analysis && !sent.has('analysis')) {
              sent.add('analysis')
              write(sseFrame('step', { step: 'analysis', status: 'ok', highlights: [] }))
              write(sseFrame('teaser', { text: scan.analysis.customerTeaser, ai: scan.analysis.ai }))
            }
            if (scan.status === 'done' && isCompleteResults(scan.results)) {
              write(sseFrame('done', {
                domain: scan.domain,
                teaser: scan.analysis?.customerTeaser ?? null,
                teaserAi: Boolean(scan.analysis?.ai),
                highlights: customerHighlights(scan.results),
                disclaimer: DISCLAIMER,
              }))
              break
            }
            if (scan.status === 'failed') { write(sseFrame('failed', { domain: scan.domain })); break }
          }
          await new Promise<void>((resolve) => {
            const t = setTimeout(resolve, CHECK_MS)
            stop.signal.addEventListener('abort', () => { clearTimeout(t); resolve() }, { once: true })
          })
        }
      } finally {
        clearInterval(ping)
        request.signal.removeEventListener('abort', onDisconnect)
        if (!closed) {
          closed = true
          try { controller.close() } catch { /* client already gone */ }
        }
      }
    },
    cancel() {
      closed = true
      stop.abort()
    },
  })

  return new Response(stream, { headers: SSE_HEADERS })
}
