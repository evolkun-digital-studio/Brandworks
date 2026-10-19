import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withAdmin, json, readJsonObject, requireAdminRole } from '../../../../../src/server/admin/http'
import { deleteMedia, restoreMedia, updateMedia } from '../../../../../src/server/media/service'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: Context) {
  return withAdmin(request, async (actor) => {
    const { id } = await context.params
    return json({ asset: await updateMedia(id, await readJsonObject(request)) })
  })
}

export async function DELETE(request: NextRequest, context: Context) {
  return withAdmin(request, async (actor) => {
    requireAdminRole(actor)
    const { id } = await context.params
    await deleteMedia(id)
    return new NextResponse(null, { status: 204 })
  })
}

export async function POST(request: NextRequest, context: Context) {
  return withAdmin(request, async (actor) => {
    requireAdminRole(actor)
    const { id } = await context.params
    return json({ asset: await restoreMedia(id) })
  })
}
