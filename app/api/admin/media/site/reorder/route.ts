import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withAdmin, readJsonObject, requireAdminRole } from '../../../../../../src/server/admin/http'
import { reorderSiteMedia } from '../../../../../../src/server/site-media/service'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return withAdmin(request, async (actor) => {
    requireAdminRole(actor)
    await reorderSiteMedia(await readJsonObject(request))
    return new NextResponse(null, { status: 204 })
  })
}
