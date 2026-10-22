/**
 * Shared by POST /api/questionnaire/assist (one JSON reply) and
 * POST /api/questionnaire/assist/stream (server-sent events): the same body
 * validation and the same per-IP limits, so streaming can't be used to get
 * around them.
 */
import { STEPS } from '../../questionnaire/flow'
import type { AiTask, TaskContext } from './ai'
import { AI_TASKS } from './ai'
import { allow, clientKey } from './rateLimit'
import { sanitizeAnswers } from './validation'
import type { Answers } from '../../questionnaire/flow'

const ASSIST_LIMIT = 40
const ASSIST_WINDOW_MS = 10 * 60 * 1000
const REACT_WINDOW_MS = 30 * 60 * 1000
const DEFAULT_REACT_LIMIT = 6

/** Reactions allowed per visitor (env QUESTIONNAIRE_REACT_LIMIT, default 6). */
export function reactLimit(env: Record<string, string | undefined> = process.env): number {
  const n = Number.parseInt(env.QUESTIONNAIRE_REACT_LIMIT ?? '', 10)
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_REACT_LIMIT
}

export type AssistRequest = { task: AiTask; answers: Answers; ctx: TaskContext }

/** The validated request, or null for an unknown task or a step id that doesn't exist. */
export function parseAssistBody(body: unknown): AssistRequest | null {
  const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const task = input.task
  if (typeof task !== 'string' || !(AI_TASKS as readonly string[]).includes(task) || task === 'brief') return null
  const stepId = typeof input.stepId === 'string' && STEPS[input.stepId] ? input.stepId : undefined
  if ((task === 'react' || task === 'suggest') && !stepId) return null
  return { task: task as AiTask, answers: sanitizeAnswers(input.answers), ctx: stepId ? { stepId } : {} }
}

/** Records the hit and says whether the model may be called (else: neutral copy). */
export function assistAllowed(request: Request, task: AiTask): boolean {
  const key = clientKey(request)
  if (!allow('questionnaire-assist', key, ASSIST_LIMIT, ASSIST_WINDOW_MS)) return false
  if (task === 'react' && !allow('questionnaire-react', key, reactLimit(), REACT_WINDOW_MS)) return false
  return true
}
