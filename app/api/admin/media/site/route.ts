import type { NextRequest } from 'next/server'
import { withAdmin, json, requireAdminRole } from '../../../../../src/server/admin/http'
import { listSiteMedia } from '../../../../../src/server/site-media/service'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return withAdmin(request, async (actor) => {
    requireAdminRole(actor)
    return json({ sections: await listSiteMedia() })
  })
}
