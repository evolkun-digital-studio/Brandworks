import type { NextRequest } from 'next/server'
import { withAdmin, json, readJsonObject } from '../../../../../../src/server/admin/http'
import { updateBlogReview } from '../../../../../../src/server/admin/blog'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAdmin(request, async (actor) => {
    const { id } = await context.params
    const body = await readJsonObject(request)
    return json({ blog: await updateBlogReview(actor, id, body.reviewStatus, body.reviewNote) })
  })
}
