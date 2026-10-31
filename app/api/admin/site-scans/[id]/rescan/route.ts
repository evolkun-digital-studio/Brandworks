import { after, type NextRequest } from 'next/server'
import { activityFor } from '../../../../../../src/server/admin/activity'
import { withAdmin, requireAdminRole, json } from '../../../../../../src/server/admin/http'
import { badRequest } from '../../../../../../src/server/http/errors'
import { isScanId } from '../../../../../../src/server/site-scan/repository'
import { startFreeRescan } from '../../../../../../src/server/site-scan/rescan'

/** PageSpeed Insights alone can take 45 s; the background work needs headroom. */
export const maxDuration = 120

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAdmin(request, async (actor) => {
    requireAdminRole(actor)
    const { id } = await context.params
    if (!isScanId(id)) throw badRequest('Invalid scan id.')
    const { domain, run } = await startFreeRescan(id)
    await activityFor(actor, { action: 'site_scan_rescanned', entityType: 'site_scan', entityId: id, entityTitle: domain, metadata: { note: 'Free checks re-run; paid data kept' } })
    after(run)
    return json({ status: 'running' }, 202)
  })
}
