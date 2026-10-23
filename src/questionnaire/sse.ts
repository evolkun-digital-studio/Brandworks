/**
 * A small Server-Sent Events parser shared by the server (reading OpenAI /
 * Anthropic streams) and the browser (reading our own stream routes, which
 * are POSTs, so EventSource can't be used).
 *
 * Network chunks can end anywhere — mid-line, mid-field, even between "\r"
 * and "\n" — so the parser keeps the unfinished tail and only dispatches an
 * event at its blank line. Comment lines (": ping") are ignored.
 */

export type SseEvent = { event: string; data: string }

export type SseParser = {
  /** Feed a decoded text chunk; returns the events it completed. */
  push(chunk: string): SseEvent[]
  /** Call at end of stream: dispatches a final event that had no trailing blank line. */
  flush(): SseEvent[]
}

export function createSseParser(): SseParser {
  let buffer = ''
  let event = ''
  let data: string[] = []
  let hasData = false

  const dispatch = (out: SseEvent[]) => {
    if (hasData) out.push({ event: event || 'message', data: data.join('\n') })
    event = ''
    data = []
    hasData = false
  }

  const line = (text: string, out: SseEvent[]) => {
    if (text === '') { dispatch(out); return }
    if (text.startsWith(':')) return
    const colon = text.indexOf(':')
    const field = colon < 0 ? text : text.slice(0, colon)
    let value = colon < 0 ? '' : text.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'event') event = value
    else if (field === 'data') { data.push(value); hasData = true }
  }

  return {
    push(chunk) {
      const out: SseEvent[] = []
      buffer += chunk
      for (;;) {
        const match = /\r\n|\r|\n/.exec(buffer)
        if (!match) break
        // A lone "\r" at the very end may be the first half of "\r\n": wait for more.
        if (match[0] === '\r' && match.index === buffer.length - 1) break
        line(buffer.slice(0, match.index), out)
        buffer = buffer.slice(match.index + match[0].length)
      }
      return out
    },
    flush() {
      const out: SseEvent[] = []
      if (buffer) { line(buffer, out); buffer = '' }
      dispatch(out)
      return out
    },
  }
}

/** Reads a fetch body as SSE events, decoding UTF-8 safely across chunk boundaries. */
export async function* readSse(body: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<SseEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const parser = createSseParser()
  let finished = false
  const cancel = () => { void reader.cancel().catch(() => undefined) }
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      yield* parser.push(decoder.decode(value, { stream: true }))
    }
    finished = true
    yield* parser.push(decoder.decode())
    yield* parser.flush()
  } finally {
    signal?.removeEventListener('abort', cancel)
    // Stopped early (consumer broke out, or an error): cancel so the upstream connection closes.
    if (!finished) cancel()
  }
}

/** One SSE frame, as our routes send them. */
export function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
}
