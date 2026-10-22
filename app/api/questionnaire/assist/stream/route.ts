import { runTaskStream } from '../../../../../src/server/questionnaire/ai'
import { assistAllowed, parseAssistBody } from '../../../../../src/server/questionnaire/assistRequest'
import { SSE_HEADERS, sseFrame } from '../../../../../src/questionnaire/sse'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PING_MS = 15_000

/**
 * The in-flow AI moments, streamed as server-sent events:
 *
 *   event: token     data: {"t":"..."}                 one per visible delta
 *   event: meta      data: {"suggestion":"store"}      recommend-type, as soon as its TYPE line ends
 *   event: done      data: {"ai":true,"text":"...", ...task extras}
 *   event: fallback  data: {"ai":false,"text":"<neutral copy>", ...}
 *
 * Counts toward the same per-IP limits as /assist. When the visitor
 * disconnects, the upstream model request is aborted.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const parsed = parseAssistBody(body)
  if (!parsed) return Response.json({ error: 'Unknown task.' }, { status: 400 })

  const allowAi = assistAllowed(request, parsed.task)
  const upstream = new AbortController()
  const onDisconnect = () => upstream.abort()
  request.signal.addEventListener('abort', onDisconnect, { once: true })
  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (text: string) => {
        if (closed) return
        try { controller.enqueue(encoder.encode(text)) } catch { closed = true }
      }
      const ping = setInterval(() => write(': ping\n\n'), PING_MS)
      write(': stream open\n\n')
      try {
        const outcome = await runTaskStream(parsed.task, parsed.answers, parsed.ctx, {
          allowAi,
          signal: upstream.signal,
          onToken: (t) => write(sseFrame('token', { t })),
          onMeta: (meta) => write(sseFrame('meta', meta)),
        })
        if (outcome) write(sseFrame(outcome.ai ? 'done' : 'fallback', { ai: outcome.ai, text: outcome.text, ...outcome.extras }))
      } catch (error) {
        console.error('[questionnaire-ai] stream route:', error instanceof Error ? error.message : 'unknown')
      } finally {
        clearInterval(ping)
        request.signal.removeEventListener('abort', onDisconnect)
        if (!closed) {
          closed = true
          try { controller.close() } catch { /* already closed by the client */ }
        }
      }
    },
    cancel() {
      closed = true
      upstream.abort()
    },
  })

  return new Response(stream, { headers: SSE_HEADERS })
}
