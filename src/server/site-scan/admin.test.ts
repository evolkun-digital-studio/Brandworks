import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))

const m = vi.hoisted(() => ({
  admin: { current: { _id: 'admin-id', username: 'owner', role: 'admin' } as Record<string, unknown> },
  afterTasks: [] as Array<() => Promise<void>>,
  collections: {} as Record<string, Record<string, ReturnType<typeof vi.fn>>>,
  analyseSite: vi.fn(),
  collectOnPage: vi.fn(),
  collectPages: vi.fn(),
  collectPerformance: vi.fn(),
  collectAuthority: vi.fn(),
  collectTraffic: vi.fn(),
}))

vi.mock('next/server', async (original) => ({ ...(await original<typeof import('next/server')>()), after: (task: () => Promise<void>) => { m.afterTasks.push(task) } }))
vi.mock('../admin/auth', () => ({ verifyAdminToken: () => ({ sub: 'admin-id' }), getActiveAdmin: async () => m.admin.current }))
vi.mock('../db/client', () => ({ getDatabase: async () => ({ collection: (name: string) => (m.collections[name] ??= {}) }) }))
vi.mock('./analyse', () => ({ analyseSite: m.analyseSite }))
vi.mock('./collectors/onPage', () => ({ collectOnPage: m.collectOnPage, ON_PAGE_SOURCE: 'on-page' }))
vi.mock('./collectors/pages', () => ({ collectPages: m.collectPages, PAGES_SOURCE: 'pages' }))
vi.mock('./collectors/performance', () => ({ collectPerformance: m.collectPerformance, PERFORMANCE_SOURCE: 'performance' }))
vi.mock('./collectors/authority', () => ({ collectAuthority: m.collectAuthority }))
vi.mock('./collectors/traffic', () => ({ collectTraffic: m.collectTraffic, TRAFFIC_SOURCE: 'traffic' }))

import { GET as listRoute } from '../../../app/api/admin/site-scans/route'
import { DELETE as deleteRoute, GET as detailRoute } from '../../../app/api/admin/site-scans/[id]/route'
import { POST as rescanRoute } from '../../../app/api/admin/site-scans/[id]/rescan/route'
import { getScanForAdmin, listScans, SCAN_LIST_PROJECTION, scrubSecrets } from './adminRepository'
import { STALE_RUNNING_MS } from './repository'

const ID = '6ad9b9f9a0236f993c866e77'
const NOW = new Date('2026-10-22T10:00:00Z')
const at = '2026-10-20T00:00:00.000Z'
const OWNER = { _id: 'admin-id', username: 'owner', role: 'admin' }
const SUB_ADMIN = { _id: 'sub-id', username: 'helper', role: 'sub_admin' }

const result = (tag: string, data: unknown = { tag }) => ({ status: 'ok', source: tag, fetchedAt: at, data })

const scanDoc = (over: Record<string, unknown> = {}) => ({
  _id: new ObjectId(ID),
  domain: 'chaico.in',
  url: 'https://chaico.in/',
  status: 'done',
  results: {
    url: 'https://chaico.in/',
    domain: 'chaico.in',
    onPage: result('old on-page'),
    pages: result('old pages'),
    performance: result('old performance'),
    authority: result('paid authority'),
    traffic: result('paid traffic'),
  },
  analysis: { headline: 'h', strengths: [], issues: [], opportunities: [], customerTeaser: 't', ai: true, droppedItems: 0 },
  paidSources: true,
  createdAt: new Date('2026-10-20T00:00:00Z'),
  updatedAt: new Date('2026-10-21T00:00:00Z'),
  expiresAt: new Date('2026-10-28T00:00:00Z'),
  ...over,
})

function cursor(docs: unknown[]) {
  const chain = { sort: vi.fn(() => chain), skip: vi.fn(() => chain), limit: vi.fn(() => chain), toArray: vi.fn(async () => docs) }
  return chain
}

function setUp({ doc = scanDoc() as ReturnType<typeof scanDoc> | null, claimed = doc as ReturnType<typeof scanDoc> | null, listed = [] as unknown[], submissions = [] as unknown[], answers = null as unknown } = {}) {
  const list = cursor(listed)
  m.collections.site_scans = {
    find: vi.fn(() => list),
    countDocuments: vi.fn(async () => listed.length),
    findOne: vi.fn(async () => doc),
    findOneAndUpdate: vi.fn(async () => claimed),
    deleteOne: vi.fn(async () => ({ deletedCount: doc ? 1 : 0 })),
    updateOne: vi.fn(async () => ({ matchedCount: 1 })),
  }
  m.collections.project_questionnaires = {
    find: vi.fn(() => cursor(submissions)),
    findOne: vi.fn(async () => answers),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
  }
  m.collections.activity_logs = { insertOne: vi.fn(async () => ({})) }
  return { list }
}

const request = (path: string, method = 'GET') => new NextRequest(`http://localhost/api/admin/site-scans${path}`, { method, headers: { cookie: 'admin_session=token' } })
const params = (id = ID) => ({ params: Promise.resolve({ id }) })
const activity = () => m.collections.activity_logs.insertOne.mock.calls.map(([doc]) => doc)

beforeEach(() => {
  vi.clearAllMocks()
  m.admin.current = OWNER
  m.afterTasks.length = 0
  m.analyseSite.mockResolvedValue({ headline: 'new', strengths: [], issues: [], opportunities: [], customerTeaser: 'new', ai: true, droppedItems: 0 })
  m.collectOnPage.mockResolvedValue(result('new on-page'))
  m.collectPages.mockResolvedValue(result('new pages'))
  m.collectPerformance.mockResolvedValue(result('new performance'))
  m.collectAuthority.mockResolvedValue(result('BILLED authority'))
  m.collectTraffic.mockResolvedValue(result('BILLED traffic'))
})

describe('listScans', () => {
  it('asks Mongo only for summary fields, never full results', async () => {
    const { list } = setUp()
    await listScans()
    const [, options] = m.collections.site_scans.find.mock.calls[0]
    expect(options.projection).toBe(SCAN_LIST_PROJECTION)
    const fields = Object.keys(SCAN_LIST_PROJECTION)
    for (const whole of ['results', 'results.pages', 'results.pages.data', 'results.pages.data.pages', 'results.onPage.data', 'results.performance.data', 'analysis', 'analysis.issues']) {
      expect(fields).not.toContain(whole)
    }
    expect(fields.filter((field) => field.startsWith('results.onPage'))).toEqual(['results.onPage.status', 'results.onPage.reason'])
    expect(list.sort).toHaveBeenCalledWith({ updatedAt: -1 })
  })

  it('escapes regex characters in the search and filters by status', async () => {
    setUp()
    await listScans({ q: ' a.b(c)* ', status: 'failed' })
    const [filter] = m.collections.site_scans.find.mock.calls[0]
    expect(filter).toEqual({ domain: { $regex: 'a\\.b\\(c\\)\\*', $options: 'i' }, status: 'failed' })
    expect(m.collections.site_scans.countDocuments).toHaveBeenCalledWith(filter)
  })

  it('applies pagination, defaulting to 25 and capping at 100', async () => {
    const { list } = setUp()
    expect(await listScans()).toMatchObject({ page: 1, pageSize: 25 })
    expect(list.limit).toHaveBeenLastCalledWith(25)
    expect(await listScans({ page: 3, pageSize: 5000 })).toMatchObject({ page: 3, pageSize: 100 })
    expect(list.limit).toHaveBeenLastCalledWith(100)
    expect(list.skip).toHaveBeenLastCalledWith(200)
    expect(await listScans({ page: -4, pageSize: -1 })).toMatchObject({ page: 1, pageSize: 1 })
  })

  it('summarises each collector and keeps the two authority metrics apart', async () => {
    const authority = (data: unknown) => scanDoc({
      results: {
        performance: { status: 'ok', data: { scores: { performance: 41, seo: 92 } } },
        authority: { status: 'ok', data },
        traffic: { status: 'skipped', reason: 'SITE_SCAN_TRAFFIC is not true' },
        pages: { status: 'ok', data: { summary: { pagesCrawled: 4, groupsFound: ['about', 'blog'], groupsNotFound: ['contact'], groupsNotChecked: [] } } },
      },
      analysis: { ai: false, headline: 'H', issues: [{ title: 'a' }, { title: 'b' }] },
    })
    setUp({ listed: [authority({ provider: 'moz', domainAuthority: 45 }), authority({ provider: 'dataforseo', domainRank: 320 })] })
    const { items } = await listScans({}, NOW)
    expect(items[0]).toMatchObject({
      performanceScore: 41,
      seoScore: 92,
      authority: { provider: 'moz', domainAuthority: 45 },
      estimatedTraffic: null,
      issueCount: 2,
      ai: false,
      pages: { crawled: 4, groupsFound: 2, groupsNotFound: 1, groupsNotChecked: 0 },
    })
    expect(items[0].collectors.traffic).toEqual({ status: 'skipped', reason: 'SITE_SCAN_TRAFFIC is not true' })
    expect(items[0].collectors.onPage).toEqual({ status: null, reason: null })
    expect(items[1].authority).toEqual({ provider: 'dataforseo', domainRank: 320 })
    expect(items[1]).not.toHaveProperty('results')
  })

  it('flags a running scan that stopped reporting, so the page stops waiting for it', async () => {
    setUp({ listed: [
      scanDoc({ status: 'running', results: null, analysis: null, updatedAt: new Date(NOW.getTime() - STALE_RUNNING_MS - 1) }),
      scanDoc({ status: 'running', results: null, analysis: null, updatedAt: new Date(NOW.getTime() - 1000) }),
    ] })
    const { items } = await listScans({}, NOW)
    expect(items.map((item) => item.stale)).toEqual([true, false])
    expect(items[0].issueCount).toBeNull()
  })
})

describe('GET /api/admin/site-scans', () => {
  it('rejects an unknown status and requires a session', async () => {
    setUp()
    expect((await listRoute(request('?status=nope'))).status).toBe(400)
    expect((await listRoute(new NextRequest('http://localhost/api/admin/site-scans'))).status).toBe(401)
    expect((await listRoute(request('?status=all&q=chai'))).status).toBe(200)
    expect(m.collections.site_scans.find.mock.calls[0][0]).toEqual({ domain: { $regex: 'chai', $options: 'i' } })
  })
})

describe('GET /api/admin/site-scans/:id', () => {
  it('rejects an invalid id with 400 and a missing scan with 404', async () => {
    setUp({ doc: null })
    expect((await detailRoute(request('/nope'), params('nope'))).status).toBe(400)
    expect((await detailRoute(request(`/${ID}`), params())).status).toBe(404)
  })

  it('returns the full scan and only the agreed fields of linked submissions', async () => {
    setUp({ submissions: [{
      _id: new ObjectId(), branch: 'redesign', brandName: 'Chai Co', contact: { name: 'Asha', email: 'a@chaico.in', phone: '999' }, answers: { secret: 'x' }, createdAt: new Date('2026-10-21T08:00:00Z'),
    }] })
    const response = await detailRoute(request(`/${ID}`), params())
    expect(response.status).toBe(200)
    const { scan } = await response.json()
    expect(scan.results.authority.source).toBe('paid authority')
    expect(m.collections.project_questionnaires.find.mock.calls[0][0]).toEqual({ 'siteScan.id': ID })
    expect(Object.keys(scan.submissions[0]).sort()).toEqual(['branch', 'company', 'email', 'id', 'name', 'submittedAt'])
    expect(scan.submissions[0]).toMatchObject({ name: 'Asha', email: 'a@chaico.in', company: 'Chai Co', branch: 'redesign', submittedAt: '2026-10-21T08:00:00.000Z' })
  })

  it('reports cached-until from when the scan was created, which is what reuse goes by', async () => {
    setUp()
    const scan = await getScanForAdmin(ID, NOW)
    expect(scan?.cachedUntil).toBe('2026-10-27T00:00:00.000Z')
  })

  it('never sends a credential quoted in a failure reason', async () => {
    vi.stubEnv('GOOGLE_PSI_API_KEY', 'super-secret-key')
    setUp({ doc: scanDoc({
      error: 'failed with super-secret-key',
      results: { url: 'https://chaico.in/', domain: 'chaico.in', performance: { status: 'error', source: 'x', fetchedAt: at, data: null, reason: 'GET https://psi?url=a&key=abc123 super-secret-key' } },
    }) })
    const text = await (await detailRoute(request(`/${ID}`), params())).text()
    vi.unstubAllEnvs()
    expect(text).not.toContain('super-secret-key')
    expect(text).not.toContain('abc123')
    expect(scrubSecrets('plain reason', {})).toBe('plain reason')
  })
})

describe('POST /api/admin/site-scans/:id/rescan', () => {
  it('forbids a sub-admin, and changes nothing', async () => {
    setUp()
    m.admin.current = SUB_ADMIN
    expect((await rescanRoute(request(`/${ID}/rescan`, 'POST'), params())).status).toBe(403)
    expect(m.collections.site_scans.findOneAndUpdate).not.toHaveBeenCalled()
    expect(m.afterTasks).toHaveLength(0)
  })

  it('answers at once, then runs only the free collectors and keeps the paid data', async () => {
    setUp({ answers: { answers: { brandName: 'Chai Co' } } })
    const response = await rescanRoute(request(`/${ID}/rescan`, 'POST'), params())
    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ status: 'running' })
    expect(m.collectOnPage).not.toHaveBeenCalled()

    expect(m.afterTasks).toHaveLength(1)
    await m.afterTasks[0]()

    expect(m.collectOnPage).toHaveBeenCalledOnce()
    expect(m.collectPages).toHaveBeenCalledOnce()
    expect(m.collectPerformance).toHaveBeenCalledOnce()
    expect(m.collectAuthority).not.toHaveBeenCalled()
    expect(m.collectTraffic).not.toHaveBeenCalled()

    const updates = m.collections.site_scans.updateOne.mock.calls.map(([, update]) => update.$set)
    // Paid data is back in place from the first write, so a crash mid-run can't lose it.
    expect(updates[0].results).toMatchObject({ authority: { source: 'paid authority' }, traffic: { source: 'paid traffic' } })
    expect(updates.at(-1)).toMatchObject({
      status: 'done',
      results: {
        onPage: { source: 'new on-page' },
        pages: { source: 'new pages' },
        performance: { source: 'new performance' },
        authority: { source: 'paid authority' },
        traffic: { source: 'paid traffic' },
      },
    })
    expect(m.analyseSite.mock.calls[0][1]).toEqual({ brandName: 'Chai Co' })
  })

  it('never reaches a paid API even when the stored scan has no paid data', async () => {
    const partial = scanDoc({ status: 'failed', results: { url: 'https://chaico.in/', domain: 'chaico.in' } })
    setUp({ doc: partial, claimed: partial })
    await rescanRoute(request(`/${ID}/rescan`, 'POST'), params())
    await m.afterTasks[0]()
    expect(m.collectAuthority).not.toHaveBeenCalled()
    expect(m.collectTraffic).not.toHaveBeenCalled()
    const last = m.collections.site_scans.updateOne.mock.calls.at(-1)![1].$set
    expect(last.results.authority).toMatchObject({ status: 'skipped', reason: expect.stringContaining('free checks') })
    expect(last.results.authority.reason).not.toContain('Daily scan limit')
  })

  it('logs the rescan with the domain', async () => {
    setUp()
    await rescanRoute(request(`/${ID}/rescan`, 'POST'), params())
    expect(activity()).toHaveLength(1)
    expect(activity()[0]).toMatchObject({ action: 'site_scan_rescanned', entityType: 'site_scan', entityId: ID, entityTitle: 'chaico.in', actorName: 'owner' })
  })

  it('refuses while a live run holds the scan, and only overrides a stale one', async () => {
    setUp({ claimed: null })
    expect((await rescanRoute(request(`/${ID}/rescan`, 'POST'), params())).status).toBe(409)
    expect(m.afterTasks).toHaveLength(0)
    expect(activity()).toHaveLength(0)
    const [filter] = m.collections.site_scans.findOneAndUpdate.mock.calls[0]
    expect(filter.$or[0]).toEqual({ status: { $ne: 'running' } })
    expect(filter.$or[1].updatedAt.$lt).toBeInstanceOf(Date)
  })

  it('rejects an invalid id and a missing scan', async () => {
    setUp({ doc: null })
    expect((await rescanRoute(request('/nope/rescan', 'POST'), params('nope'))).status).toBe(400)
    expect((await rescanRoute(request(`/${ID}/rescan`, 'POST'), params())).status).toBe(404)
  })
})

describe('DELETE /api/admin/site-scans/:id', () => {
  it('forbids a sub-admin', async () => {
    setUp()
    m.admin.current = SUB_ADMIN
    expect((await deleteRoute(request(`/${ID}`, 'DELETE'), params())).status).toBe(403)
    expect(m.collections.site_scans.deleteOne).not.toHaveBeenCalled()
  })

  it('deletes the scan only, leaves submissions alone, and logs it', async () => {
    setUp()
    const response = await deleteRoute(request(`/${ID}`, 'DELETE'), params())
    expect(response.status).toBe(204)
    expect(m.collections.site_scans.deleteOne).toHaveBeenCalledOnce()
    for (const write of ['deleteOne', 'deleteMany', 'updateOne', 'updateMany']) {
      expect(m.collections.project_questionnaires[write]).not.toHaveBeenCalled()
    }
    expect(activity()[0]).toMatchObject({ action: 'site_scan_deleted', entityType: 'site_scan', entityId: ID, entityTitle: 'chaico.in' })
  })

  it('returns 404 for a missing scan, without logging', async () => {
    setUp({ doc: null })
    expect((await deleteRoute(request(`/${ID}`, 'DELETE'), params())).status).toBe(404)
    expect(activity()).toHaveLength(0)
  })
})
