import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const m = vi.hoisted(() => ({
  findReusableScan: vi.fn(),
  restartScan: vi.fn(),
  beginRun: vi.fn(),
  saveStep: vi.fn(),
  completeScan: vi.fn(),
  failScan: vi.fn(),
  countScansToday: vi.fn(),
  createScan: vi.fn(),
  analyseSite: vi.fn(),
  collectOnPage: vi.fn(),
  collectPages: vi.fn(),
  collectPerformance: vi.fn(),
  collectAuthority: vi.fn(),
  collectTraffic: vi.fn(),
}))

vi.mock('./repository', () => ({
  findReusableScan: m.findReusableScan,
  restartScan: m.restartScan,
  beginRun: m.beginRun,
  saveStep: m.saveStep,
  completeScan: m.completeScan,
  failScan: m.failScan,
  countScansToday: m.countScansToday,
  createScan: m.createScan,
}))
vi.mock('./analyse', () => ({ analyseSite: m.analyseSite }))
vi.mock('./collectors/onPage', () => ({ collectOnPage: m.collectOnPage, ON_PAGE_SOURCE: 'on-page' }))
vi.mock('./collectors/pages', () => ({ collectPages: m.collectPages, PAGES_SOURCE: 'pages' }))
vi.mock('./collectors/performance', () => ({ collectPerformance: m.collectPerformance, PERFORMANCE_SOURCE: 'performance' }))
vi.mock('./collectors/authority', () => ({ collectAuthority: m.collectAuthority }))
vi.mock('./collectors/traffic', () => ({ collectTraffic: m.collectTraffic, TRAFFIC_SOURCE: 'traffic' }))

import { publicScanView } from './highlights'
import { startSiteScan } from './run'
import { isCompleteResults, type PartialScanResults, type ScanResults } from './types'

const NOW = new Date('2026-10-22T10:00:00Z')
const at = '2026-10-20T00:00:00.000Z'
const ID = '6ad9b9f9a0236f993c866e77'
const result = (status: 'ok' | 'error', tag: string) => ({ status, source: tag, fetchedAt: at, data: status === 'ok' ? ({ tag } as never) : null })

const stored = (over: Partial<ScanResults> = {}): ScanResults => ({
  url: 'https://chaico.in/',
  domain: 'chaico.in',
  onPage: result('ok', 'old on-page'),
  performance: result('ok', 'old performance'),
  authority: result('ok', 'paid authority'),
  traffic: result('ok', 'paid traffic'),
  ...over,
})
const cachedScan = (results: ScanResults, minutesAgo = 60, status = 'done') => ({
  _id: { toHexString: () => ID },
  domain: 'chaico.in',
  url: 'https://chaico.in/',
  status,
  results,
  analysis: { customerTeaser: 'Old teaser', ai: true },
  paidSources: true,
  createdAt: new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000),
  updatedAt: new Date(NOW.getTime() - minutesAgo * 60 * 1000),
})

const collectorsCalled = () => Object.entries({
  onPage: m.collectOnPage, pages: m.collectPages, performance: m.collectPerformance, authority: m.collectAuthority, traffic: m.collectTraffic,
}).filter(([, fn]) => fn.mock.calls.length > 0).map(([name]) => name)

beforeEach(() => {
  vi.clearAllMocks()
  m.analyseSite.mockResolvedValue({ customerTeaser: 'New teaser', ai: true })
  m.collectOnPage.mockResolvedValue(result('ok', 'new on-page'))
  m.collectPages.mockResolvedValue(result('ok', 'new pages'))
  m.collectPerformance.mockResolvedValue(result('ok', 'new performance'))
  m.collectAuthority.mockResolvedValue(result('ok', 'new authority'))
  m.collectTraffic.mockResolvedValue(result('ok', 'new traffic'))
})

describe('reusing a cached scan', () => {
  it('re-runs ONLY the pages collector for an old scan without pages, keeping paid data', async () => {
    m.findReusableScan.mockResolvedValue(cachedScan(stored()))
    const started = await startSiteScan(new URL('https://chaico.in/'), {}, NOW)
    expect(started).toMatchObject({ scanId: ID, status: 'running' })
    expect(m.restartScan).toHaveBeenCalledWith(ID, NOW)

    await started.run!()

    expect(collectorsCalled()).toEqual(['pages'])
    expect(m.failScan).not.toHaveBeenCalled()
    const [, saved] = m.completeScan.mock.calls[0]
    expect(saved).toMatchObject({
      onPage: { source: 'old on-page' },
      performance: { source: 'old performance' },
      authority: { source: 'paid authority' },
      traffic: { source: 'paid traffic' },
      pages: { source: 'new pages' },
    })
    expect(m.analyseSite).toHaveBeenCalledOnce()
    // Every step is re-reported, so the live checklist ticks off again.
    expect(m.saveStep.mock.calls.map(([, step]) => step).sort()).toEqual(['authority', 'onPage', 'pages', 'performance', 'traffic'])
  })

  it('finishes the re-run, not crashes, when the pages collector throws', async () => {
    m.findReusableScan.mockResolvedValue(cachedScan(stored()))
    m.collectPages.mockRejectedValue(new Error('boom'))
    const started = await startSiteScan(new URL('https://chaico.in/'), {}, NOW)
    await started.run!()
    expect(m.failScan).not.toHaveBeenCalled()
    expect(m.completeScan.mock.calls[0][1]).toMatchObject({ pages: { status: 'error', reason: 'boom' }, authority: { source: 'paid authority' } })
  })

  it('reuses a complete scan as it is', async () => {
    m.findReusableScan.mockResolvedValue(cachedScan(stored({ pages: result('ok', 'old pages') })))
    expect(await startSiteScan(new URL('https://chaico.in/'), {}, NOW)).toEqual({ scanId: ID, status: 'done' })
    expect(m.restartScan).not.toHaveBeenCalled()
  })

  it('leaves a scan that is already running alone, even without pages yet', async () => {
    const running = { url: 'https://chaico.in/', domain: 'chaico.in', onPage: result('ok', 'x') } as unknown as ScanResults
    m.findReusableScan.mockResolvedValue(cachedScan(running, 1, 'running'))
    expect(await startSiteScan(new URL('https://chaico.in/'), {}, NOW)).toEqual({ scanId: ID, status: 'running' })
    expect(m.restartScan).not.toHaveBeenCalled()
  })

  it('retries a failed pages check after 15 minutes, on its own', async () => {
    const results = stored({ pages: result('error', 'old pages') })
    m.findReusableScan.mockResolvedValue(cachedScan(results, 10))
    expect(await startSiteScan(new URL('https://chaico.in/'), {}, NOW)).toEqual({ scanId: ID, status: 'done' })

    m.findReusableScan.mockResolvedValue(cachedScan(results, 16))
    const started = await startSiteScan(new URL('https://chaico.in/'), {}, NOW)
    await started.run!()
    expect(collectorsCalled()).toEqual(['pages'])
  })

  it('still retries other failed free checks, and never re-bills the paid ones', async () => {
    m.findReusableScan.mockResolvedValue(cachedScan(stored({ performance: result('error', 'old performance'), pages: result('ok', 'old pages') }), 16))
    const started = await startSiteScan(new URL('https://chaico.in/'), {}, NOW)
    await started.run!()
    expect(collectorsCalled()).toEqual(['performance'])
  })

  it('an old scan with a recent free failure only gains pages; once overdue, retries the failure too', async () => {
    const results = stored({ onPage: result('error', 'old on-page') })
    m.findReusableScan.mockResolvedValue(cachedScan(results, 10))
    await (await startSiteScan(new URL('https://chaico.in/'), {}, NOW)).run!()
    expect(collectorsCalled()).toEqual(['pages'])

    vi.clearAllMocks()
    m.findReusableScan.mockResolvedValue(cachedScan(results, 16))
    await (await startSiteScan(new URL('https://chaico.in/'), {}, NOW)).run!()
    expect(collectorsCalled()).toEqual(['onPage', 'pages'])
  })

  it('runs every collector for a brand-new scan', async () => {
    m.findReusableScan.mockResolvedValue(null)
    m.countScansToday.mockResolvedValue(0)
    m.createScan.mockResolvedValue(ID)
    await (await startSiteScan(new URL('https://chaico.in/'), {}, NOW)).run!()
    expect(collectorsCalled()).toEqual(['onPage', 'pages', 'performance', 'authority', 'traffic'])
  })

  it('still runs pages over the daily cap, since it is free', async () => {
    m.findReusableScan.mockResolvedValue(null)
    m.countScansToday.mockResolvedValue(100_000)
    m.createScan.mockResolvedValue(ID)
    await (await startSiteScan(new URL('https://chaico.in/'), {}, NOW)).run!()
    expect(collectorsCalled()).toEqual(['onPage', 'pages', 'performance'])
  })
})

describe('old scans read directly', () => {
  it('count as complete without pages, but a partial scan does not', () => {
    expect(isCompleteResults(stored())).toBe(true)
    const partial: PartialScanResults = { url: 'https://chaico.in/', domain: 'chaico.in', onPage: result('ok', 'x') }
    expect(isCompleteResults(partial)).toBe(false)
    expect(isCompleteResults(null)).toBe(false)
  })

  it('still produce the public view', () => {
    const results = stored({ performance: result('error', 'x'), authority: result('error', 'x'), traffic: result('error', 'x') })
    const view = publicScanView({ status: 'done', domain: 'chaico.in', results, analysis: { customerTeaser: 'Teaser', ai: true } as never })
    expect(view).toMatchObject({ status: 'done', teaser: 'Teaser' })
  })
})
