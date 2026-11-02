import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const getScan = vi.fn()
vi.mock('./repository', () => ({
  getScan: (id: string) => getScan(id),
  isScanId: (id: unknown) => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id),
}))

import { GET } from '../../../app/api/questionnaire/site-scan/[id]/stream/route'
import { readSse, type SseEvent } from '../../questionnaire/sse'
import { collectAll } from './collectors'
import { stepHighlights } from './highlights'
import type { CollectorResult, OnPageData, PerformanceData } from './types'

const at = '2026-10-22T10:00:00.000Z'
const ID = '6ad9b9f9a0236f993c866e77'
const onPage: CollectorResult<OnPageData> = {
  status: 'ok', source: 'Homepage HTML (on-page check)', fetchedAt: at,
  data: {
    finalUrl: 'https://chaico.in/', statusCode: 200, https: true, responseTimeMs: 90, redirects: 0, htmlTruncated: false,
    title: { text: 'Secret title text', length: 17 }, metaDescription: { text: null, length: 0 }, h1Count: 1, canonical: null, lang: 'en',
    viewport: true, openGraph: {}, jsonLdTypes: [], robotsMeta: 'noindex-secret', noindex: false, robotsTxt: true, sitemapXml: true,
    sitemapInRobotsTxt: true, robotsTxtProblem: null, sitemapXmlProblem: null, wordCount: 10, images: { total: 0, missingAlt: 0 }, platform: null,
  },
}
const performance: CollectorResult<PerformanceData> = {
  status: 'ok', source: 'Google PageSpeed Insights', fetchedAt: at,
  data: {
    strategy: 'mobile',
    scores: { performance: 41, seo: 92, accessibility: 88, bestPractices: 96 },
    lab: { lcpMs: 4124, fcpMs: 1800, tbtMs: 610, cls: 0.08, speedIndexMs: 5100 },
    field: null,
  },
}
const skipped = (source: string): CollectorResult<never> => ({ status: 'skipped', source, fetchedAt: at, data: null, reason: 'SEO_DATA_PROVIDER is not set' })
const base = { _id: ID, domain: 'chaico.in', url: 'https://chaico.in/', paidSources: true, createdAt: new Date(), updatedAt: new Date(), expiresAt: new Date() }
const analysis = { headline: 'h', strengths: ['secret strength'], issues: [{ title: 'Secret issue', evidence: 'e', impact: 'i' }], opportunities: ['secret opportunity'], customerTeaser: 'Your homepage scored 41/100.', ai: true, droppedItems: 0 }

afterEach(() => { getScan.mockReset(); vi.restoreAllMocks() })

async function eventsOf(response: Response): Promise<SseEvent[]> {
  const out: SseEvent[] = []
  for await (const e of readSse(response.body!)) out.push(e)
  return out
}

describe('live scan progress', () => {
  it('collectAll reports each collector as it finishes', async () => {
    const order: string[] = []
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
    const fetchImpl = vi.fn<typeof fetch>(async () => json({ lighthouseResult: { categories: { performance: { score: 0.41 } }, audits: {} } }))
    const safeFetch = vi.fn(async () => { throw new Error('offline') })
    await collectAll(new URL('https://chaico.in/'), {
      allowPaid: false,
      deps: { fetch: fetchImpl, env: {}, safeFetch } as never,
      onResult: (step, result) => { order.push(`${step}:${result.status}`) },
    })
    expect(order.sort()).toEqual(['authority:skipped', 'onPage:error', 'pages:error', 'performance:ok', 'traffic:skipped'])
  })

  it('stepHighlights shows the customer nothing from the key-page crawl', () => {
    const pages = { status: 'ok' as const, source: 'Key pages', fetchedAt: at, data: { summary: { groupsNotFound: ['contact'] } } }
    expect(stepHighlights('pages', pages)).toEqual([])
  })

  it('stepHighlights gives only customer-safe, labelled metrics per step', () => {
    expect(stepHighlights('performance', performance)).toEqual([
      { label: 'Mobile performance (Google)', value: '41/100' },
      { label: 'Mobile LCP (Google, lab test)', value: '4.1 s' },
      { label: 'SEO score (Google)', value: '92/100' },
      { label: 'Accessibility score (Google)', value: '88/100' },
    ])
    expect(stepHighlights('onPage', onPage)).toEqual([{ label: 'Served over HTTPS', value: 'yes' }])
    expect(stepHighlights('authority', skipped('Authority'))).toEqual([])
  })
})

describe('GET /api/questionnaire/site-scan/[id]/stream', () => {
  it('ticks off each step as the scan document fills in, then sends the teaser and done', async () => {
    getScan
      .mockResolvedValueOnce({ ...base, status: 'running', results: { url: base.url, domain: base.domain, onPage }, analysis: null })
      .mockResolvedValueOnce({ ...base, status: 'running', results: { url: base.url, domain: base.domain, onPage, performance, authority: skipped('Authority'), traffic: skipped('Traffic') }, analysis: null })
      .mockResolvedValue({ ...base, status: 'done', results: { url: base.url, domain: base.domain, onPage, performance, authority: skipped('Authority'), traffic: skipped('Traffic') }, analysis })

    const response = await GET(new Request(`http://localhost/api/questionnaire/site-scan/${ID}/stream`, { headers: { 'x-forwarded-for': '10.6.0.1' } }), { params: Promise.resolve({ id: ID }) })
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    const events = await eventsOf(response)
    const steps = events.filter((e) => e.event === 'step').map((e) => JSON.parse(e.data))
    // This scan has no 'pages' (stored before the crawl existed): it ends as not available, never stuck pending.
    expect(steps.map((s) => `${s.step}:${s.status}`)).toEqual(['onPage:ok', 'performance:ok', 'authority:skipped', 'traffic:skipped', 'pages:skipped', 'analysis:ok'])
    expect(steps[1].highlights[0]).toEqual({ label: 'Mobile performance (Google)', value: '41/100' })
    expect(events.map((e) => e.event).slice(-2)).toEqual(['teaser', 'done'])
    expect(JSON.parse(events.at(-1)!.data)).toMatchObject({ teaser: 'Your homepage scored 41/100.', teaserAi: true, disclaimer: 'Based on public data (Google, Moz/DataForSEO). Estimates, not your private analytics.' })

    const everything = events.map((e) => e.data).join('\n')
    for (const secret of ['Secret title', 'noindex-secret', 'secret strength', 'Secret issue', 'secret opportunity', 'lighthouse', 'SEO_DATA_PROVIDER']) {
      expect(everything).not.toContain(secret)
    }
  }, 10_000)

  it('sends failed for a missing scan and rejects a bad id', async () => {
    getScan.mockResolvedValue(null)
    const events = await eventsOf(await GET(new Request('http://localhost/x', { headers: { 'x-forwarded-for': '10.6.0.2' } }), { params: Promise.resolve({ id: ID }) }))
    expect(events.map((e) => e.event)).toEqual(['failed'])
    const bad = await GET(new Request('http://localhost/x'), { params: Promise.resolve({ id: 'not-an-id' }) })
    expect(bad.status).toBe(400)
  })
})
