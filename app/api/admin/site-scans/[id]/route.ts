import { NextResponse, type NextRequest } from 'next/server'
import { activityFor } from '../../../../../src/server/admin/activity'
import { withAdmin, requireAdminRole, json } from '../../../../../src/server/admin/http'
import { badRequest, notFound } from '../../../../../src/server/http/errors'
import { getScanForAdmin } from '../../../../../src/server/site-scan/adminRepository'
import { deleteScan, getScan, isScanId } from '../../../../../src/server/site-scan/repository'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAdmin(request, async () => {
    const { id } = await context.params
    if (!isScanId(id)) throw badRequest('Invalid scan id.')
    const scan = await getScanForAdmin(id)
    if (!scan) throw notFound('Scan not found.')
    return json({ scan })
  })
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAdmin(request, async (actor) => {
    requireAdminRole(actor)
    const { id } = await context.params
    if (!isScanId(id)) throw badRequest('Invalid scan id.')
    const scan = await getScan(id)
    if (!scan || !(await deleteScan(id))) throw notFound('Scan not found.')
    await activityFor(actor, { action: 'site_scan_deleted', entityType: 'site_scan', entityId: id, entityTitle: scan.domain, metadata: { note: 'Cached scan deleted; submissions kept' } })
    return new NextResponse(null, { status: 204 })
  })
}
