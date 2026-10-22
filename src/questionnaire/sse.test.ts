import { describe, expect, it } from 'vitest'
import { createSseParser, readSse, sseFrame } from './sse'

const feed = (chunks: string[]) => {
  const parser = createSseParser()
  return [...chunks.flatMap((c) => parser.push(c)), ...parser.flush()]
}

const bodyOf = (chunks: (string | Uint8Array)[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (const chunk of chunks) c.enqueue(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk)
      c.close()
    },
  })

describe('SSE parser', () => {
  it('parses named events and plain data events', () => {
    expect(feed(['event: token\ndata: {"t":"Hi"}\n\ndata: [DONE]\n\n'])).toEqual([
      { event: 'token', data: '{"t":"Hi"}' },
      { event: 'message', data: '[DONE]' },
    ])
  })

  it('handles chunks split mid-line, mid-field and between \\r and \\n', () => {
    const events = feed(['ev', 'ent: tok', 'en\r', '\ndata: {"t":', '"split"}\r', '\n', '\r\n'])
    expect(events).toEqual([{ event: 'token', data: '{"t":"split"}' }])
  })

  it('joins multi-line data, ignores comments, and flushes a final event without a blank line', () => {
    expect(feed([': ping\n\n', 'data: a\ndata: b\n\n', 'event: done\ndata: last'])).toEqual([
      { event: 'message', data: 'a\nb' },
      { event: 'done', data: 'last' },
    ])
  })

  it('reads a fetch body, decoding UTF-8 split across chunks', async () => {
    const bytes = new TextEncoder().encode('data: {"t":"café ₹"}\n\n')
    const cut = bytes.indexOf(0xe2) + 1 // inside the 3-byte "₹"
    const events = []
    for await (const e of readSse(bodyOf([bytes.slice(0, cut), bytes.slice(cut)]))) events.push(e)
    expect(events).toEqual([{ event: 'message', data: '{"t":"café ₹"}' }])
  })

  it('round-trips our own frames', () => {
    expect(feed([sseFrame('done', { ai: true, text: 'line\nbreak' })])).toEqual([{ event: 'done', data: '{"ai":true,"text":"line\\nbreak"}' }])
  })
})
