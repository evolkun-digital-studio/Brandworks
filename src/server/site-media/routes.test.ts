// @vitest-environment node
import { ObjectId } from 'mongodb'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../admin/auth', () => ({ verifyAdminToken: vi.fn(), getActiveAdmin: vi.fn() }))
vi.mock('./service', () => ({
  checkUploadRateLimit: vi.fn(),
  uploadSiteMedia: vi.fn(async () => ({ asset: { id: 'new' }, warning: null })),
  listSiteMedia: vi.fn(async () => []),
  updateSiteMediaAsset: vi.fn(async () => ({ id: 'a' })),
  removeSiteMediaItem: vi.fn(async () => undefined),
  restoreSiteMediaVersion: vi.fn(async () => ({ id: 'a' })),
  reorderSiteMedia: vi.fn(async () => undefined),
}))

import { getActiveAdmin, verifyAdminToken } from '../admin/auth'
import { ApiError } from '../http/errors'
import * as service from './service'
import { POST as upload } from '../../../app/api/admin/media/upload/route'
import { GET as list } from '../../../app/api/admin/media/site/route'
import { DELETE as remove, PATCH as edit } from '../../../app/api/admin/media/site/[id]/route'
import { POST as restore } from '../../../app/api/admin/media/site/[id]/restore/route'
import { POST as reorder } from '../../../app/api/admin/media/site/reorder/route'

const ID = '64b000000000000000000001'
const params = { params: Promise.resolve({ id: ID }) }

function request(path: string, init: { method?: string; body?: BodyInit; headers?: Record<string, string>; session?: boolean } = {}) {
  const headers = new Headers(init.headers)
  if (init.session !== false) headers.set('cookie', 'admin_session=token')
  return new NextRequest(`http://localhost/api/admin/media${path}`, { method: init.method ?? 'GET', body: init.body, headers })
}

function signIn(role: 'admin' | 'sub_admin') {
  vi.mocked(verifyAdminToken).mockReturnValue({ sub: ID })
  vi.mocked(getActiveAdmin).mockResolvedValue({ _id: new ObjectId(ID), username: role, role, enabled: true } as never)
}

const jsonBody = (value: unknown) => ({ body: JSON.stringify(value), headers: { 'content-type': 'application/json' } })

const routes: Array<[string, () => Promise<Response>]> = [
  ['upload', () => upload(request('/upload', { method: 'POST', body: new FormData() }))],
  ['list', () => list(request('/site'))],
  ['edit', () => edit(request(`/site/${ID}`, { method: 'PATCH', ...jsonBody({ altText: 'x' }) }), params)],
  ['delete', () => remove(request(`/site/${ID}`, { method: 'DELETE' }), params)],
  ['restore', () => restore(request(`/site/${ID}/restore`, { method: 'POST' }), params)],
  ['reorder', () => reorder(request('/site/reorder', { method: 'POST', ...jsonBody({ section: 'photography', slot: 'gallery', itemIds: [] }) }))],
]

describe('Media Manager routes', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it.each(routes)('%s needs a session (401)', async (_name, call) => {
    vi.mocked(verifyAdminToken).mockReturnValue(null)
    const response = await call()
    expect(response.status).toBe(401)
  })

  it.each(routes)('%s is refused to sub-admins (403)', async (_name, call) => {
    signIn('sub_admin')
    const response = await call()
    expect(response.status).toBe(403)
    expect(service.uploadSiteMedia).not.toHaveBeenCalled()
    expect(service.removeSiteMediaItem).not.toHaveBeenCalled()
    expect(service.restoreSiteMediaVersion).not.toHaveBeenCalled()
    expect(service.reorderSiteMedia).not.toHaveBeenCalled()
  })

  it.each(routes)('%s works for admins', async (_name, call) => {
    signIn('admin')
    const response = await call()
    expect(response.status).toBeLessThan(300)
  })

  it('rejects an oversized upload before reading the body', async () => {
    signIn('admin')
    const response = await upload(request('/upload', { method: 'POST', body: 'x', headers: { 'content-length': String(50 * 1024 * 1024) } }))
    expect(response.status).toBe(413)
    expect(service.uploadSiteMedia).not.toHaveBeenCalled()
  })

  it('rate-limits uploads (429)', async () => {
    signIn('admin')
    vi.mocked(service.checkUploadRateLimit).mockImplementationOnce(() => { throw new ApiError(429, 'Too many uploads') })
    const response = await upload(request('/upload', { method: 'POST', body: new FormData() }))
    expect(response.status).toBe(429)
    expect(service.uploadSiteMedia).not.toHaveBeenCalled()
  })
})
