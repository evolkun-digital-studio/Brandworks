import { brief, fallbackBrief } from '../../../src/server/questionnaire/ai'
import { checkSubmission, sanitizeAnswers } from '../../../src/server/questionnaire/validation'
import { allow, clientKey } from '../../../src/server/questionnaire/rateLimit'
import { saveSubmission } from '../../../src/server/questionnaire/repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LIMIT = 6
const WINDOW_MS = 10 * 60 * 1000

/** Final submission: validate, write the AI brief, store for the team. */
export async function POST(request: Request): Promise<Response> {
  let body: { answers?: unknown; website_url?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const answers = sanitizeAnswers(body.answers)

  // Honeypot: bots fill every field. Pretend it worked, store nothing.
  if (typeof body.website_url === 'string' && body.website_url.trim()) {
    return Response.json({ id: null, brief: fallbackBrief(), briefAi: false })
  }

  if (!allow('questionnaire-submit', clientKey(request), LIMIT, WINDOW_MS)) {
    return Response.json({ error: 'Too many submissions. Please try again in a few minutes.' }, { status: 429 })
  }

  const check = checkSubmission(answers)
  if (!check.ok) return Response.json({ error: check.error, stepId: check.stepId }, { status: 422 })

  const result = await brief(answers)
  try {
    const id = await saveSubmission(answers, result.value, result.ai)
    return Response.json({ id, brief: result.value, briefAi: result.ai }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[questionnaire] Could not store submission:', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'We couldn’t save your answers just now.', brief: result.value, briefAi: result.ai }, { status: 503 })
  }
}
