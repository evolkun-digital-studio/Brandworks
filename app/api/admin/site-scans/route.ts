import type { NextRequest } from 'next/server'
import { withAdmin, json } from '../../../../src/server/admin/http'
import { badRequest } from '../../../../src/server/http/errors'
import { listScans } from '../../../../src/server/site-scan/adminRepository'
import type { ScanStatus } from '../../../../src/server/site-scan/types'

const STATUSES: ScanStatus[] = ['running', 'done', 'failed']

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => {
    const params = new URL(request.url).searchParams
    const status = params.get('status')
    if (status && status !== 'all' && !STATUSES.includes(status as ScanStatus)) throw badRequest('Unknown status filter.')
    return json(await listScans({
      q: params.get('q')?.slice(0, 100) ?? undefined,
      status: status && status !== 'all' ? status as ScanStatus : undefined,
      page: Number(params.get('page')) || undefined,
      pageSize: Number(params.get('pageSize')) || undefined,
    }))
  })
}
