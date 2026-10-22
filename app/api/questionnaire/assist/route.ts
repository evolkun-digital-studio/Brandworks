import { neutral, runTask } from '../../../../src/server/questionnaire/ai'
import { assistAllowed, parseAssistBody } from '../../../../src/server/questionnaire/assistRequest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { headers: { 'Cache-Control': 'no-store' } }

/**
 * The in-flow AI moments as one JSON reply — the fallback for
 * /assist/stream. Always answers 200 with usable copy: when the model is
 * unavailable or the client is over its limit, the response carries neutral
 * copy and `ai: false`, so the questionnaire never stalls.
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

  const outcome = assistAllowed(request, parsed.task)
    ? await runTask(parsed.task, parsed.answers, parsed.ctx)
    : neutral(parsed.task, parsed.answers, 'rate limit reached')
  return Response.json({ message: outcome.text, ai: outcome.ai, ...outcome.extras }, NO_STORE)
}
