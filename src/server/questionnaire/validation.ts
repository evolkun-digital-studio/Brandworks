/**
 * Server-side cleaning for questionnaire answers. The browser's payload is
 * never trusted: only ids on the path implied by the answers survive, option
 * values must exist in the shared flow definition, and free text is capped.
 * Kept free of `server-only` so it can be unit tested in plain node.
 */
import {
  CONTACT_FIELDS,
  STEPS,
  buildPath,
  validateStep,
  type Answers,
} from '../../questionnaire/flow'

const MAX_TEXT = 3000
const MAX_AI_NOTES = 6
const MAX_AI_NOTE = 200

function cleanText(value: unknown, max = MAX_TEXT): string | undefined {
  if (typeof value !== 'string') return undefined
  // Drop control characters except newlines/tabs, collapse runaway whitespace.
  // oxlint-disable-next-line no-control-regex -- stripping control characters is the point
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\n{3,}/g, '\n\n').trim()
  return cleaned ? cleaned.slice(0, max) : undefined
}

/**
 * Rebuilds answers from scratch, walking the path the answers themselves
 * imply (so branch-switching leftovers are dropped).
 */
export function sanitizeAnswers(raw: unknown): Answers {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out: Answers = {}

  // Two passes: the opening decides the branch, the branch decides the rest.
  for (let pass = 0; pass < 2; pass++) {
    for (const id of buildPath(out)) {
      const step = STEPS[id]
      if (!step) continue
      const value = input[id]
      if (step.kind === 'text' || step.kind === 'longtext') {
        const text = cleanText(value, step.maxLength ?? MAX_TEXT)
        if (text) out[id] = text
      } else if (step.kind === 'single') {
        if (typeof value === 'string' && step.options.some((o) => o.value === value)) out[id] = value
        if (step.otherValue && out[id] === step.otherValue) {
          const other = cleanText(input[`${id}Other`], 200)
          if (other) out[`${id}Other`] = other
        }
        if (step.assistValue && out[id] === step.assistValue) {
          const suggested = input[`${id}Suggested`]
          if (typeof suggested === 'string' && step.options.some((o) => o.value === suggested && o.value !== step.assistValue)) {
            out[`${id}Suggested`] = suggested
          }
        }
      } else if (step.kind === 'multi' && Array.isArray(value)) {
        const allowed = new Set(step.options.map((o) => o.value))
        const picked = [...new Set(value.filter((v): v is string => typeof v === 'string' && allowed.has(v)))]
        const limited = step.max ? picked.slice(0, step.max) : picked
        if (limited.length) out[id] = limited
      }
    }
  }

  for (const field of CONTACT_FIELDS) {
    const text = cleanText(input[field], field === 'contactName' ? 120 : 300)
    if (text) out[field] = text
  }

  // What the AI told the visitor along the way (streamed reactions), so the team sees it too.
  if (Array.isArray(input.aiNotes)) {
    const notes = input.aiNotes.map((n) => cleanText(n, MAX_AI_NOTE)).filter((n): n is string => Boolean(n)).slice(0, MAX_AI_NOTES)
    if (notes.length) out.aiNotes = notes
  }

  // The website quick-look started from the URL step: a Mongo ObjectId, nothing else.
  if (typeof input.siteScanId === 'string' && /^[a-f0-9]{24}$/i.test(input.siteScanId)) {
    out.siteScanId = input.siteScanId.toLowerCase()
  }
  return out
}

export type SubmissionCheck = { ok: boolean; error?: string; stepId?: string }

/** A submission must have reached the contact step with every required answer present. */
export function checkSubmission(answers: Answers): SubmissionCheck {
  const path = buildPath(answers)
  if (!path.includes('contact')) return { ok: false, error: 'This questionnaire isn’t complete yet.' }
  for (const id of path) {
    const message = validateStep(STEPS[id], answers)
    if (message) return { ok: false, error: message, stepId: id }
  }
  return { ok: true }
}
