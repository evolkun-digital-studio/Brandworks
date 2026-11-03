import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withAdmin, json, readJsonObject, requireAdminRole } from '../../../../../../src/server/admin/http'
import { removeSiteMediaItem, updateSiteMediaAsset } from '../../../../../../src/server/site-media/service'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

/** Alt text and focal point. */
export async function PATCH(request: NextRequest, context: Context) {
  return withAdmin(request, async (actor) => {
    requireAdminRole(actor)
    const { id } = await context.params
    return json({ asset: await updateSiteMediaAsset(id, await readJsonObject(request)) })
  })
}

export async function DELETE(request: NextRequest, context: Context) {
  return withAdmin(request, async (actor) => {
    requireAdminRole(actor)
    const { id } = await context.params
    await removeSiteMediaItem(id)
    return new NextResponse(null, { status: 204 })
  })
}
