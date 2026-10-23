import type { Answers } from './flow'
import { readSse } from './sse'

export type AssistTask = 'greet' | 'usp-reply' | 'recommend-type' | 'react' | 'suggest'
export type AssistResponse = { message: string; ai: boolean; suggestion?: string; items?: string[] }
export type Brief = { summary: string; focus: string[] }

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

/** One JSON reply — the non-streaming fallback. */
export async function assist(task: AssistTask, answers: Answers, signal?: AbortSignal, stepId?: string): Promise<AssistResponse> {
  const response = await fetch('/api/questionnaire/assist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ task, answers, stepId }),
    signal,
  })
  if (!response.ok) throw new Error(`assist ${response.status}`)
  return response.json()
}

export type StreamAssistOptions = {
  stepId?: string
  /** The visible text so far, each time a token arrives. */
  onToken?: (textSoFar: string) => void
  /** Structured data that arrives before the text ends (recommend-type's suggestion). */
  onMeta?: (meta: { suggestion?: string }) => void
  signal?: AbortSignal
}

const toResponse = (data: Record<string, unknown>): AssistResponse => ({
  message: typeof data.text === 'string' ? data.text : '',
  ai: data.ai === true,
  ...(typeof data.suggestion === 'string' ? { suggestion: data.suggestion } : {}),
  ...(Array.isArray(data.items) ? { items: data.items.filter((i): i is string => typeof i === 'string') } : {}),
})

/**
 * Streams an AI moment token by token over a POST (so not EventSource):
 * fetch + response.body.getReader() + the shared SSE parser. If the stream
 * can't be used — an error, a proxy that strips it, or it ends without a
 * final event — it falls back to the one-shot `assist()`.
 */
export async function streamAssist(task: AssistTask, answers: Answers, options: StreamAssistOptions = {}): Promise<AssistResponse> {
  const { stepId, onToken, onMeta, signal } = options
  try {
    const response = await fetch('/api/questionnaire/assist/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
      body: JSON.stringify({ task, answers, stepId }),
      signal,
    })
    if (response.ok && response.body && (response.headers.get('content-type') ?? '').includes('text/event-stream')) {
      let text = ''
      for await (const event of readSse(response.body, signal)) {
        let data: Record<string, unknown>
        try { data = JSON.parse(event.data) } catch { continue }
        if (event.event === 'token' && typeof data.t === 'string') {
          text += data.t
          onToken?.(text)
        } else if (event.event === 'meta') {
          onMeta?.(data as { suggestion?: string })
        } else if (event.event === 'done' || event.event === 'fallback') {
          return toResponse(data)
        }
      }
    }
  } catch (error) {
    if (isAbort(error) || signal?.aborted) throw error
  }
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  return assist(task, answers, signal, stepId)
}

/* -------------------------------------------------------------------------- */
/*  Website quick-look                                                        */
/* -------------------------------------------------------------------------- */

export type SiteScanStatus = 'running' | 'done' | 'failed'
export type SiteScanHighlight = { label: string; value: string; note?: string }
export type SiteScanView = {
  status: SiteScanStatus
  domain: string
  teaser: string | null
  /** false when the teaser is a plain summary of the data rather than an AI sentence. */
  teaserAi: boolean
  highlights: SiteScanHighlight[]
  disclaimer: string
}

export const SCAN_DISCLAIMER = 'Based on public data (Google, Moz/DataForSEO). Estimates, not your private analytics.'

export const SCAN_CHECKS =['onPage', 'performance', 'authority', 'traffic', 'analysis'] as const
export type ScanCheck = (typeof SCAN_CHECKS)[number]
export type ScanCheckState = { status: 'ok' | 'skipped' | 'error'; highlights: SiteScanHighlight[] }

/** "yourbrand.com" from whatever the customer typed. */
export function displayDomain(raw: string): string {
  return raw.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[/?#]/)[0].replace(/^www\./i, '').toLowerCase()
}

/** Starts (or reuses) the background website quick-look. Null if it couldn't start — the flow carries on regardless. */
export async function startSiteScan(url: string, answers: Answers): Promise<{ scanId: string; status: SiteScanStatus } | null> {
  try {
    const response = await fetch('/api/questionnaire/site-scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, answers }),
    })
    if (!response.ok) return null
    const data = await response.json()
    return typeof data?.scanId === 'string' ? { scanId: data.scanId, status: data.status } : null
  } catch {
    return null
  }
}

const FAILED_VIEW: SiteScanView = { status: 'failed', domain: '', teaser: null, teaserAi: false, highlights: [], disclaimer: '' }

/** The customer-safe view of a scan; null on a transient failure (try again later). */
export async function getSiteScan(id: string, signal?: AbortSignal): Promise<SiteScanView | null> {
  try {
    const response = await fetch(`/api/questionnaire/site-scan/${encodeURIComponent(id)}`, { cache: 'no-store', signal })
    if (response.status === 404 || response.status === 400) return FAILED_VIEW
    if (!response.ok) return null
    return (await response.json()) as SiteScanView
  } catch {
    return null
  }
}

export type ScanWatchHandlers = {
  onStep: (check: ScanCheck, state: ScanCheckState) => void
  onTeaser?: (text: string, ai: boolean) => void
  onDone: (view: SiteScanView) => void
  onFailed: () => void
  signal: AbortSignal
  /** Polling fallback: keep going while this returns true. */
  keepPolling?: () => boolean
}

const POLL_MS = 4_000
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => { clearTimeout(t); resolve() }, { once: true })
  })

/**
 * Follows a scan live over its SSE stream. If the stream drops (or a host
 * buffers it until it closes without an ending), it reconnects once, then
 * falls back to polling GET /api/questionnaire/site-scan/[id] every 4 s.
 */
export async function watchSiteScan(id: string, h: ScanWatchHandlers): Promise<void> {
  for (let attempt = 0; attempt < 2 && !h.signal.aborted; attempt++) {
    try {
      const response = await fetch(`/api/questionnaire/site-scan/${encodeURIComponent(id)}/stream`, { cache: 'no-store', signal: h.signal })
      if (response.status === 400 || response.status === 404) { h.onFailed(); return }
      if (!response.ok || !response.body || !(response.headers.get('content-type') ?? '').includes('text/event-stream')) continue
      for await (const event of readSse(response.body, h.signal)) {
        let data: Record<string, unknown>
        try { data = JSON.parse(event.data) } catch { continue }
        if (event.event === 'step' && (SCAN_CHECKS as readonly string[]).includes(String(data.step))) {
          h.onStep(data.step as ScanCheck, { status: data.status as ScanCheckState['status'], highlights: (data.highlights as SiteScanHighlight[]) ?? [] })
        } else if (event.event === 'teaser' && typeof data.text === 'string') {
          h.onTeaser?.(data.text, data.ai === true)
        } else if (event.event === 'done') {
          h.onDone({
            status: 'done',
            domain: String(data.domain ?? ''),
            teaser: typeof data.teaser === 'string' ? data.teaser : null,
            teaserAi: data.teaserAi === true,
            highlights: (data.highlights as SiteScanHighlight[]) ?? [],
            disclaimer: String(data.disclaimer ?? ''),
          })
          return
        } else if (event.event === 'failed') {
          h.onFailed()
          return
        }
      }
    } catch {
      if (h.signal.aborted) return
    }
  }

  while (!h.signal.aborted && (h.keepPolling?.() ?? true)) {
    const view = await getSiteScan(id, h.signal)
    if (view?.status === 'done') { h.onDone(view); return }
    if (view?.status === 'failed') { h.onFailed(); return }
    await wait(POLL_MS, h.signal)
  }
}

/* -------------------------------------------------------------------------- */
/*  Submission and dev status                                                 */
/* -------------------------------------------------------------------------- */

export type SubmitResult = { ok: boolean; brief?: Brief; briefAi?: boolean; error?: string; stepId?: string }

export async function submitQuestionnaire(answers: Answers, honeypot: string): Promise<SubmitResult> {
  try {
    const response = await fetch('/api/questionnaire', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers, website_url: honeypot }),
    })
    const data = await response.json().catch(() => ({}))
    if (response.ok) return { ok: true, brief: data.brief, briefAi: data.briefAi === true }
    return { ok: false, error: data.error ?? 'That didn’t go through.', stepId: data.stepId, brief: data.brief, briefAi: data.briefAi === true }
  } catch {
    return { ok: false, error: 'You seem to be offline.' }
  }
}

/** Development only: whether an AI provider is configured (the route 404s in production). */
export async function getAiStatus(): Promise<{ aiProvider: string | null } | null> {
  try {
    const response = await fetch('/api/questionnaire/status', { cache: 'no-store' })
    return response.ok ? await response.json() : null
  } catch {
    return null
  }
}
