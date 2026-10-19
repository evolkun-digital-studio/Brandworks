import type { NextRequest } from 'next/server'
import { withAdmin, json, requireAdminRole } from '../../../../src/server/admin/http'
import { listMedia, uploadMedia } from '../../../../src/server/media/service'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => json(await listMedia(new URL(request.url).searchParams)))
}

export async function POST(request: NextRequest) {
  return withAdmin(request, async (actor) => {
    requireAdminRole(actor)
    return json({ asset: await uploadMedia(actor, await request.formData()) }, 201)
  })
}
