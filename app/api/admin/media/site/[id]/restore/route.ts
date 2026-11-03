import type { NextRequest } from 'next/server'
import { withAdmin, json, requireAdminRole } from '../../../../../../../src/server/admin/http'
import { restoreSiteMediaVersion } from '../../../../../../../src/server/site-media/service'

export const runtime = 'nodejs'

/** Makes this version the live one again. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAdmin(request, async (actor) => {
    requireAdminRole(actor)
    const { id } = await context.params
    return json({ asset: await restoreSiteMediaVersion(id) })
  })
}
