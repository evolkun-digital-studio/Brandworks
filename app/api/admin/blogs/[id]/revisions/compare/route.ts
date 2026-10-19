import type { NextRequest } from 'next/server'
import { withAdmin, json, readJsonObject } from '../../../../../../../src/server/admin/http'
import { compareBlogRevisions } from '../../../../../../../src/server/admin/blog'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAdmin(request, async (actor) => {
    const { id } = await context.params
    const body = await readJsonObject(request)
    return json({ comparison: await compareBlogRevisions(actor, id, String(body.leftId ?? ''), String(body.rightId ?? '')) })
  })
}
