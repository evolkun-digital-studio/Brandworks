import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { POST as streamRoute } from '../../../app/api/questionnaire/assist/stream/route'
import { POST as assistRoute } from '../../../app/api/questionnaire/assist/route'
import { readSse, type SseEvent } from '../../questionnaire/sse'
import {
  ModelStreamError,
  NEUTRAL,
  briefFocus,
  briefSummary,
  parseRecommendType,
  recommendReason,
  runTaskStream,
  streamModel,
  suggestionItems,
} from './ai'
import { parseAssistBody } from './assistRequest'
import { sanitizeAnswers } from './validation'

const scratch = {
  brandName: 'Chai & Co.',
  workType: 'restaurant-cafe-food-brand',
  operation: 'offline-business-moving-online',
  projectStage: 'scratch',
  websiteType: 'business',
}

/** A streamed HTTP body delivered in exactly these chunks. */
function streamed(chunks: string[], init: ResponseInit = {}) {
  const enc = new TextEncoder()
  return new Response(new ReadableStream({ start(c) { for (const ch of chunks) c.enqueue(enc.encode(ch)); c.close() } }), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
    ...init,
  })
}

const openaiDelta = (content: string) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
const openaiStream = (...parts: string[]) => streamed([`data: ${JSON.stringify({ choices: [{ delta: { role: 'assistant' } }] })}\n\n`, ...parts.map(openaiDelta), 'data: [DONE]\n\n'])

async function collect(gen: AsyncIterable<string>) {
  const out: string[] = []
  for await (const t of gen) out.push(t)
  return out
}

async function eventsOf(response: Response): Promise<SseEvent[]> {
  const out: SseEvent[] = []
  for await (const e of readSse(response.body!)) out.push(e)
  return out
}

let ip = 0
const post = (body: unknown, signal?: AbortSignal) =>
  new Request('http://localhost/api/questionnaire/assist/stream', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.0.${++ip}` },
    body: JSON.stringify(body),
    signal,
  })

beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', '')
  vi.stubEnv('ANTHROPIC_API_KEY', '')
  vi.stubEnv('AI_PROVIDER', '')
  vi.stubEnv('OPENAI_MODEL', '')
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/* -------------------------------------------------------------------------- */
/*  streamModel                                                               */
/* -------------------------------------------------------------------------- */

describe('streamModel', () => {
  it('OpenAI: sends stream: true and yields delta.content, skipping empty deltas, even when chunks split lines', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    const fetchImpl = vi.fn<typeof fetch>(async () => streamed([
      'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"Chai"}}]}\n\ndata: {"choi',
      'ces":[{"delta":{"content":" & Co."}}]}\n\n',
      'data: {"choices":[{"delta":{"content":""}}]}\n\n',
      'data: [DONE]\n\n',
      'data: {"choices":[{"delta":{"content":"after done"}}]}\n\n',
    ]))
    expect(await collect(streamModel('hi', 60, undefined, fetchImpl))).toEqual(['Chai', ' & Co.'])
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]!.body))
    expect(body).toMatchObject({ stream: true, max_completion_tokens: 2060, model: 'gpt-4.1-mini' })
    expect(body.messages[0].role).toBe('system')
  })

  it('Anthropic: yields text_delta from content_block_delta and stops at message_stop', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'a-key')
    const fetchImpl = vi.fn<typeof fetch>(async () => streamed([
      'event: message_start\ndata: {"type":"message_start","message":{}}\n\n',
      'event: content_block_start\ndata: {"type":"content_block_start","index":0}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hel"}}\n\nev',
      'ent: ping\ndata: {"type":"ping"}\n\nevent: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":""}}\n\n',
      'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"lo"}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ]))
    expect(await collect(streamModel('hi', 60, undefined, fetchImpl))).toEqual(['Hel', 'lo'])
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]!.body))).toMatchObject({ stream: true, max_tokens: 60 })
  })

  it('throws on an API error status, with the reason', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-bad')
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response('{"error":{"message":"Incorrect API key"}}', { status: 401 }))
    await expect(collect(streamModel('hi', 60, undefined, fetchImpl))).rejects.toMatchObject({ name: 'ModelStreamError', status: 401 })
  })

  it('throws on an error event mid-stream', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'a-key')
    const fetchImpl = vi.fn<typeof fetch>(async () => streamed([
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}\n\n',
      'event: error\ndata: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}\n\n',
    ]))
    await expect(collect(streamModel('hi', 60, undefined, fetchImpl))).rejects.toBeInstanceOf(ModelStreamError)
  })
})

/* -------------------------------------------------------------------------- */
/*  Line formats                                                              */
/* -------------------------------------------------------------------------- */

describe('line formats', () => {
  it('recommend-type: the TYPE line is known once it ends; only the reason streams', () => {
    expect(parseRecommendType('TYPE: store')).toBeNull()
    expect(parseRecommendType('TYPE: Store\n')).toBe('store')
    expect(parseRecommendType('TYPE: app\n')).toBeNull()
    expect(recommendReason('TYPE: store\nREA')).toBe('')
    expect(recommendReason('TYPE: store\nREASON: You sell')).toBe('You sell')
  })

  it('brief: streams the summary, holds back a FOCUS line as it starts, then parses up to 4 items', () => {
    expect(briefSummary('SUMM')).toBe('')
    expect(briefSummary('SUMMARY: You want a site.\nFO')).toBe('You want a site.')
    const raw = 'SUMMARY: You want a site.\nFOCUS:\n- Menu\n- Booking\n- SEO\n- Photos\n- Extra'
    expect(briefSummary(raw, true)).toBe('You want a site.')
    expect(briefFocus(raw)).toEqual(['Menu', 'Booking', 'SEO', 'Photos'])
  })

  it('suggest: "- " lines, at most 6 words and 5 items, de-duplicated', () => {
    expect(suggestionItems('- Online table booking.\n- online table booking\n- A very long idea that has far too many words\n- WhatsApp order updates\nNot a bullet\n- Loyalty stamps\n- Gift cards\n- Catering menu\n- Reviews wall')).toEqual([
      'Online table booking', 'WhatsApp order updates', 'Loyalty stamps', 'Gift cards', 'Catering menu',
    ])
  })
})

/* -------------------------------------------------------------------------- */
/*  runTaskStream: react + suggest                                            */
/* -------------------------------------------------------------------------- */

describe('react and suggest', () => {
  it('react: one sentence about the step just answered, capped at 60 tokens', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    const fetchImpl = vi.fn<typeof fetch>(async () => openaiStream('A café moving online ', 'needs its menu and hours front and centre.'))
    const tokens: string[] = []
    const out = await runTaskStream('react', scratch, { stepId: 'workType' }, { fetchImpl, onToken: (t) => tokens.push(t) })
    expect(out).toEqual({ ai: true, text: 'A café moving online needs its menu and hours front and centre.', extras: {} })
    expect(tokens.join('')).toBe('A café moving online needs its menu and hours front and centre.')
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1]!.body))
    expect(body.max_completion_tokens).toBe(60 + 2000)
    const prompt = body.messages[1].content as string
    expect(prompt).toContain('Just answered — What kind of work do you do?')
    expect(prompt).toContain('Restaurant / Café / Food brand')
    expect(prompt).toContain('ONE sentence (max 22 words)')
    expect(prompt).toMatch(/<customer_answers>[\s\S]*Just answered[\s\S]*<\/customer_answers>/)
  })

  it('react: no reaction (empty neutral) for steps that are not aiReact, without calling the model', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    const fetchImpl = vi.fn<typeof fetch>()
    expect(await runTaskStream('react', scratch, { stepId: 'brandName' }, { fetchImpl })).toEqual({ ai: false, text: '', extras: {} })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('suggest: chips arrive together in the result (no tokens), capped at 80 tokens', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    const fetchImpl = vi.fn<typeof fetch>(async () => openaiStream('- Online table booking\n', '- WhatsApp order updates\n- Loyalty stamps'))
    const tokens: string[] = []
    const out = await runTaskStream('suggest', scratch, { stepId: 'usp' }, { fetchImpl, onToken: (t) => tokens.push(t) })
    expect(out?.extras.items).toEqual(['Online table booking', 'WhatsApp order updates', 'Loyalty stamps'])
    expect(tokens).toEqual([])
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]!.body)).max_completion_tokens).toBe(80 + 2000)
  })

  it('falls back to neutral copy when the stream fails before finishing', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response('quota', { status: 429 }))
    expect(await runTaskStream('greet', scratch, {}, { fetchImpl })).toEqual({ ai: false, text: NEUTRAL.greet, extras: {} })
  })
})

/* -------------------------------------------------------------------------- */
/*  Routes                                                                    */
/* -------------------------------------------------------------------------- */

describe('POST /api/questionnaire/assist/stream', () => {
  it('streams token events then done, with SSE headers', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => openaiStream('Lovely to meet ', 'Chai & Co.')))
    const response = await streamRoute(post({ task: 'greet', answers: scratch }))
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    expect(response.headers.get('cache-control')).toBe('no-cache, no-transform')
    expect(response.headers.get('x-accel-buffering')).toBe('no')
    const events = await eventsOf(response)
    expect(events.filter((e) => e.event === 'token').map((e) => JSON.parse(e.data).t)).toEqual(['Lovely to meet ', 'Chai & Co.'])
    expect(JSON.parse(events.at(-1)!.data)).toEqual({ ai: true, text: 'Lovely to meet Chai & Co.' })
    expect(events.at(-1)!.event).toBe('done')
  })

  it('recommend-type: meta (the type) first, then only the reason as tokens', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => openaiStream('TYPE: book', 'ing\nREASON: Your guests ', 'mostly reserve a table.')))
    const events = await eventsOf(await streamRoute(post({ task: 'recommend-type', answers: scratch })))
    expect(events.map((e) => e.event)).toEqual(['meta', 'token', 'token', 'done'])
    expect(JSON.parse(events[0].data)).toEqual({ suggestion: 'booking' })
    expect(events.filter((e) => e.event === 'token').map((e) => JSON.parse(e.data).t).join('')).toBe('Your guests mostly reserve a table.')
    expect(JSON.parse(events.at(-1)!.data)).toEqual({ ai: true, text: 'Your guests mostly reserve a table.', suggestion: 'booking' })
  })

  it('sends a fallback event with neutral copy when no AI key is configured', async () => {
    const fetchSpy = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchSpy)
    const events = await eventsOf(await streamRoute(post({ task: 'greet', answers: scratch })))
    expect(events).toEqual([{ event: 'fallback', data: JSON.stringify({ ai: false, text: NEUTRAL.greet }) }])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('enforces the reaction limit per IP (fallback without calling the model)', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    vi.stubEnv('QUESTIONNAIRE_REACT_LIMIT', '1')
    const fetchSpy = vi.fn<typeof fetch>(async () => openaiStream('A café moving online needs its menu up front.'))
    vi.stubGlobal('fetch', fetchSpy)
    const headers = { 'content-type': 'application/json', 'x-forwarded-for': '10.8.8.8' }
    const body = JSON.stringify({ task: 'react', answers: scratch, stepId: 'workType' })
    const url = 'http://localhost/api/questionnaire/assist/stream'
    const first = await eventsOf(await streamRoute(new Request(url, { method: 'POST', headers, body })))
    const second = await eventsOf(await streamRoute(new Request(url, { method: 'POST', headers, body })))
    expect(first.at(-1)!.event).toBe('done')
    expect(second).toEqual([{ event: 'fallback', data: JSON.stringify({ ai: false, text: '' }) }])
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('aborts the upstream model request when the visitor disconnects', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    let upstream: AbortSignal | undefined
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async (_url, init) => {
      upstream = init!.signal!
      const enc = new TextEncoder()
      return new Response(new ReadableStream({
        start(c) {
          c.enqueue(enc.encode(openaiDelta('First words')))
          upstream!.addEventListener('abort', () => c.error(new DOMException('Aborted', 'AbortError')))
        },
      }), { status: 200, headers: { 'content-type': 'text/event-stream' } })
    }))
    const visitor = new AbortController()
    const response = await streamRoute(post({ task: 'greet', answers: scratch }, visitor.signal))
    const reader = readSse(response.body!)
    const first = await reader.next()
    expect(first.value).toMatchObject({ event: 'token' })
    visitor.abort()
    await new Promise((r) => setTimeout(r, 20))
    expect(upstream?.aborted).toBe(true)
    await reader.return(undefined)
  })

  it('rejects unknown tasks and react without a step id', async () => {
    expect((await streamRoute(post({ task: 'brief', answers: scratch }))).status).toBe(400)
    expect((await streamRoute(post({ task: 'react', answers: scratch }))).status).toBe(400)
    expect(parseAssistBody({ task: 'suggest', stepId: 'nope', answers: {} })).toBeNull()
    expect(parseAssistBody({ task: 'suggest', stepId: 'featuresWanted', answers: {} })?.ctx).toEqual({ stepId: 'featuresWanted' })
  })
})

describe('POST /api/questionnaire/assist (non-streaming fallback)', () => {
  it('still answers with JSON and neutral copy when AI is off', async () => {
    const res = await assistRoute(new Request('http://localhost/api/questionnaire/assist', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.7.7.7' },
      body: JSON.stringify({ task: 'recommend-type', answers: { ...scratch, workType: 'fashion-clothing-brand' } }),
    }))
    expect(await res.json()).toMatchObject({ ai: false, suggestion: 'store' })
  })
})

describe('aiNotes', () => {
  it('keeps at most 6 notes of 200 characters', () => {
    const notes = Array.from({ length: 9 }, (_, i) => `${i} ${'x'.repeat(300)}`)
    const clean = sanitizeAnswers({ ...scratch, aiNotes: [...notes, 42, { evil: true }] }).aiNotes as string[]
    expect(clean).toHaveLength(6)
    expect(clean.every((n) => n.length <= 200)).toBe(true)
    expect(sanitizeAnswers({ ...scratch, aiNotes: 'not a list' }).aiNotes).toBeUndefined()
  })
})
